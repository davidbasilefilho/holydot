import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { parseSync, Visitor, type Span, type Class, type Node } from "oxc-parser";

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
  const exposedAnnotations: Span[] = [];
  const parameterTypes = (node: Node) => {
    if ("typeAnnotation" in node && node.typeAnnotation)
      exposedAnnotations.push(node.typeAnnotation);
    if (node.type === "AssignmentPattern") parameterTypes(node.left);
    if (node.type === "RestElement") parameterTypes(node.argument);
    if (node.type === "TSParameterProperty") parameterTypes(node.parameter);
  };
  const signatureTypes = (node: Node) => {
    if ("typeParameters" in node && node.typeParameters)
      exposedAnnotations.push(node.typeParameters);
    if ("params" in node) for (const parameter of node.params) parameterTypes(parameter);
    if ("returnType" in node && node.returnType) exposedAnnotations.push(node.returnType);
  };
  const classMembers = (node: Class) => {
    for (const member of node.body.body) {
      if (member.type === "StaticBlock") continue;
      if ("accessibility" in member && member.accessibility === "private") continue;
      if ("key" in member && member.key.type === "PrivateIdentifier") continue;
      if (!documented(member)) report(member, "Document exposed class members with JSDoc.");
      if (member.type === "MethodDefinition" || member.type === "TSAbstractMethodDefinition")
        signatureTypes(member.value);
      if ("typeAnnotation" in member && member.typeAnnotation)
        exposedAnnotations.push(member.typeAnnotation);
      if (
        "value" in member &&
        member.value &&
        member.type !== "MethodDefinition" &&
        member.type !== "TSAbstractMethodDefinition"
      )
        objectMembers(member.value);
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
  const bindings = new Map<string, { declaration: Node; documentation: Span }>();
  const exposedTypes = new Set<number>();
  const checked = new Set<string>();
  const bindingNames = (node: Node): string[] => {
    if (node.type === "Identifier") return [node.name];
    if (node.type === "RestElement") return bindingNames(node.argument);
    if (node.type === "AssignmentPattern") return bindingNames(node.left);
    if (node.type === "ArrayPattern")
      return node.elements.flatMap((value) => (value === null ? [] : bindingNames(value)));
    if (node.type === "ObjectPattern")
      return node.properties.flatMap((value) =>
        bindingNames(value.type === "RestElement" ? value.argument : value.value),
      );
    return [];
  };
  for (const statement of parsed.program.body) {
    const declaration =
      statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    if (declaration === null) continue;
    const documentation = statement.type === "ExportNamedDeclaration" ? statement : declaration;
    if (declaration.type === "VariableDeclaration")
      for (const value of declaration.declarations)
        for (const name of bindingNames(value.id))
          bindings.set(name, { declaration, documentation });
    else if ("id" in declaration && declaration.id?.type === "Identifier")
      bindings.set(declaration.id.name, { declaration, documentation });
  }
  const checkedObjects = new Set<Node>();
  const objectMembers = (node: Node) => {
    if (checkedObjects.has(node)) return;
    checkedObjects.add(node);
    if (node.type === "Identifier") {
      const local = bindings.get(node.name)?.declaration;
      if (local?.type === "VariableDeclaration")
        for (const value of local.declarations)
          if (value.id.type === "Identifier" && value.id.name === node.name && value.init)
            objectMembers(value.init);
    } else if (
      node.type === "TSAsExpression" ||
      node.type === "TSSatisfiesExpression" ||
      node.type === "TSNonNullExpression" ||
      node.type === "ParenthesizedExpression"
    )
      objectMembers(node.expression);
    else if (node.type === "ArrayExpression") {
      for (const value of node.elements) if (value) objectMembers(value);
    } else if (node.type === "ObjectExpression") {
      for (const property of node.properties) {
        if (!documented(property))
          report(property, "Document exposed object literal members with JSDoc.");
        objectMembers(property.type === "SpreadElement" ? property.argument : property.value);
      }
    } else if (node.type === "ClassExpression") classMembers(node);
    else signatureTypes(node);
  };
  const expose = (declaration: Node, documentation: Span, localName?: string) => {
    const key = `${declaration.start}:${localName ?? "*"}`;
    if (checked.has(key)) return;
    checked.add(key);
    if (!documented(documentation))
      report(documentation, "Document every exported symbol with JSDoc.");
    signatureTypes(declaration);
    objectMembers(declaration);
    if (declaration.type === "ClassDeclaration" || declaration.type === "ClassExpression") {
      classMembers(declaration);
      if (declaration.superClass) exposedAnnotations.push(declaration.superClass);
    }
    if (declaration.type === "TSEnumDeclaration")
      for (const member of declaration.body.members)
        if (!documented(member)) report(member, "Document exposed enum members with JSDoc.");
    if (declaration.type === "TSInterfaceDeclaration")
      for (const member of declaration.body.body)
        if (!documented(member)) report(member, "Document exposed interface members with JSDoc.");
    if (["TSInterfaceDeclaration", "TSTypeAliasDeclaration"].includes(declaration.type)) {
      exposedTypes.add(declaration.start);
      exposedAnnotations.push(declaration);
    }
    if (declaration.type === "VariableDeclaration")
      for (const value of declaration.declarations) {
        if (localName && !bindingNames(value.id).includes(localName)) continue;
        if (value.id.type === "Identifier" && value.init) objectMembers(value.init);
        if (value.id.type === "Identifier" && value.id.typeAnnotation)
          exposedAnnotations.push(value.id.typeAnnotation);
      }
  };
  const exposeLocal = (name: string, boundary: Span) => {
    const local = bindings.get(name);
    if (local) expose(local.declaration, local.documentation, name);
    else if (!documented(boundary))
      report(boundary, "Document external re-export boundaries with JSDoc.");
  };
  for (const statement of parsed.program.body) {
    if (statement.type === "ExportNamedDeclaration") {
      if (statement.declaration !== null) expose(statement.declaration, statement);
      else if (statement.source !== null) {
        if (!documented(statement))
          report(statement, "Document external re-export boundaries with JSDoc.");
      } else
        for (const specifier of statement.specifiers)
          exposeLocal(
            specifier.local.type === "Identifier" ? specifier.local.name : specifier.local.value,
            statement,
          );
    } else if (statement.type === "ExportDefaultDeclaration") {
      if (statement.declaration.type === "Identifier")
        exposeLocal(statement.declaration.name, statement);
      else expose(statement.declaration, statement);
    } else if (statement.type === "ExportAllDeclaration" && !documented(statement))
      report(statement, "Document external re-export boundaries with JSDoc.");
  }
  const genericScopes: { range: Span; names: Set<string> }[] = [];
  const generics = (node: Node) => {
    if ("typeParameters" in node && node.typeParameters)
      genericScopes.push({
        range: node,
        names: new Set(node.typeParameters.params.map((parameter) => parameter.name.name)),
      });
  };
  new Visitor({
    FunctionDeclaration: generics,
    FunctionExpression: generics,
    ArrowFunctionExpression: generics,
    TSDeclareFunction: generics,
    TSInterfaceDeclaration: generics,
    TSTypeAliasDeclaration: generics,
    ClassDeclaration: generics,
    ClassExpression: generics,
    TSMethodSignature: generics,
    TSCallSignatureDeclaration: generics,
    TSConstructSignatureDeclaration: generics,
    TSFunctionType: generics,
    TSConstructorType: generics,
  }).visit(parsed.program);
  const resolveType = (name: string, reference: Span) => {
    if (
      !exposedAnnotations.some(
        (range) => range.start <= reference.start && reference.end <= range.end,
      )
    )
      return;
    if (
      genericScopes.some(
        ({ range, names }) =>
          range.start <= reference.start && reference.end <= range.end && names.has(name),
      )
    )
      return;
    const local = bindings.get(name);
    if (
      local &&
      [
        "TSInterfaceDeclaration",
        "TSTypeAliasDeclaration",
        "ClassDeclaration",
        "TSEnumDeclaration",
      ].includes(local.declaration.type)
    )
      expose(local.declaration, local.documentation);
  };
  let previousSize = -1;
  while (previousSize !== checked.size) {
    previousSize = checked.size;
    new Visitor({
      TSTypeReference: (node) => {
        if (node.typeName.type === "Identifier") resolveType(node.typeName.name, node);
      },
      ClassDeclaration: (node) => {
        if (node.superClass?.type === "Identifier")
          resolveType(node.superClass.name, node.superClass);
      },
      TSInterfaceHeritage: (node) => {
        if (node.expression.type === "Identifier") resolveType(node.expression.name, node);
      },
    }).visit(parsed.program);
  }
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
      if (node.declaration !== null) expose(node.declaration, node);
    },
    TSInterfaceDeclaration: (node) => {
      if (exposedTypes.has(node.start)) exportedTypeDepth++;
    },
    "TSInterfaceDeclaration:exit": (node) => {
      if (exposedTypes.has(node.start)) exportedTypeDepth--;
    },
    TSTypeAliasDeclaration: (node) => {
      if (exposedTypes.has(node.start)) exportedTypeDepth++;
    },
    "TSTypeAliasDeclaration:exit": (node) => {
      if (exposedTypes.has(node.start)) exportedTypeDepth--;
    },
    TSTypeLiteral: (node) => {
      if (
        exportedTypeDepth > 0 ||
        exposedAnnotations.some((range) => range.start <= node.start && node.end <= range.end)
      )
        for (const member of node.members)
          if (!documented(member))
            report(member, "Document exposed object type members with JSDoc.");
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
