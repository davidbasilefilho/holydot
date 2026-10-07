import solidPlugin from "@opentui/solid/bun-plugin";

/**
 * Build split Bun-target JavaScript so installed TSX never depends on a consumer preload file.
 *
 * @returns Completion after compiling the CLI and dynamically loaded Solid editor chunks.
 * @throws When the official Bun/Solid build reports a failure.
 */
export async function compileCli(): Promise<void> {
  const result = await Bun.build({
    entrypoints: ["./scripts/cli.ts"],
    outdir: "./dist",
    target: "bun",
    packages: "external",
    splitting: true,
    plugins: [solidPlugin],
  });
  if (!result.success) throw new Error(`CLI build failed: ${result.logs.map(String).join("\n")}`);
}
