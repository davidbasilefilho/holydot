import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Effect } from "effect";
import { HolydotError } from "../errors";

/** Verified identities of the installed canonical instructions and adopted literal. */
export interface InstructionIdentity {
  /** Explicit instruction revision, independent of the package release channel. */
  readonly revision: string;
  /** SHA-256 of the complete canonical file bytes. */
  readonly canonicalSHA256: string;
  /** SHA-256 of the adopted LF literal, without a final newline. */
  readonly adoptedSHA256: string;
}

/**
 * Read and verify installed source against its packaged integrity pin before setup or render. This
 * is corruption/staleness detection, not authentication of a maliciously replaced package.
 *
 * @param root - Installed package root; independent of the invoking directory.
 * @returns Complete strict UTF-8 source and verified identities.
 * @throws Via Effect on missing, malformed, stale or modified source/pin bytes.
 */
export function loadInstructionSource(root: URL) {
  return Effect.try({
    try: () => {
      const bytes = readFileSync(new URL("instructions/holydot.md", root));
      const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
      const pin = JSON.parse(
        readFileSync(new URL("instructions/integrity.json", root), "utf8"),
      ) as Record<string, unknown>;
      const sha = (input: Uint8Array | string) => createHash("sha256").update(input).digest("hex");
      const marker = "### **Instruções adotadas — texto integral**\n\n";
      const pieces = text.split(marker);
      if (
        pin.schemaVersion !== 1 ||
        typeof pin.revision !== "string" ||
        !/^\d{4}-\d{2}-\d{2}\.\d+$/.test(pin.revision) ||
        ![pin.canonicalSHA256, pin.adoptedSHA256].every(
          (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value),
        ) ||
        sha(bytes) !== pin.canonicalSHA256 ||
        pieces.length !== 2 ||
        sha(pieces[1]!.replace(/\n$/, "")) !== pin.adoptedSHA256
      ) {
        throw new Error(
          "Canonical instructions or adopted literal do not match the installed integrity pin.",
        );
      }
      const identity: InstructionIdentity = {
        revision: pin.revision,
        canonicalSHA256: pin.canonicalSHA256 as string,
        adoptedSHA256: pin.adoptedSHA256 as string,
      };
      return { text, identity };
    },
    catch: (cause) =>
      new HolydotError({
        message:
          "Cannot verify installed holydot instructions; restore the approved package before setup/render/resume.",
        cause,
      }),
  });
}
