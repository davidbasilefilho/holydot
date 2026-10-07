import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/** Immutable public HolyCodex source revision used by the instruction adaptation. */
export const SOURCE_REVISION = "ff1b9ff5c2f35100095f19a4b55802bb931f6434";

/** Files required for a complete reusable instruction and development package. */
export const REQUIRED_FILES = [
  ".gitattributes",
  "README.md",
  "LICENSE",
  "NOTICE",
  "AGENTS.md",
  "instructions/holydot.md",
  "instructions/specialist.md",
  "templates/task.md",
  "templates/result.md",
  "docs/usage.md",
  "docs/adaptation.md",
  "docs/provenance.md",
  "docs/development.md",
  "examples/acceptance.md",
  "scripts/validate.ts",
  "scripts/cli.ts",
  "scripts/setup.ts",
  "tests/setup.test.ts",
  "docs/account-rules.md",
  "docs/policy-index.md",
  "tests/cli.test.ts",
  "docs/setup.md",
  "scripts/release.ts",
  "tests/release.test.ts",
  "docs/releases.md",
  "tests/validate.test.ts",
  "package.json",
  "bun.lock",
  "mise.toml",
  "tsconfig.json",
  ".oxlintrc.json",
  ".oxfmtrc.json",
  "lefthook.yml",
  ".github/workflows/validation.yml",
  ".github/workflows/publish.yml",
] as const;

/** Directories outside the package-validation scope. */
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist"]);

/**
 * Determine whether a resolved destination stays inside the package root.
 *
 * @param root - Absolute package directory.
 * @param destination - Absolute candidate path.
 * @returns Whether the candidate remains within the root.
 */
function isInside(root: string, destination: string): boolean {
  const path = relative(root, destination);
  return !isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`);
}

/**
 * Enumerate Markdown files without following symlinks or dependency directories.
 *
 * @param directory - Directory to inspect.
 * @returns Sorted absolute Markdown paths.
 */
function markdownFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory() && !IGNORED_DIRECTORIES.has(entry.name)) {
      files.push(...markdownFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path);
    }
  }
  return files.sort();
}

/**
 * Check package completeness, inline local Markdown links and pinned source URLs offline. This is
 * an integrity check, not a full Markdown parser or an assistant behavior test.
 *
 * @param directory - Package directory to inspect without modifying it.
 * @returns Human-readable failures; an empty array means these checks passed.
 */
export function validatePackage(directory: string): string[] {
  const errors: string[] = [];
  if (!existsSync(directory) || !lstatSync(directory).isDirectory()) {
    return ["Package directory does not exist or is not a directory"];
  }
  const root = realpathSync(directory);
  for (const name of REQUIRED_FILES) {
    const path = resolve(root, name);
    if (!existsSync(path) || !lstatSync(path).isFile() || !readFileSync(path, "utf8").trim()) {
      errors.push(`Missing or empty required file: ${name}`);
    }
  }
  for (const path of markdownFiles(root)) {
    const content = readFileSync(path, "utf8");
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (!target || /^(?:https?:|mailto:|#)/.test(target)) continue;
      const targetPath = target.split("#")[0];
      if (!targetPath) continue;
      const destination = resolve(dirname(path), targetPath);
      if (!isInside(root, destination)) {
        errors.push(`Link escapes package: ${relative(root, path)} -> ${target}`);
      } else if (!existsSync(destination)) {
        errors.push(`Broken local link: ${relative(root, path)} -> ${target}`);
      } else if (!isInside(root, realpathSync(destination))) {
        errors.push(`Link resolves outside package: ${relative(root, path)} -> ${target}`);
      }
    }
    for (const match of content.matchAll(
      /github\.com\/davidbasilefilho\/holycodex\/(?:blob|tree)\/([^/\s)]+)/g,
    )) {
      if (match[1] !== SOURCE_REVISION) {
        errors.push(`Unpinned or unexpected source revision: ${relative(root, path)}`);
      }
    }
  }
  const license = resolve(root, "LICENSE");
  if (existsSync(license) && lstatSync(license).isFile()) {
    const text = readFileSync(license, "utf8");
    if (!text.includes("Apache License") || !text.includes("END OF TERMS AND CONDITIONS")) {
      errors.push("Expected complete Apache-2.0 license markers");
    }
  }
  return errors;
}

if (import.meta.main) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const errors = validatePackage(root);
  if (errors.length > 0) {
    console.error(`Package validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(
      "PASS: required files, inline local Markdown links, pinned source references and license markers.",
    );
    console.log(
      "No network calls. No assistant behavior, external links, permissions or runtime guarantees tested.",
    );
  }
}
