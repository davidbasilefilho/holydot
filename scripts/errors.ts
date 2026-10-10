import { Data } from "effect";

/** A recoverable failure at a configuration, CLI or external-library boundary. */
export class HolydotError extends Data.TaggedError("HolydotError")<{
  /** Actionable description without configuration contents or credentials. */
  readonly message: string;
  /** Original error retained locally for diagnostics. */
  readonly cause?: unknown;
}> {}
