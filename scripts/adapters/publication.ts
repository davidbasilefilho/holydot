import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import {
  createReleasePlan,
  isIdenticalPublication,
  assertMatchingRelease,
  canAdvanceChannel,
  publishChannelArtifact,
  type ChannelRelease,
  type CommitRelation,
  type ExistingRelease,
  type ReleasePlan,
} from "../release";
import { HolydotError } from "../errors";
const registry = "https://registry.npmjs.org";
const repository = "davidbasilefilho/holydot";
async function run(command: string[]): Promise<string> {
  const child = Bun.spawn(command, { stdout: "pipe", stderr: "inherit" });
  const output = await new Response(child.stdout).text();
  if ((await child.exited) !== 0) throw new Error(`${command[0]} ${command[1]} failed.`);
  return output.trim();
}

async function github<T>(path: string, method = "GET", body?: object): Promise<T | null> {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error("GitHub Actions token is missing.");
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404 && method === "GET") return null;
  if (!response.ok) {
    throw new Error(
      `GitHub ${method} ${path} failed (${response.status}). Check repository permissions; workflow-changing branches may require maintainer action.`,
    );
  }
  return (await response.json()) as T;
}

async function ensureTag(plan: ReleasePlan): Promise<void> {
  type GitObject = { object: { type: string; sha: string } };
  let ref = await github<GitObject>(`git/ref/tags/${encodeURIComponent(plan.tag)}`);
  if (!ref) {
    if (!plan.prerelease) throw new Error("Stable release tag no longer exists on GitHub.");
    await github("git/refs", "POST", { ref: `refs/tags/${plan.tag}`, sha: plan.sha });
    ref = await github<GitObject>(`git/ref/tags/${encodeURIComponent(plan.tag)}`);
  }
  for (let depth = 0; ref?.object.type === "tag" && depth < 10; depth += 1) {
    ref = await github<GitObject>(`git/tags/${ref.object.sha}`);
  }
  if (ref?.object.type !== "commit" || ref.object.sha !== plan.sha) {
    throw new Error("Release tag resolves to a different commit; refusing to publish.");
  }
}

type GitHubRelease = ExistingRelease & { id: number };

async function findRelease(tag: string): Promise<GitHubRelease | null> {
  const published = await github<GitHubRelease>(`releases/tags/${encodeURIComponent(tag)}`);
  if (published) return published;
  // GitHub's by-tag endpoint omits unpublished drafts. Recover our matching draft.
  for (let page = 1; ; page += 1) {
    const releases = await github<GitHubRelease[]>(`releases?per_page=100&page=${page}`);
    if (!releases) throw new Error("Cannot enumerate existing GitHub releases.");
    const existing = releases.find((release) => release.tag_name === tag);
    if (existing) return existing;
    if (releases.length < 100) return null;
  }
}

