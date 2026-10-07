import { Effect, Schema } from "effect";
import { HolydotError } from "./errors";
import { ProductVersionSchema } from "./version";

/** Schema for immutable source and GitHub push context; malformed input fails before I/O. */
export const ReleaseInputSchema = Schema.Struct({
  mode: Schema.Literals(["dev", "stable"]),
  version: ProductVersionSchema,
  sha: Schema.String.check(Schema.isPattern(/^[a-f0-9]{40}(?![\s\S])/)),
  ref: Schema.String,
  event: Schema.Literal("push"),
  repository: Schema.Literal("davidbasilefilho/holydot"),
  deleted: Schema.Literal(false),
  fork: Schema.Literal(false),
});
/** Untrusted release context accepted from CI before schema validation. */
export interface ReleaseInput {
  /** Intended publication channel. */
  readonly mode: string;
  /** Source product version. */
  readonly version: string;
  /** Full lowercase source commit. */
  readonly sha: string;
  /** Full event ref. */
  readonly ref: string;
  /** Trigger event, restricted to push. */
  readonly event: string;
  /** Canonical repository identity. */
  readonly repository: string;
  /** Deleted refs cannot publish. */
  readonly deleted: boolean;
  /** Fork events cannot publish. */
  readonly fork: boolean;
}
/** Validated immutable identities shared by npm and GitHub. */
export interface ReleasePlan {
  /** Exact immutable npm version. */
  readonly version: string;
  /** Exact corresponding GitHub tag. */
  readonly tag: string;
  /** Explicit npm channel. */
  readonly distTag: "dev" | "latest";
  /** Product stable maintenance -Z uses latest despite its SemVer prerelease syntax. */
  readonly prerelease: boolean;
  /** Source commit for this artifact. */
  readonly sha: string;
}
/** Existing release properties that must agree before resuming publication. */
export interface ExistingRelease {
  /** Exact GitHub tag. */
  readonly tag_name: string;
  /** GitHub channel classification. */
  readonly prerelease: boolean;
  /** Whether publication was interrupted at the draft stage. */
  readonly draft: boolean;
  /** Immutable source/integrity evidence. */
  readonly body: string | null;
}

/**
 * Derive channels, rejecting checkpoint branches and recursive dev tags before any writes.
 *
 * @param input - Untrusted source/event metadata.
 * @returns Matching immutable artifact identities or typed validation error.
 */
export function createReleasePlan(input: ReleaseInput): Effect.Effect<ReleasePlan, HolydotError> {
  return Effect.gen(function* () {
    const parsed = yield* Schema.decodeUnknownEffect(ReleaseInputSchema, {
      onExcessProperty: "error",
    })(input).pipe(
      Effect.mapError(
        (cause) =>
          new HolydotError({
            message: "Invalid authorized release context or product version.",
            cause,
          }),
      ),
    );
    if (parsed.mode === "stable" && parsed.ref !== `refs/tags/v${parsed.version}`)
      return yield* Effect.fail(
        new HolydotError({ message: "Stable tag must exactly match the source product version." }),
      );
    if (
      parsed.mode === "dev" &&
      parsed.ref !== "refs/heads/main" &&
      !/^refs\/heads\/release\/[A-Za-z0-9._/-]+$/.test(parsed.ref)
    )
      return yield* Effect.fail(
        new HolydotError({
          message:
            "Dev publication is restricted to main and release branches; checkpoint branches never publish.",
        }),
      );
    const prerelease = parsed.mode === "dev";
    const version = prerelease
      ? `${parsed.version}-dev-${parsed.sha.slice(0, 12)}`
      : parsed.version;
    return {
      version,
      tag: `v${version}`,
      distTag: prerelease ? "dev" : "latest",
      prerelease,
      sha: parsed.sha,
    };
  });
}

/**
 * Reject conflicting content; identical publication is skipped without rolling dist-tags back.
 *
 * @param actual - Existing registry integrity, or null when absent.
 * @param expected - Exact local pack integrity.
 * @returns Whether identical content was already published.
 */
export function isIdenticalPublication(
  actual: string | null,
  expected: string,
): Effect.Effect<boolean, HolydotError> {
  if (actual === null) return Effect.succeed(false);
  return expected.startsWith("sha512-") && actual === expected
    ? Effect.succeed(true)
    : Effect.fail(
        new HolydotError({
          message:
            "npm version already exists with different content; never overwrite or reuse it.",
        }),
      );
}

/**
 * Retry only registry reads; never repeat npm writes during visibility delays.
 *
 * @param read - Effect adapter reading exact version integrity.
 * @param expected - Immutable local pack integrity.
 * @param pause - Effect delay between absent registry reads.
 * @returns Completion after identical bytes become visible, or a typed failure.
 */
export function verifyPublication(
  read: Effect.Effect<string | null, HolydotError>,
  expected: string,
  pause: Effect.Effect<void> = Effect.sleep("2 seconds"),
): Effect.Effect<void, HolydotError> {
  return Effect.gen(function* () {
    for (let attempt = 0; attempt < 6; attempt++) {
      if (yield* isIdenticalPublication(yield* read, expected)) return;
      if (attempt < 5) yield* pause;
    }
    return yield* Effect.fail(
      new HolydotError({
        message:
          "npm publication is not yet visible; the GitHub draft remains unpublished. Verify exact version before resuming.",
      }),
    );
  });
}

/**
 * Require an existing release to match immutable source/integrity and channel.
 *
 * @param existing - Existing GitHub release properties.
 * @param plan - Validated publication identity.
 * @param body - Expected evidence text.
 * @param allowDraft - Permit resuming only a matching interrupted draft.
 * @returns Completion when matching, otherwise a typed conflict error.
 */
export function assertMatchingRelease(
  existing: ExistingRelease,
  plan: ReleasePlan,
  body: string,
  allowDraft = false,
): Effect.Effect<void, HolydotError> {
  return existing.tag_name === plan.tag &&
    existing.prerelease === plan.prerelease &&
    (!existing.draft || allowDraft) &&
    existing.body === body
    ? Effect.void
    : Effect.fail(
        new HolydotError({
          message: "Existing GitHub release differs from this publication; review it manually.",
        }),
      );
}

if (import.meta.main) {
  await Effect.runPromise(
    Effect.gen(function* () {
      const adapter = yield* Effect.tryPromise({
        try: () => import("./adapters/publication"),
        catch: (cause) => new HolydotError({ message: "Cannot load publication adapters.", cause }),
      });
      yield* Effect.tryPromise({
        try: adapter.executePublication,
        catch: (cause) =>
          new HolydotError({
            message: cause instanceof Error ? cause.message : "Publication failed.",
            cause,
          }),
      });
    }).pipe(
      Effect.match({
        onFailure: (error) => {
          console.error(error.message);
          process.exitCode = 1;
        },
        onSuccess: () => undefined,
      }),
    ),
  );
}
