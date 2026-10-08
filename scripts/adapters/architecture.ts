import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { parseSync, Visitor, type Span, type Class } from "oxc-parser";

/** Source text and repository-relative filename checked by the architectural gate. */
export interface SourceFile {
  /** Filename used to classify domain, adapter and executable entrypoints. */
  readonly path: string;
  /** Strictly decoded UTF-8 source text. */
  readonly text: string;
}

/**
 * Check semantic TypeScript syntax for architectural drift and missing public-symbol JSDoc.
 *
 * @param source - Domain/adapter source file with a repository-relative path.
 * @returns Actionable errors; legitimate adapter code is exempt from domain async rules.
 */
export function inspectSource(source: SourceFile): string[] {
  const errors: string[] = [];
  const parsed = parseSync(source.path, source.text);
  const adapter = source.path.startsWith("scripts/adapters/");
  let entryDepth = 0;
  let exportedTypeDepth = 0;
  const report = (node: Span, message: string) => {
    const line = source.text.slice(0, node.start).split("\n").length;
    errors.push(`${source.path}:${line}: ${message}`);
  };
  const documented = (node: Span) =>
    parsed.comments.some(
      (comment) =>
        comment.type === "Block" &&
        comment.value.startsWith("*") &&
        comment.end <= node.start &&
        source.text.slice(comment.end, node.start).trim() === "",
    );
  const classMembers = (node: Class) => {
    for (const member of node.body.body) {
      if (member.type === "StaticBlock") continue;
      if ("accessibility" in member && member.accessibility === "private") continue;
      if ("key" in member && member.key.type === "PrivateIdentifier") continue;
      if (!documented(member)) report(member, "Document exposed class members with JSDoc.");
      if (
        (member.type === "MethodDefinition" || member.type === "TSAbstractMethodDefinition") &&
        member.kind === "constructor"
      )
        for (const parameter of member.value.params)
          if (
            parameter.type === "TSParameterProperty" &&
            parameter.accessibility !== "private" &&
            !documented(parameter)
          )
            report(parameter, "Document exposed constructor parameter properties with JSDoc.");
    }
  };
  const main = (node: { test: Span }) =>
    source.text.slice(node.test.start, node.test.end) === "import.meta.main";
  const domain = (node: Span, message: string) => {
    if (!adapter && entryDepth === 0) report(node, message);
  };
  const visitor = new Visitor({
    IfStatement: (node) => {
      if (main(node)) entryDepth++;
    },
    "IfStatement:exit": (node) => {
      if (main(node)) entryDepth--;
    },
    TryStatement: (node) => domain(node, "Native try/catch belongs in Effect adapters."),
    ThrowStatement: (node) => domain(node, "Use typed Effect failures in domain code."),
    AwaitExpression: (node) =>
      domain(
        node,
        "Use Effect composition; native await belongs in adapters or executable entrypoints.",
      ),
    NewExpression: (node) => {
      if (node.callee.type === "Identifier" && node.callee.name === "Promise")
        domain(node, "Wrap native Promise construction in an Effect adapter.");
    },
    FunctionDeclaration: (node) => {
      if (node.async) domain(node, "Async domain functions must return Effect.");
    },
    FunctionExpression: (node) => {
      if (node.async) domain(node, "Async domain functions must return Effect.");
    },
    ArrowFunctionExpression: (node) => {
      if (node.async) domain(node, "Async domain functions must return Effect.");
    },
    ExportNamedDeclaration: (node) => {
      if (node.declaration === null) return;
      if (
        node.declaration.type === "TSTypeAliasDeclaration" ||
        node.declaration.type === "TSInterfaceDeclaration"
      )
        exportedTypeDepth++;
      if (node.declaration.type === "ClassDeclaration") classMembers(node.declaration);
      if (!documented(node)) report(node, "Document every exported symbol with JSDoc.");
      if (node.declaration.type === "TSInterfaceDeclaration")
        for (const member of node.declaration.body.body)
          if (!documented(member)) report(member, "Document exposed interface members with JSDoc.");
    },
    "ExportNamedDeclaration:exit": (node) => {
      if (
        node.declaration?.type === "TSTypeAliasDeclaration" ||
        node.declaration?.type === "TSInterfaceDeclaration"
      )
        exportedTypeDepth--;
    },
    TSTypeLiteral: (node) => {
      if (exportedTypeDepth > 0)
        for (const member of node.members)
          if (!documented(member))
            report(member, "Document exposed object type members with JSDoc.");
    },
    ExportDefaultDeclaration: (node) => {
      if (
        node.declaration.type === "ClassDeclaration" ||
        node.declaration.type === "ClassExpression"
      )
        classMembers(node.declaration);
      if (!documented(node)) report(node, "Document default exports with JSDoc.");
    },
  });
  for (const error of parsed.errors) errors.push(`${source.path}: ${error.message}`);
  visitor.visit(parsed.program);
  return errors;
}

/**
 * Read project TypeScript through the native filesystem/parser boundary.
 *
 * @param root - Project root containing scripts/.
 * @returns Architectural errors after strict UTF-8 decoding and syntax inspection.
 */
export function inspectArchitecture(root: string): string[] {
  const files: SourceFile[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (/\.tsx?$/.test(entry.name))
        files.push({
          path: relative(root, path).replaceAll("\\", "/"),
          text: new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(path)),
        });
    }
  };
  visit(resolve(root, "scripts"));
  return files.flatMap(inspectSource);
}
