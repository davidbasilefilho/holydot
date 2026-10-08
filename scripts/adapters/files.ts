import {
  constants,
  closeSync,
  fsyncSync,
  linkSync,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { randomUUID } from "node:crypto";
import { Effect } from "effect";
import { HolydotError } from "../errors";

/** Original readable bytes used to detect edits and retain a recoverable backup. */
export interface StoredFile {
  /** Exact UTF-8 text, not a decoded/reformatted configuration. */
  readonly content: string;
}

/**
 * Check a native error code only at the filesystem adapter boundary.
 *
 * @param cause - Native filesystem error.
 * @param code - Code to compare.
 * @returns Whether the code matches.
 */
function hasCode(cause: unknown, code: string): boolean {
  return typeof cause === "object" && cause !== null && "code" in cause && cause.code === code;
}

/**
 * Read a regular, bounded config without following symlinks.
 *
 * @param path - Absolute configuration filename.
 * @returns Original content, or null only if absent; unsafe files fail with typed errors.
 */
export function readConfigFile(path: string): Effect.Effect<StoredFile | null, HolydotError> {
  return Effect.try({
    try: () => {
      let stats;
      try {
        stats = lstatSync(path);
      } catch (cause) {
        if (hasCode(cause, "ENOENT")) return null;
        throw cause;
      }
      if (!stats.isFile() || stats.size > 65_536)
        throw new Error("Configuration must be a regular file of at most 64 KiB.");
      const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      try {
        const bytes = readFileSync(fd);
        if (bytes.length > 65_536) throw new Error("Configuration is too large.");
        const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        return { content };
      } finally {
        closeSync(fd);
      }
    },
    catch: (cause) =>
      new HolydotError({
        message:
          "Cannot read configuration safely; check its path, permissions, UTF-8 and file type.",
        cause,
      }),
  });
}

/**
 * Parse native JSON at the adapter boundary; domain schemas handle validation.
 *
 * @param text - Exact file contents.
 * @returns Unknown parsed data or a typed parse error.
 */
export function parseJson(text: string): Effect.Effect<unknown, HolydotError> {
  return Effect.try({
    try: () => JSON.parse(text) as unknown,
    catch: (cause) =>
      new HolydotError({ message: "Configuration is not valid JSON; original preserved.", cause }),
  });
}

/**
 * Persist after Save under an exclusive cooperating-writer lock, retaining original bytes. External
 * editors do not honor this lock; comparison plus rename is not filesystem CAS.
 *
 * @param path - Absolute target path.
 * @param original - Previously read bytes, or null for initial setup.
 * @param content - New complete UTF-8 document.
 * @returns Backup filename for edits, or null for a new/unchanged file.
 */
export function saveConfigFile(
  path: string,
  original: StoredFile | null,
  content: string,
): Effect.Effect<string | null, HolydotError> {
  return Effect.scoped(
    Effect.gen(function* () {
      const lockPath = `${path}.lock`;
      yield* Effect.acquireRelease(
        Effect.try({
          try: () => openSync(lockPath, "wx", 0o600),
          catch: (cause) =>
            new HolydotError({
              message:
                "Cannot acquire configuration save lock. Another save or a stale lock may exist; inspect it before retrying.",
              cause,
            }),
        }),
        (fd) =>
          Effect.sync(() => {
            try {
              closeSync(fd);
            } finally {
              unlinkSync(lockPath);
            }
          }),
      );
      const current = yield* readConfigFile(path);
      if (current?.content !== original?.content)
        return yield* Effect.fail(
          new HolydotError({
            message:
              "Configuration changed during setup; reload it before saving. No overwrite occurred.",
          }),
        );
      if (current?.content === content) return null;
      return yield* Effect.try({
        try: () => {
          const suffix = randomUUID();
          const temporary = `${path}.tmp-${suffix}`;
          const backup = original === null ? null : `${path}.bak-${suffix}`;
          let created = false;
          try {
            const fd = openSync(temporary, "wx", 0o600);
            created = true;
            try {
              writeFileSync(fd, content, "utf8");
              fsyncSync(fd);
            } finally {
              closeSync(fd);
            }
            // Cooperating saves hold the lock across both comparisons and replacement.
            // External editors can still race: this is not an atomic content CAS.
            if (original !== null) {
              const stats = lstatSync(path);
              if (!stats.isFile() || readFileSync(path, "utf8") !== original.content)
                throw new Error("Configuration changed before save.");
              writeFileSync(backup!, original.content, { flag: "wx", mode: 0o600 });
              renameSync(temporary, path);
              created = false;
            } else {
              // Exclusive atomic creation cannot replace a config created by another process.
              linkSync(temporary, path);
            }
            return backup;
          } finally {
            if (created) unlinkSync(temporary);
          }
        },
        catch: (cause) =>
          new HolydotError({
            message:
              "Cannot save configuration atomically. Check permissions and filesystem support; original/backup preserved.",
            cause,
          }),
      });
    }),
  );
}

/**
 * Read packaged UTF-8 instruction text without depending on the invoking directory.
 *
 * @param url - File URL within the installed package.
 * @returns Strict UTF-8 text, or a typed filesystem/decode error.
 */
export function readText(url: URL): Effect.Effect<string, HolydotError> {
  return Effect.try({
    try: () => new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(url)),
    catch: (cause) =>
      new HolydotError({ message: "Cannot read installed instruction text as UTF-8.", cause }),
  });
}
