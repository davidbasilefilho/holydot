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
 * Check module-local TypeScript syntax for architectural drift and public-symbol JSDoc.
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
  const checkedClasses = new Set<Class>();
  const classMembers = (node: Class) => {
    if (checkedClasses.has(node)) return;
    checkedClasses.add(node);
    if (node.superClass) exposedAnnotations.push(node.superClass);
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
  const bindings = new Map<
    string,
    { declaration: Node; documentation: Span; pattern?: Node; initializer?: Node | undefined }
  >();
  const exposedTypes = new Set<number>();
  const checked = new Set<string>();
  const bindingNames = (node: Node): string[] => {
    if (node.type === "Identifier") return [node.name];
    if (node.type === "RestElement") return bindingNames(node.argument);
    if (node.type === "TSParameterProperty") return bindingNames(node.parameter);
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
          bindings.set(name, {
            declaration,
            documentation,
            pattern: value.id,
            initializer: value.init ?? undefined,
          });
    else if ("id" in declaration && declaration.id?.type === "Identifier")
      bindings.set(declaration.id.name, { declaration, documentation });
  }
  type Selection = { node?: Node | undefined; known: boolean };
  const keyOf = (node: Node, computed = false): string | undefined => {
    if (!computed && node.type === "Identifier") return node.name;
    if (node.type === "Literal" && ["string", "number"].includes(typeof node.value))
      return String(node.value);
    return undefined;
  };
  const resolveValue = (node: Node, seen = new Set<Node>()): Node | undefined => {
    if (seen.has(node)) return undefined;
    const next = new Set(seen).add(node);
    if (
      node.type === "TSAsExpression" ||
      node.type === "TSSatisfiesExpression" ||
      node.type === "TSNonNullExpression" ||
      node.type === "ParenthesizedExpression"
    )
      return resolveValue(node.expression, next);
    if (
      node.type === "TSParenthesizedType" ||
      (node.type === "TSTypeOperator" && node.operator === "readonly")
    )
      return resolveValue(node.typeAnnotation, next);
    if (node.type === "Identifier") {
      const local = bindings.get(node.name);
      if (local?.pattern)
        return boundValue(local.pattern, { node: local.initializer, known: true }, node.name, next)
          ?.node;
      if (local) return resolveValue(local.declaration, next);
    }
    if (
      node.type === "TSTypeReference" &&
      node.typeName.type === "Identifier" &&
      !node.typeArguments
    ) {
      const name = node.typeName.name;
      if (
        genericScopes.some(
          ({ range, names }) =>
            range.start <= node.start && node.end <= range.end && names.has(name),
        )
      )
        return node;
      const declaration = bindings.get(name)?.declaration;
      if (declaration?.type === "TSTypeAliasDeclaration" && !declaration.typeParameters)
        return resolveValue(declaration.typeAnnotation, new Set(next).add(declaration));
      if (declaration?.type === "TSInterfaceDeclaration" && !declaration.typeParameters)
        return resolveValue(declaration, next);
    }
    if (node.type === "MemberExpression") {
      const key = keyOf(node.property, node.computed);
      if (key !== undefined) return selectValue(node.object, key, next).node;
    }
    return node;
  };
  const objectShape = (node: Node, seen: Set<Node>): Node[] | undefined => {
    const value = resolveValue(node, seen);
    if (value?.type === "TSTypeLiteral") return value.members;
    if (value?.type === "TSInterfaceDeclaration") {
      const inherited: Node[] = [];
      for (const base of value.extends) {
        if (base.typeArguments) return undefined;
        const members = objectShape(base.expression, new Set(seen).add(value));
        if (!members) return undefined;
        inherited.push(...members);
      }
      const members = new Map<string, Node>();
      for (const member of [...inherited, ...value.body.body]) {
        if (!("key" in member)) return undefined;
        const key = keyOf(member.key, "computed" in member && member.computed);
        if (key === undefined) return undefined;
        members.set(key, member);
      }
      return [...members.values()];
    }
    if (value?.type !== "ObjectExpression") return undefined;
    const members = new Map<string, Node>();
    for (const property of value.properties) {
      if (property.type === "SpreadElement") {
        const spread = objectShape(property.argument, new Set(seen).add(value));
        if (!spread) return undefined;
        for (const item of spread) {
          if (!("key" in item)) return undefined;
          const key = keyOf(item.key, "computed" in item && item.computed);
          if (key === undefined) return undefined;
          members.set(key, item);
        }
      } else {
        const key = keyOf(property.key, property.computed);
        if (key === undefined) return undefined;
        members.set(key, property);
      }
    }
    return [...members.values()];
  };
  const arrayShape = (node: Node, seen: Set<Node>): (Node | null)[] | undefined => {
    const value = resolveValue(node, seen);
    if (value?.type === "TSTupleType") return value.elementTypes;
    if (value?.type !== "ArrayExpression") return undefined;
    const elements: (Node | null)[] = [];
    for (const element of value.elements) {
      if (element?.type === "SpreadElement") {
        const spread = arrayShape(element.argument, new Set(seen).add(value));
        if (!spread) return undefined;
        elements.push(...spread);
      } else elements.push(element);
    }
    return elements;
  };
  const selectValue = (node: Node, key: string, seen: Set<Node>): Selection => {
    const value = resolveValue(node, seen);
    if (value?.type === "ClassDeclaration" || value?.type === "ClassExpression") {
      const field = value.body.body.find(
        (member) =>
          "key" in member &&
          member.key.type !== "PrivateIdentifier" &&
          member.static &&
          !("accessibility" in member && member.accessibility === "private") &&
          keyOf(member.key, member.computed) === key,
      );
      if (field && "value" in field) return { node: field.value ?? undefined, known: true };
      if (!field && value.superClass)
        return selectValue(value.superClass, key, new Set(seen).add(value));
      return { known: false };
    }
    const properties = objectShape(node, seen);
    if (properties) {
      const property = properties.find(
        (item) => "key" in item && keyOf(item.key, "computed" in item && item.computed) === key,
      );
      if (!property) return { known: true };
      if (property.type === "Property") return { node: property.value, known: true };
      if (property.type === "TSPropertySignature")
        return { node: property.typeAnnotation?.typeAnnotation, known: true };
      return { known: false };
    }
    const elements = arrayShape(node, seen);
    if (elements && /^(0|[1-9]\d*)$/.test(key))
      return { node: elements[Number(key)] ?? undefined, known: true };
    return { known: false };
  };
  const boundValue = (
    pattern: Node,
    selected: Selection,
    name: string,
    seen: Set<Node>,
  ): Selection | undefined => {
    if (!bindingNames(pattern).includes(name)) return undefined;
    if (pattern.type === "Identifier")
      return selected.node
        ? { node: resolveValue(selected.node, seen), known: selected.known }
        : selected;
    if (pattern.type === "AssignmentPattern") {
      const value = selected.node && resolveValue(selected.node, seen);
      const missing =
        selected.known &&
        (!selected.node ||
          (value?.type === "Identifier" &&
            value.name === "undefined" &&
            !bindings.has("undefined")));
      return boundValue(
        pattern.left,
        missing ? { node: pattern.right, known: true } : selected,
        name,
        seen,
      );
    }
    if (pattern.type === "RestElement") return boundValue(pattern.argument, selected, name, seen);
    if (!selected.node) return undefined;
    if (pattern.type === "ObjectPattern") {
      const omitted = new Set(
        pattern.properties.flatMap((property) =>
          property.type === "RestElement" ? [] : [keyOf(property.key, property.computed)],
        ),
      );
      for (const property of pattern.properties) {
        if (
          !bindingNames(
            property.type === "RestElement" ? property.argument : property.value,
          ).includes(name)
        )
          continue;
        if (property.type === "RestElement") {
          if (omitted.has(undefined)) return undefined;
          const value = resolveValue(selected.node, seen);
          const members = objectShape(selected.node, seen)?.filter(
            (item) =>
              "key" in item && !omitted.has(keyOf(item.key, "computed" in item && item.computed)),
          );
          if (!members || !value) return undefined;
          if (value.type === "ObjectExpression")
            return boundValue(
              property.argument,
              { node: { ...value, properties: members as typeof value.properties }, known: true },
              name,
              seen,
            );
          if (value.type === "TSInterfaceDeclaration")
            return boundValue(
              property.argument,
              {
                node: {
                  type: "TSTypeLiteral",
                  start: value.start,
                  end: value.end,
                  members: members as import("oxc-parser").TSTypeLiteral["members"],
                },
                known: true,
              },
              name,
              seen,
            );
          if (value.type === "TSTypeLiteral")
            return boundValue(
              property.argument,
              { node: { ...value, members: members as typeof value.members }, known: true },
              name,
              seen,
            );
        } else {
          const key = keyOf(property.key, property.computed);
          if (key !== undefined)
            return boundValue(property.value, selectValue(selected.node, key, seen), name, seen);
        }
      }
    }
    if (pattern.type === "ArrayPattern") {
      const elements = arrayShape(selected.node, seen);
      if (!elements) return undefined;
      for (const [index, item] of pattern.elements.entries()) {
        if (!item || !bindingNames(item).includes(name)) continue;
        if (item.type === "RestElement") {
          const value = resolveValue(selected.node, seen);
          if (value?.type === "ArrayExpression")
            return boundValue(
              item.argument,
              {
                node: { ...value, elements: elements.slice(index) as typeof value.elements },
                known: true,
              },
              name,
              seen,
            );
          if (value?.type === "TSTupleType")
            return boundValue(
              item.argument,
              {
                node: {
                  ...value,
                  elementTypes: elements.slice(index) as typeof value.elementTypes,
                },
                known: true,
              },
              name,
              seen,
            );
        } else
          return boundValue(item, { node: elements[index] ?? undefined, known: true }, name, seen);
      }
    }
    return undefined;
  };
  const valueScopes: { range: Span; names: Set<string>; parameters?: Node[] }[] = [];
  const genericScopes: { range: Span; names: Set<string> }[] = [];
  const generics = (node: Node) => {
    if ("params" in node)
      valueScopes.push({
        range: node,
        names: new Set(node.params.flatMap(bindingNames)),
        parameters: node.params,
      });
    if ((node.type === "FunctionExpression" || node.type === "ClassExpression") && node.id)
      valueScopes.push({ range: node, names: new Set([node.id.name]) });
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
  const checkedObjects = new Set<Node>();
  const objectMembers = (node: Node) => {
    if (checkedObjects.has(node)) return;
    checkedObjects.add(node);
    if (node.type === "Identifier" || node.type === "MemberExpression") {
      const value = resolveValue(node);
      if (value && value !== node) objectMembers(value);
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
    } else if (node.type === "ClassExpression" || node.type === "ClassDeclaration")
      classMembers(node);
    else if (node.type === "SpreadElement") objectMembers(node.argument);
    else signatureTypes(node);
  };
  const exposeAnnotation = (node: Node) => {
    if (node.type === "TSTypeLiteral") {
      for (const member of node.members) {
        if (!documented(member)) report(member, "Document exposed object type members with JSDoc.");
        signatureTypes(member);
        if ("typeAnnotation" in member && member.typeAnnotation)
          exposeAnnotation(member.typeAnnotation.typeAnnotation);
      }
    } else if (node.type === "TSTupleType") {
      for (const element of node.elementTypes) exposeAnnotation(element);
    } else if (node.type === "TSNamedTupleMember") exposeAnnotation(node.elementType);
    else exposedAnnotations.push(node);
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
        for (const name of bindingNames(value.id)) {
          if (localName && name !== localName) continue;
          const selected = boundValue(
            value.id,
            { node: value.init ?? undefined, known: true },
            name,
            new Set(),
          );
          if (selected?.node) objectMembers(selected.node);
          if (value.id.typeAnnotation) {
            const annotation = boundValue(
              value.id,
              { node: value.id.typeAnnotation.typeAnnotation, known: true },
              name,
              new Set(),
            );
            if (annotation?.node) exposeAnnotation(annotation.node);
          }
        }
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
  const queryIndexes = new Map<Node, string[]>();
  const queryBase = (node: Node): { query: Node; keys: string[] } | undefined => {
    if (node.type === "TSTypeQuery") return { query: node, keys: [] };
    if (node.type === "TSParenthesizedType") return queryBase(node.typeAnnotation);
    if (node.type === "TSIndexedAccessType" && node.indexType.type === "TSLiteralType") {
      const key = keyOf(node.indexType.literal, true);
      const base = queryBase(node.objectType);
      if (key !== undefined && base) return { query: base.query, keys: [...base.keys, key] };
    }
    return undefined;
  };
  new Visitor({
    TSIndexedAccessType: (node) => {
      const base = queryBase(node);
      if (base && base.keys.length > (queryIndexes.get(base.query)?.length ?? 0))
        queryIndexes.set(base.query, base.keys);
    },
  }).visit(parsed.program);
  const queried = new Set<Node>();
  const queryPath = (node: Node): string[] | undefined => {
    if (node.type === "Identifier") return [node.name];
    if (node.type === "TSQualifiedName") {
      const left = queryPath(node.left);
      if (left) return [...left, node.right.name];
    }
    return undefined;
  };
  const queryValue = (node: Node) => {
    if (
      node.type !== "TSTypeQuery" ||
      queried.has(node) ||
      !exposedAnnotations.some((range) => range.start <= node.start && node.end <= range.end)
    )
      return;
    queried.add(node);
    const rootPath = queryPath(node.exprName);
    if (!rootPath) return;
    const path = [...rootPath, ...(queryIndexes.get(node) ?? [])];
    const name = path[0]!;
    const scoped = valueScopes
      .filter(
        ({ range, names }) => range.start <= node.start && node.end <= range.end && names.has(name),
      )
      .sort((a, b) => a.range.end - a.range.start - (b.range.end - b.range.start))[0];
    if (scoped) {
      const parameter = scoped.parameters?.find((item) => bindingNames(item).includes(name));
      if (parameter) {
        const actual = parameter.type === "TSParameterProperty" ? parameter.parameter : parameter;
        const pattern = actual.type === "AssignmentPattern" ? actual.left : actual;
        const annotation =
          "typeAnnotation" in pattern && pattern.typeAnnotation?.type === "TSTypeAnnotation"
            ? pattern.typeAnnotation
            : undefined;
        let value =
          actual.type === "AssignmentPattern"
            ? boundValue(pattern, { node: actual.right, known: true }, name, new Set())?.node
            : undefined;
        let type = annotation
          ? boundValue(pattern, { node: annotation.typeAnnotation, known: true }, name, new Set())
              ?.node
          : undefined;
        for (const key of path.slice(1)) {
          value = value && selectValue(value, key, new Set()).node;
          type = type && selectValue(type, key, new Set()).node;
        }
        if (value) objectMembers(value);
        if (type) exposeAnnotation(type);
      }
      return;
    }
    const local = bindings.get(name);
    if (!local) return;
    if (path.length === 1) expose(local.declaration, local.documentation, name);
    else {
      if (!documented(local.documentation))
        report(local.documentation, "Document every exported symbol with JSDoc.");
      let value = local.pattern
        ? boundValue(local.pattern, { node: local.initializer, known: true }, name, new Set())?.node
        : local.declaration;
      for (const key of path.slice(1)) value = value && selectValue(value, key, new Set()).node;
      if (value) objectMembers(value);
    }
  };
  let previousSize = "";
  const progress = () => `${checked.size}:${checkedObjects.size}:${exposedAnnotations.length}`;
  while (previousSize !== progress()) {
    previousSize = progress();
    new Visitor({
      TSTypeQuery: queryValue,
      TSTypeReference: (node) => {
        if (node.typeName.type === "Identifier") resolveType(node.typeName.name, node);
      },
      ClassDeclaration: (node) => {
        if (node.superClass?.type === "Identifier")
          resolveType(node.superClass.name, node.superClass);
      },
      ClassExpression: (node) => {
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
