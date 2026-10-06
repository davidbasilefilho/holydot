# Releases

holydot is a text instruction package. Releases do not deploy an assistant, connect accounts, or run a service.

## Versions and triggers

The stable source version lives in `package.json`, initially `0.0.1`. Update it before tagging a new stable version. npm versions never include a leading `v`.

- `validation.yml`: every push and pull request runs frozen Bun installation and `bun run check`, including formatting, declarative type-aware lint/typecheck, Bun tests and offline validation. Release workflows reuse this read-only job.
- `dev.yml`: any branch push or non-`v*` tag push creates npm `0.0.1-dev-<12-character-commit-SHA>` with dist-tag `dev`, and GitHub prerelease `v0.0.1-dev-<12-character-commit-SHA>`.
- `stable.yml`: a `v*` tag push must be exactly `v` plus the stable `package.json` version. It publishes that npm version with dist-tag `latest` and the matching stable GitHub release. Prerelease/build tags are excluded.

Only non-deletion pushes to `davidbasilefilho/holydot` publish. Forks and pull requests only validate. Creating a development tag does not recursively trigger stable publication: the tag is excluded explicitly, and GitHub's `GITHUB_TOKEN` does not trigger another push workflow.

Every workflow uses the [mise GitHub Action](https://mise.jdx.dev/continuous-integration.html). Bun 1.4, Node and npm versions are declared in `mise.toml`. Action dependencies are pinned to verified commit SHAs. Validation has read-only permissions; only the publication job receives `contents: write` and `id-token: write`.

## One-time npm setup

Automatic publication needs a maintainer-owned npm package and [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/). The repository contains no npm token or fallback credential.

1. Verify that the npm account can publish the unscoped name `holydot`. A registry 404 does not reserve the name or guarantee availability. If the package does not exist, a maintainer must complete its initial authenticated publication. Use a separate bootstrap-only prerelease, such as `0.0.0-bootstrap.0` with dist-tag `bootstrap`, rather than consuming a planned stable version.
2. In the package's npm settings, add GitHub Actions trusted publishers for owner `davidbasilefilho`, repository `holydot`, and workflow filenames `dev.yml` and `stable.yml`. Enable direct `npm publish` for each. No GitHub environment name is used by these workflows.
3. Complete the first successful publication within npm's two-day validation window for a new publisher connection. Rerun the corresponding failed GitHub workflow after setup.

The maintainer must approve and perform required account/security configuration. Repository code does not create credentials, establish trusted publishers, or accept account terms. The pinned npm CLI supports OIDC; separate dist-tag management permission is unnecessary because tags are set by `npm publish` itself.

## Recovery and integrity

Publication validates a clean checkout of the event commit, packs the allowlisted public files, and records the full source SHA plus SHA-512 tarball integrity. It reserves the matching GitHub tag and draft, publishes npm, verifies registry integrity with bounded read-only visibility retries, and finally publishes the GitHub release.

An npm authentication failure can leave a tag and draft. An interruption after npm publication can leave a published npm version and an unpublished GitHub draft. Rerun the same workflow after fixing the blocker: identical npm content is skipped, matching drafts resume, and existing completed releases are verified. npm versions are immutable. Conflicting content, tag targets or release metadata fail closed and need maintainer review; nothing is overwritten. An already-published identical rerun does not move npm dist-tags backward. Publishing an older snapshot for the first time can move its channel tag to that snapshot; choose such reruns deliberately.

Publish jobs are serialized per channel and running publications are never canceled by concurrency. GitHub may replace an older pending run with a newer pending run; rerun a skipped commit's workflow if that specific snapshot is needed.

GitHub can reject tag/release creation for a branch whose workflow files differ from the default branch because it requires workflow-write permission unavailable to `GITHUB_TOKEN`. The script reports this as a permission blocker rather than releasing another commit. Merge the intended workflow changes through the authorized process before retrying; do not add a broad personal token as a workaround. See [GitHub release permissions](https://docs.github.com/en/rest/releases/releases#create-a-release) and [workflow trigger behavior](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).

Local tests cover version/ref guards, immutable-content conflicts, draft recovery policy and parsed workflow structure. They do not prove that live npm/GitHub authorization is configured. A successful live publication is the final integration check.
