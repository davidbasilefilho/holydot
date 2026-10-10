import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const scenario = JSON.parse(process.argv[2]!) as {
  mode: "dev" | "stable";
  base: string;
  sha: string;
  channels: Record<string, { version: string; commit: string | null }>;
  existingIntegrity?: string;
  existingDraft?: boolean;
  relation?: string;
  advanced?: { version: string; commit: string | null };
};
const modulePath =
  process.argv[3] ?? new URL("../../scripts/adapters/publication.ts", import.meta.url).pathname;
const directory = mkdtempSync(join(tmpdir(), "holydot-publish-offline-"));
const selected = scenario.mode === "dev" ? "dev" : "latest";
const version =
  scenario.mode === "dev" ? `${scenario.base}-dev-${scenario.sha.slice(0, 12)}` : scenario.base;
const integrity = "sha512-offline-pack";
const channels = { ...scenario.channels };
const versions: Record<
  string,
  { name: string; version: string; holydotCommit: string | null; dist: { integrity: string } }
> = {};
for (const channel of Object.values(channels))
  versions[channel.version] = {
    name: "holydot",
    version: channel.version,
    holydotCommit: channel.commit,
    dist: { integrity: "sha512-current" },
  };
if (scenario.existingIntegrity)
  versions[version] = {
    name: "holydot",
    version,
    holydotCommit: scenario.sha,
    dist: { integrity: scenario.existingIntegrity },
  };
const actions: string[] = [];
const tags: Record<string, { object: { type: string; sha: string } }> = {};
let release: Record<string, unknown> | null = null;
if (scenario.existingDraft) {
  const tag = `v${version}`;
  tags[tag] = { object: { type: "commit", sha: scenario.sha } };
  release = {
    id: 1,
    tag_name: tag,
    target_commitish: scenario.sha,
    name: tag,
    body: `holydot ${version}\n\nSource commit: ${scenario.sha}\n\nnpm: holydot@${version} (dist-tag: ${selected})\n\nIntegrity: ${integrity}\n`,
    prerelease: scenario.mode === "dev",
    draft: true,
  };
}
let channelReads = 0;
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
// Every remote read/write is intercepted in this disposable child: no real network or npm process.
Object.defineProperty(globalThis, "fetch", {
  value: async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    actions.push(`${method} ${url.pathname}`);
    const requestBody = () => {
      if (typeof init?.body !== "string") throw new Error("Expected offline JSON request body");
      return JSON.parse(init.body);
    };
    if (url.hostname === "registry.npmjs.org") {
      if (method !== "GET") throw new Error("Unexpected registry write");
      if (url.pathname === "/holydot") {
        channelReads++;
        if (channelReads === 2 && scenario.advanced) {
          channels[selected] = scenario.advanced;
          versions[scenario.advanced.version] = {
            name: "holydot",
            version: scenario.advanced.version,
            holydotCommit: scenario.advanced.commit,
            dist: { integrity: "sha512-current" },
          };
        }
        return json({
          name: "holydot",
          "dist-tags": Object.fromEntries(
            Object.entries(channels).map(([key, value]) => [key, value.version]),
          ),
          versions,
        });
      }
      const target = decodeURIComponent(url.pathname.slice("/holydot/".length));
      return versions[target] ? json(versions[target]) : json({}, 404);
    }
    if (url.hostname !== "api.github.com") throw new Error("Unexpected network boundary");
    const path = url.pathname.slice("/repos/davidbasilefilho/holydot/".length);
    if (path.startsWith("compare/")) {
      const [base] = path.slice(8).split("...");
      return json({ status: scenario.relation ?? "ahead", base_commit: { sha: base } });
    }
    if (path.startsWith("git/ref/tags/"))
      return tags[decodeURIComponent(path.slice(13))]
        ? json(tags[decodeURIComponent(path.slice(13))])
        : json({}, 404);
    if (path === "git/refs" && method === "POST") {
      const body = requestBody();
      tags[body.ref.slice(10)] = { object: { type: "commit", sha: body.sha } };
      return json({});
    }
    if (path.startsWith("releases/tags/"))
      return release && release.draft === false ? json(release) : json({}, 404);
    if (path === "releases" && method === "GET") return json(release ? [release] : []);
    if (path === "releases" && method === "POST") {
      release = { id: 1, ...requestBody() };
      return json(release);
    }
    if (path === "releases/1" && method === "PATCH") {
      release = { ...release, ...requestBody() };
      return json(release);
    }
    throw new Error(`Unexpected offline GitHub operation ${method} ${path}`);
  },
});
Object.defineProperty(Bun, "spawn", {
  value: (command: string[]) => {
    actions.push(command.slice(0, 2).join(" "));
    let output = "";
    if (command[0] === "git" && command[1] === "rev-parse") output = scenario.sha;
    else if (command[0] === "git" && command[1] === "status") output = "";
    else if (command[0] === "bun" && command[1] === "run") output = "";
    else if (command[0] === "npm" && command[1] === "pack")
      output = JSON.stringify([{ filename: `holydot-${version}.tgz`, integrity }]);
    else if (command[0] === "npm" && command[1] === "publish") {
      if (command[command.indexOf("--tag") + 1] !== selected)
        throw new Error("Wrong publication channel");
      versions[version] = {
        name: "holydot",
        version,
        holydotCommit: scenario.sha,
        dist: { integrity },
      };
      channels[selected] = { version, commit: scenario.sha };
    } else throw new Error("Unexpected child process");
    return { stdout: new Response(output).body, exited: Promise.resolve(0) };
  },
});
const original = JSON.stringify({ name: "holydot", version: scenario.base });
writeFileSync(join(directory, "package.json"), original);
writeFileSync(
  join(directory, "event.json"),
  JSON.stringify({
    deleted: false,
    repository: { fork: false, full_name: "davidbasilefilho/holydot" },
  }),
);
process.chdir(directory);
Object.assign(process.env, {
  GITHUB_ACTIONS: "true",
  GITHUB_EVENT_PATH: join(directory, "event.json"),
  GH_TOKEN: "offline-dummy-not-a-credential",
  GITHUB_SHA: scenario.sha,
  GITHUB_REF:
    scenario.mode === "dev" ? "refs/heads/release/offline" : `refs/tags/v${scenario.base}`,
  GITHUB_EVENT_NAME: "push",
  ACTIONS_ID_TOKEN_REQUEST_URL: "https://offline.invalid/oidc",
  ACTIONS_ID_TOKEN_REQUEST_TOKEN: "offline-dummy-not-a-credential",
});
process.argv[2] = scenario.mode;
if (scenario.mode === "stable")
  tags[`v${version}`] = { object: { type: "commit", sha: scenario.sha } };
const messages: string[] = [];
console.log = (...values: unknown[]) => messages.push(values.join(" "));
let error: string | null = null;
try {
  const adapter = await import(modulePath);
  await adapter.executePublication();
} catch (cause) {
  error = cause instanceof Error ? cause.message : String(cause);
}
const restored = readFileSync(join(directory, "package.json"), "utf8") === original;
process.stdout.write(
  JSON.stringify({
    error,
    actions,
    messages,
    channels,
    versionPublished: Boolean(versions[version]),
    restored,
    draft: (release as Record<string, unknown> | null)?.draft ?? null,
  }) + "\n",
);
process.chdir(tmpdir());
rmSync(directory, { recursive: true, force: true });
