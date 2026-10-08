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

/** Selected npm channel target observed before mutable publication. */
export interface ChannelRelease {
  /** Immutable version currently assigned to this channel. */
  readonly version: string;
  /** Full stamped source SHA, required to order dev builds of the same product base. */
  readonly commit: string | null;
}
/** GitHub comparison of candidate head against the current channel's base commit. */
export type CommitRelation = "ahead" | "behind" | "identical" | "diverged";
/** Read-only ancestry boundary; hashes themselves do not express chronology. */
export type CompareCommits = (
  base: string,
  head: string,
) => Effect.Effect<CommitRelation, HolydotError>;

/**
 * Prevent channel rollback by product X/Y/Z rank, then ancestry for same-base dev builds.
 *
 * @param plan - Validated immutable candidate and explicitly selected channel.
 * @param current - Observed target of that channel, or verified absence.
 * @param compare - Read-only commit comparison for equal-base dev builds.
 * @returns True for an absent/equal/older target, false for a newer target; ambiguous state fails.
 */
export function canAdvanceChannel(
  plan: ReleasePlan,
  current: ChannelRelease | null,
  compare: CompareCommits,
): Effect.Effect<boolean, HolydotError> {
  return Effect.gen(function* () {
    if (current === null) return true;
    const pattern =
      /^(0\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*))?)(?:-dev-([a-f0-9]{12}))?$/;
    const candidate = pattern.exec(plan.version);
    const target = pattern.exec(current.version);
    if (
      !candidate ||
      !target ||
      Boolean(candidate[2]) !== (plan.distTag === "dev") ||
      Boolean(target[2]) !== (plan.distTag === "dev")
    )
      return yield* Effect.fail(
        new HolydotError({
          message: "Channel target has an unexpected version/channel; refusing publication.",
        }),
      );
    const rank = (base: string) => {
      const [numbers, maintenance] = base.split("-");
      return [...numbers!.split(".").slice(1).map(BigInt), BigInt(maintenance ?? "0")];
    };
    const incoming = rank(candidate[1]!);
    const existing = rank(target[1]!);
    for (let index = 0; index < incoming.length; index++) {
      if (incoming[index]! > existing[index]!) return true;
      if (incoming[index]! < existing[index]!) return false;
    }
    if (plan.version === current.version) return true;
    if (candidate[1] !== target[1] || plan.distTag !== "dev")
      return yield* Effect.fail(
        new HolydotError({
          message: "Equal product ranks have different versions; channel order is ambiguous.",
        }),
      );
    if (
      !current.commit ||
      !/^[a-f0-9]{40}$/.test(current.commit) ||
      !current.commit.startsWith(target[2]!) ||
      !plan.sha.startsWith(candidate[2]!)
    )
      return yield* Effect.fail(
        new HolydotError({
          message: "Cannot verify same-base dev source identity; refusing channel movement.",
        }),
      );
    const relation = yield* compare(current.commit, plan.sha);
    if (relation === "ahead") return true;
    if (relation === "behind") return false;
    return yield* Effect.fail(
      new HolydotError({
        message: "Dev commits are divergent or inconsistent; channel order is ambiguous.",
      }),
    );
  });
}

/** Injected publication boundaries; tests supply only offline state and recorded writes. */
export interface ChannelPublicationIO {
  /** Exact candidate integrity read, independent of any mutable dist-tag. */
  readonly readIntegrity: Effect.Effect<string | null, HolydotError>;
  /** Only the selected channel is read; dev and latest never inherit each other's ordering. */
  readonly readChannel: Effect.Effect<ChannelRelease | null, HolydotError>;
  /** Read-only ancestry lookup when product ranks alone cannot order dev builds. */
  readonly compareCommits: CompareCommits;
  /** One immutable npm publish, executed only after both identity and channel checks. */
  readonly publish: Effect.Effect<void, HolydotError>;
}
/** Explicit result; a skipped historical artifact was not published by this operation. */
export type ChannelPublicationResult = "published" | "already-identical" | "stale-skipped";

/**
 * Recheck the selected channel immediately before a single write; stale missing artifacts stay
 * absent.
 *
 * @param plan - Validated candidate identity and channel.
 * @param integrity - Local packed SHA512 integrity.
 * @param io - Native publication boundaries or offline test doubles.
 * @param pause - Read-only visibility retry delay.
 * @returns Published, already identical or stale skipped; errors never cause another publish.
 */
export function publishChannelArtifact(
  plan: ReleasePlan,
  integrity: string,
  io: ChannelPublicationIO,
  pause: Effect.Effect<void> = Effect.sleep("2 seconds"),
): Effect.Effect<ChannelPublicationResult, HolydotError> {
  return Effect.gen(function* () {
    const identical = yield* isIdenticalPublication(yield* io.readIntegrity, integrity);
    if (!(yield* canAdvanceChannel(plan, yield* io.readChannel, io.compareCommits)))
      return "stale-skipped";
    if (identical) return "already-identical";
    yield* io.publish;
    yield* verifyPublication(io.readIntegrity, integrity, pause);
    return "published";
  });
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