async function publishedIntegrity(version: string): Promise<string | null> {
  const response = await fetch(`${registry}/holydot/${encodeURIComponent(version)}`, {
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(
      `npm registry lookup failed (${response.status}); publication state could not be verified. Recheck the exact version before retrying.`,
    );
  const manifest = (await response.json()) as { dist?: { integrity?: string } };
  if (!manifest.dist?.integrity)
    throw new Error("Existing npm version has no verifiable integrity.");
  return manifest.dist.integrity;
}

async function publishedChannel(tag: "dev" | "latest"): Promise<ChannelRelease | null> {
  const response = await fetch(`${registry}/holydot`, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error(`npm channel lookup failed (${response.status}); refusing publication.`);
  const packument = (await response.json()) as {
    name?: unknown;
    "dist-tags"?: Record<string, unknown>;
    versions?: Record<string, { version?: unknown; holydotCommit?: unknown }>;
  };
  if (packument.name !== "holydot" || !packument["dist-tags"] || !packument.versions)
    throw new Error("Malformed npm channel metadata; refusing publication.");
  const version = packument["dist-tags"][tag];
  if (version === undefined) return null;
  if (typeof version !== "string" || packument.versions[version]?.version !== version)
    throw new Error("Channel target version is missing or inconsistent; refusing publication.");
  const commit = packument.versions[version]!.holydotCommit;
  return { version, commit: typeof commit === "string" ? commit : null };
}

function compareCommits(base: string, head: string): Effect.Effect<CommitRelation, HolydotError> {
  return Effect.tryPromise({
    try: async () => {
      const result = await github<{ status?: string; base_commit?: { sha?: string } }>(
        `compare/${base}...${head}?per_page=1`,
      );
      if (
        !result ||
        result.base_commit?.sha !== base ||
        !["ahead", "behind", "identical", "diverged"].includes(result.status ?? "")
      )
        throw new Error("Cannot verify channel ancestry; refusing publication.");
      return result.status as CommitRelation;
    },
    catch: (cause) => new HolydotError({ message: "Channel ancestry verification failed.", cause }),
  });
}

/**
 * Execute authorized publication through native GitHub/npm adapters.
 *
 * @returns Completion only after immutable npm and GitHub identity checks.
 * @throws For unsafe event state, authentication, conflicting bytes or external errors.
 */
export async function executePublication(): Promise<void> {
  if (process.env.GITHUB_ACTIONS !== "true" || !process.env.GITHUB_EVENT_PATH) {
    throw new Error("Publishing runs only in the authorized GitHub push workflows.");
  }
  if (!process.env.ACTIONS_ID_TOKEN_REQUEST_URL || !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) {
    throw new Error(
      "npm trusted publishing requires id-token: write and an approved npm trusted publisher.",
    );
  }
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8")) as {
    deleted: boolean;
    repository: { fork: boolean; full_name: string };
  };
  const original = await readFile("package.json", "utf8");
  const manifest = JSON.parse(original) as { name: string; version: string; private?: boolean };
  if (manifest.name !== "holydot" || manifest.private === true) {
    throw new Error("Only the public holydot package may be released.");
  }
  const sha = await run(["git", "rev-parse", "HEAD"]);
  // Reject dirty checkouts and attempts to release a different commit than the push.
  if (sha !== process.env.GITHUB_SHA || (await run(["git", "status", "--porcelain"])) !== "") {
    throw new Error("Release requires the clean, exact GitHub event checkout.");
  }
  const plan = await Effect.runPromise(
    createReleasePlan({
      mode: process.argv[2] ?? "",
      version: manifest.version,
      sha,
      ref: process.env.GITHUB_REF ?? "",
      event: process.env.GITHUB_EVENT_NAME ?? "",
      repository: event.repository.full_name,
      deleted: event.deleted,
      fork: event.repository.fork,
    }),
  );
  const directory = await mkdtemp(join(tmpdir(), "holydot-release-"));
  try {
    await writeFile(
      "package.json",
      `${JSON.stringify({ ...manifest, version: plan.version, holydotCommit: sha }, null, 2)}\n`,
    );
    await run(["bun", "run", "build"]);
    const packs = JSON.parse(
      await run(["npm", "pack", "--json", "--ignore-scripts", "--pack-destination", directory]),
    ) as { filename: string; integrity: string }[];
    const pack = packs[0];
    if (
      packs.length !== 1 ||
      !pack ||
      pack.filename !== `holydot-${plan.version}.tgz` ||
      !pack.integrity.startsWith("sha512-")
    ) {
      throw new Error("npm pack returned unexpected package metadata.");
    }
    const identical = await Effect.runPromise(
      isIdenticalPublication(await publishedIntegrity(plan.version), pack.integrity),
    );
    const body = `holydot ${plan.version}\n\nSource commit: ${sha}\n\nnpm: holydot@${plan.version} (dist-tag: ${plan.distTag})\n\nIntegrity: ${pack.integrity}\n`;
    let release = identical ? await findRelease(plan.tag) : null;
    if (release) await Effect.runPromise(assertMatchingRelease(release, plan, body, true));
    if (
      !(identical && release) &&
      !(await Effect.runPromise(
        canAdvanceChannel(plan, await publishedChannel(plan.distTag), compareCommits),
      ))
    ) {
      console.log(
        `${plan.tag}: stale candidate skipped; ${plan.distTag} already targets a newer release. No external writes performed.`,
      );
      return;
    }
    release ??= await findRelease(plan.tag);
    if (release) await Effect.runPromise(assertMatchingRelease(release, plan, body, true));
    await ensureTag(plan);
    // Reserve a recoverable draft before npm, detecting GitHub permission blocks first.
    if (!release) {
      release = await github<GitHubRelease>("releases", "POST", {
        tag_name: plan.tag,
        target_commitish: sha,
        name: plan.tag,
        body,
        prerelease: plan.prerelease,
        draft: true,
      });
    }
    if (!release || !Number.isSafeInteger(release.id) || release.id <= 0) {
      throw new Error("GitHub did not return a valid release identity.");
    }
    const outcome = await Effect.runPromise(
      publishChannelArtifact(plan, pack.integrity, {
        readIntegrity: Effect.tryPromise({
          try: () => publishedIntegrity(plan.version),
          catch: (cause) => new HolydotError({ message: "Registry verification failed.", cause }),
        }),
        readChannel: Effect.tryPromise({
          try: () => publishedChannel(plan.distTag),
          catch: (cause) => new HolydotError({ message: "Channel verification failed.", cause }),
        }),
        compareCommits,
        publish: Effect.tryPromise({
          try: () =>
            run([
              "npm",
              "publish",
              join(directory, pack.filename),
              "--access",
              "public",
              "--tag",
              plan.distTag,
              "--provenance",
              "--ignore-scripts",
              "--registry",
              registry,
            ]).then(() => undefined),
          catch: (cause) =>
            new HolydotError({
              message:
                "npm publish did not complete successfully. Recheck exact registry identity before retrying. Verify initial bootstrap/trusted publisher permissions through supported owner controls; do not repeat bootstrap automatically. The matching draft can resume after verification.",
              cause,
            }),
        }),
      }),
    );
    if (outcome === "stale-skipped") {
      console.log(
        `${plan.tag}: channel advanced while preparing publication; stale candidate skipped and matching draft preserved.`,
      );
      return;
    }
    // An identical rerun never rolls a dist-tag back after a newer release.
    if (release.draft) {
      await github(`releases/${release.id}`, "PATCH", {
        draft: false,
        make_latest: plan.prerelease ? "false" : "legacy",
      });
    }
    const confirmed = await findRelease(plan.tag);
    if (!confirmed) throw new Error("GitHub release was not visible after publication.");
    await Effect.runPromise(assertMatchingRelease(confirmed, plan, body));
    console.log(
      `${plan.tag}: npm ${outcome === "already-identical" ? "already matched" : "published"}; GitHub release verified.`,
    );
  } finally {
    await writeFile("package.json", original);
    await rm(directory, { recursive: true, force: true });
  }
}
