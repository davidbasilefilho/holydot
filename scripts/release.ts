import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const registry = "https://registry.npmjs.org";
const repository = "davidbasilefilho/holydot";
const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** Inputs required to validate a push before deriving immutable release identifiers. */
export interface ReleaseInput {
  /** Requested channel; only dev and stable are accepted. */
  mode: string;
  /** Stable source version from package.json, without a v prefix. */
  version: string;
  /** Full checked-out commit SHA, including for annotated tag pushes. */
  sha: string;
  /** Full GitHub event ref, such as refs/heads/main. */
  ref: string;
  /** GitHub event name; publishing is restricted to push. */
  event: string;
  /** Repository that received the push. */
  repository: string;
  /** Whether the push deletes a ref. */
  deleted: boolean;
  /** Whether GitHub identifies the event repository as a fork. */
  fork: boolean;
}

/**
 * Derive release identifiers without modifying files or contacting a service.
 *
 * @param input - Source version and trusted GitHub push context.
 * @returns Matching npm version, GitHub tag and channel metadata.
 * @throws When the version, commit, repository or event cannot safely publish.
 */
export function createReleasePlan(input: ReleaseInput) {
  if (input.mode !== "dev" && input.mode !== "stable") {
    throw new Error("Release mode must be dev or stable.");
  }
  if (!stableVersion.test(input.version)) {
    throw new Error("package.json version must be stable SemVer without a v prefix.");
  }
  if (!/^[a-f0-9]{40}$/.test(input.sha)) {
    throw new Error("A full lowercase Git commit SHA is required.");
  }
  if (input.event !== "push" || input.deleted || input.fork || input.repository !== repository) {
    throw new Error("Only non-deletion pushes to the canonical repository may publish.");
  }
  if (!input.ref.startsWith("refs/heads/") && !input.ref.startsWith("refs/tags/")) {
    throw new Error("Release requires a branch or tag ref.");
  }
  if (input.mode === "stable" && input.ref !== `refs/tags/v${input.version}`) {
    throw new Error("Stable tag must exactly match v plus the package.json version.");
  }
  if (input.mode === "dev" && input.ref.startsWith("refs/tags/v")) {
    throw new Error("Dev releases exclude all v-prefixed tags.");
  }
  const prerelease = input.mode === "dev";
  const version = prerelease ? `${input.version}-dev-${input.sha.slice(0, 12)}` : input.version;
  return {
    version,
    tag: `v${version}`,
    distTag: prerelease ? "dev" : "latest",
    prerelease,
    sha: input.sha,
  };
}

/**
 * Fail closed if an immutable npm version already contains different bytes.
 *
 * @param actual - Published integrity string, or null if the version does not exist.
 * @param expected - Integrity of the exact locally packed tarball.
 * @returns Whether the identical npm package was already published.
 * @throws When a version exists but does not match this release's content.
 */
export function isIdenticalPublication(actual: string | null, expected: string): boolean {
  if (actual === null) return false;
  if (!expected.startsWith("sha512-") || actual !== expected) {
    throw new Error(
      "npm version already exists with different content; never overwrite or reuse it.",
    );
  }
  return true;
}

/**
 * Verify registry visibility before promoting a GitHub draft; never retry a write.
 *
 * @param read - Read the exact version's public registry integrity, or null if absent.
 * @param expected - SHA-512 integrity of the published tarball.
 * @param pause - Delay between read-only visibility retries; defaults to two seconds.
 * @returns Nothing after the registry confirms identical bytes.
 * @throws On conflicting content, lookup errors or six unsuccessful visibility reads.
 */
export async function verifyPublication(
  read: () => Promise<string | null>,
  expected: string,
  pause: () => Promise<void> = () => Bun.sleep(2_000),
): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (isIdenticalPublication(await read(), expected)) return;
    if (attempt < 5) await pause();
  }
  throw new Error(
    "npm publication is not yet visible; the GitHub draft remains unpublished. Rerun to verify and resume.",
  );
}

/**
 * Check that an existing GitHub release belongs to this exact publication.
 *
 * @param existing - Existing release metadata returned by GitHub.
 * @param plan - Validated immutable release plan.
 * @param body - Expected release text, including source commit and tarball integrity.
 * @param allowDraft - Permit a matching draft left by an interrupted publication.
 * @returns Nothing when the existing release agrees with this publication.
 * @throws When an existing release differs, instead of changing someone else's release.
 */
export function assertMatchingRelease(
  existing: { tag_name: string; prerelease: boolean; draft: boolean; body: string | null },
  plan: ReturnType<typeof createReleasePlan>,
  body: string,
  allowDraft = false,
): void {
  if (
    existing.tag_name !== plan.tag ||
    existing.prerelease !== plan.prerelease ||
    (existing.draft && !allowDraft) ||
    existing.body !== body
  ) {
    throw new Error("Existing GitHub release differs from this publication; review it manually.");
  }
}

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

async function ensureTag(plan: ReturnType<typeof createReleasePlan>): Promise<void> {
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

type GitHubRelease = Parameters<typeof assertMatchingRelease>[0] & { id: number };

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

async function main(): Promise<void> {
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
  const plan = createReleasePlan({
    mode: process.argv[2] ?? "",
    version: manifest.version,
    sha,
    ref: process.env.GITHUB_REF ?? "",
    event: process.env.GITHUB_EVENT_NAME ?? "",
    repository: event.repository.full_name,
    deleted: event.deleted,
    fork: event.repository.fork,
  });
  const directory = await mkdtemp(join(tmpdir(), "holydot-release-"));
  try {
    await writeFile(
      "package.json",
      `${JSON.stringify({ ...manifest, version: plan.version, holydotCommit: sha }, null, 2)}\n`,
    );
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
    const alreadyPublished = isIdenticalPublication(
      await publishedIntegrity(plan.version),
      pack.integrity,
    );
    const body = `holydot ${plan.version}\n\nSource commit: ${sha}\n\nnpm: holydot@${plan.version} (dist-tag: ${plan.distTag})\n\nIntegrity: ${pack.integrity}\n`;
    let release = await findRelease(plan.tag);
    if (release) assertMatchingRelease(release, plan, body, true);
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
    if (!alreadyPublished) {
      try {
        await run([
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
        ]);
      } catch {
        throw new Error(
          "npm publish did not complete successfully. Inspect the preceding npm error and recheck the exact registry version before retrying. Possible authentication causes include a missing initial maintainer publication or trusted publisher with direct npm publish allowed. See docs/releases.md; the matching GitHub draft can resume after verification.",
        );
      }
    }
    if (!alreadyPublished)
      await verifyPublication(() => publishedIntegrity(plan.version), pack.integrity);
    // An identical rerun never rolls a dist-tag back after a newer release.
    if (release.draft) {
      await github(`releases/${release.id}`, "PATCH", {
        draft: false,
        make_latest: plan.prerelease ? "false" : "legacy",
      });
    }
    const confirmed = await findRelease(plan.tag);
    if (!confirmed) throw new Error("GitHub release was not visible after publication.");
    assertMatchingRelease(confirmed, plan, body);
    console.log(
      `${plan.tag}: npm ${alreadyPublished ? "already matched" : "published"}; GitHub release verified.`,
    );
  } finally {
    await writeFile("package.json", original);
    await rm(directory, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  await main();
}
