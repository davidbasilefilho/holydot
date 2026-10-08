import { expect, test } from "bun:test";
import { inspectSource } from "../scripts/adapters/architecture";

const shapes = [
  { name: "literal", make: (leaf: string) => ({ prefix: "", expression: leaf }) },
  { name: "as const", make: (leaf: string) => ({ prefix: "", expression: `${leaf} as const` }) },
  {
    name: "satisfies",
    make: (leaf: string) => ({
      prefix: "",
      expression: `${leaf} satisfies Record<string, boolean>`,
    }),
  },
  {
    name: "array spread",
    make: (leaf: string) => ({ prefix: `const array = [${leaf}];`, expression: "[...array]" }),
  },
  {
    name: "local alias",
    make: (leaf: string) => ({
      prefix: `const seed = ${leaf}; const alias = seed;`,
      expression: "alias",
    }),
  },
  {
    name: "property selection",
    make: (leaf: string) => ({
      prefix: `const seed = { target: ${leaf}, hidden: { secret: true } };`,
      expression: "seed.target",
    }),
  },
  {
    name: "literal computed selection",
    make: (leaf: string) => ({
      prefix: `const seed = { target: ${leaf}, hidden: { secret: true } };`,
      expression: 'seed["target"]',
    }),
  },
  {
    name: "object destructuring rename",
    make: (leaf: string) => ({
      prefix: `const { target: picked } = { target: ${leaf}, hidden: { secret: true } };`,
      expression: "picked",
    }),
  },
  {
    name: "nested destructuring",
    make: (leaf: string) => ({
      prefix: `const { outer: { target: picked } } = { outer: { target: ${leaf}, hidden: { secret: true } } };`,
      expression: "picked",
    }),
  },
  {
    name: "array destructuring with hole",
    make: (leaf: string) => ({
      prefix: `const [, picked] = [{ hidden: true }, ${leaf}];`,
      expression: "picked",
    }),
  },
  {
    name: "object missing default",
    make: (leaf: string) => ({ prefix: `const { picked = ${leaf} } = {};`, expression: "picked" }),
  },
  {
    name: "array missing default",
    make: (leaf: string) => ({ prefix: `const [picked = ${leaf}] = [];`, expression: "picked" }),
  },
  {
    name: "unused default",
    make: (leaf: string) => ({
      prefix: `const { picked = { unused: true } } = { picked: ${leaf} };`,
      expression: "picked",
    }),
  },
  {
    name: "object rest",
    make: (leaf: string) => ({
      prefix: `const { hidden, ...picked } = { hidden: { secret: true }, ...${leaf} };`,
      expression: "picked",
    }),
  },
  {
    name: "array rest",
    make: (leaf: string) => ({
      prefix: `const [hidden, ...picked] = [{ secret: true }, ${leaf}];`,
      expression: "picked",
    }),
  },
  {
    name: "static class selection",
    make: (leaf: string) => ({
      prefix: `class Source { static target = ${leaf}; private static hidden = { secret: true }; }`,
      expression: "Source.target",
    }),
  },
];
const boundaries = [
  {
    name: "direct export",
    make: (expression: string) => `/** Value. */ export const value = ${expression};`,
  },
  {
    name: "named alias export",
    make: (expression: string) =>
      `/** Value. */ const value = ${expression}; export { value as publicValue };`,
  },
  {
    name: "default export",
    make: (expression: string) =>
      `/** Value. */ const value = ${expression}; export default value;`,
  },
  {
    name: "typeof return",
    make: (expression: string) =>
      `/** Value. */ const value = ${expression}; /** Read. */ export function read(): typeof value { return value; }`,
  },
  {
    name: "typeof parameter",
    make: (expression: string) =>
      `/** Value. */ const value = ${expression}; /** Read. */ export function read(input: typeof value) {}`,
  },
  {
    name: "typeof alias chain",
    make: (expression: string) =>
      `/** Value. */ const value = ${expression}; /** Shape. */ type Shape = typeof value; /** Public. */ export type Public = Shape;`,
  },
  {
    name: "public class field",
    make: (expression: string) =>
      `/** API. */ export class API { /** Value. */ value = ${expression}; }`,
  },
  {
    name: "public object field",
    make: (expression: string) =>
      `/** API. */ export const API = { /** Value. */ value: ${expression} };`,
  },
];
for (const shape of shapes)
  for (const boundary of boundaries)
    for (const documented of [false, true])
      test(`${boundary.name} / ${shape.name} / ${documented ? "documented" : "missing member docs"}`, () => {
        const value = shape.make(`{ ${documented ? "/** Enabled. */" : ""} enabled: true }`);
        const errors = inspectSource({
          path: "scripts/adapters/fixture.ts",
          text: `${value.prefix} ${boundary.make(value.expression)}`,
        });
        if (documented) expect(errors).toEqual([]);
        else expect(errors.some((error) => error.includes("object literal members"))).toBe(true);
      });

test.each([
  "/** Value. */ export const { value } = { value: { enabled: true } };",
  "/** Value. */ export const [value] = [{ enabled: true }];",
  '/** Value. */ export const { ["target"]: value } = { target: { enabled: true } };',
  "/** Value. */ export const { value = { enabled: true } } = { value: undefined };",
  "/** Value. */ export const { value = { enabled: true } } = {};",
  "/** Value. */ const { value } = { value: { enabled: true } }; export default value;",
  "/** Value. */ const { value } = { value: { enabled: true } }; /** Read. */ export function read(): typeof value { return value; }",
  "/** Source. */ const source = { target: { enabled: true } }; /** Shape. */ export type Shape = typeof source.target;",
  "/** Source. */ class Source { static target = { enabled: true }; } /** Shape. */ export type Shape = typeof Source.target;",
  "/** Read. */ function read(input: { enabled: boolean }) {} /** Alias. */ const alias = read; /** Shape. */ export type Shape = typeof alias;",
  "/** Value. */ const value = (input: Result) => input; /** Result. */ interface Result { enabled: boolean } /** Shape. */ export type Shape = typeof value;",
  "/** Value. */ const { value }: { value: { enabled: boolean }; hidden: { secret: boolean } } = external(); export { value };",
  "/** Value. */ const [value]: [{ enabled: boolean }, { secret: boolean }] = external(); export { value };",
])("additional local value/type-query paths reject missing exposed docs: %s", (text) => {
  expect(inspectSource({ path: "scripts/adapters/fixture.ts", text }).length).toBeGreaterThan(0);
});

test.each([
  "/** Value. */ export const { value } = { value: { /** Enabled. */ enabled: true } };",
  "/** Value. */ export const [value] = [{ /** Enabled. */ enabled: true }];",
  "/** Value. */ const { value, hidden } = { value: { /** Enabled. */ enabled: true }, hidden: { secret: true } }; export { value };",
  "/** Value. */ const { value }: { value: { /** Enabled. */ enabled: boolean }; hidden: { secret: boolean } } = external(); export { value };",
  "/** Value. */ const [value]: [{ /** Enabled. */ enabled: boolean }, { secret: boolean }] = external(); export { value };",
  "/** Source. */ const source = { target: { /** Enabled. */ enabled: true }, hidden: { secret: true } }; /** Shape. */ export type Shape = typeof source.target;",
  "/** Source. */ class Source { static target = { /** Enabled. */ enabled: true }; private static hidden = { secret: true }; } /** Shape. */ export type Shape = typeof Source.target;",
  "/** Read. */ function read(input: { /** Enabled. */ enabled: boolean }) {} /** Alias. */ const alias = read; /** Shape. */ export type Shape = typeof alias;",
  "const value = { secret: true }; /** Read. */ export function read(value: { /** Enabled. */ enabled: boolean }): typeof value { return value; }",
  "/** Value. */ const value = { /** Enabled. */ enabled: true }; /** Read. */ export function read<value>(): typeof value { return value; }",
  "const value = { secret: true }; /** API. */ export class API { private value: typeof value; }",
  "const value = { secret: true }; type Internal = typeof value;",
  'import { value } from "external"; /** Shape. */ export type Shape = typeof value;',
  'import * as external from "external"; /** Shape. */ export type Shape = typeof external.value;',
  "/** A. */ const a = b; /** B. */ const b = a; /** Shape. */ export type Shape = typeof a;",
  "/** Value. */ export const { value } = external();",
  "const seed = external(); /** Value. */ export const value = seed[computed];",
  "/** Value. */ export const value = create({ hidden: true });",
])(
  "local resolver preserves shadowing, selected siblings and static-analysis limits: %s",
  (text) => {
    expect(inspectSource({ path: "scripts/adapters/fixture.ts", text })).toEqual([]);
  },
);

test.each([
  '/** Source. */ const source = { target: { enabled: true } }; /** Shape. */ export type Shape = (typeof source)["target"];',
  '/** Source. */ const source = { outer: { target: { enabled: true } } }; /** Shape. */ export type Shape = (typeof source)["outer"]["target"];',
  "/** Read. */ export function read(value = { enabled: true }): typeof value { return value; }",
  "/** Base. */ class Base { /** Value. */ value = { enabled: true }; } /** API. */ export const API = class extends Base {};",
  "/** Base. */ class Base { /** Value. */ value = { enabled: true }; } /** API. */ class API extends Base {} /** Value. */ export const Value = API;",
  "/** Base. */ class Base { static target = { enabled: true }; } /** Source. */ class Source extends Base {} /** Shape. */ export type Shape = typeof Source.target;",
  "/** Value. */ const { hidden, ...value }: { hidden: { secret: boolean }; enabled: boolean } = external(); export { value };",
  "/** Value. */ const [hidden, ...value]: [{ secret: boolean }, { enabled: boolean }] = external(); export { value };",
])("adjacent indexed/scoped/inherited/projected paths reject exposed missing docs: %s", (text) => {
  expect(inspectSource({ path: "scripts/adapters/fixture.ts", text }).length).toBeGreaterThan(0);
});

test.each([
  '/** Source. */ const source = { target: { /** Enabled. */ enabled: true }, hidden: { secret: true } }; /** Shape. */ export type Shape = (typeof source)["target"];',
  '/** Source. */ const source = { outer: { target: { /** Enabled. */ enabled: true }, hidden: { secret: true } } }; /** Shape. */ export type Shape = (typeof source)["outer"]["target"];',
  "const value = { secret: true }; /** Read. */ export function read(value = { /** Enabled. */ enabled: true }): typeof value { return value; }",
  "/** Base. */ class Base { /** Value. */ value = { /** Enabled. */ enabled: true }; private hidden = { secret: true }; } /** API. */ export const API = class extends Base {};",
  "/** Base. */ class Base { /** Value. */ value = { /** Enabled. */ enabled: true }; } /** API. */ class API extends Base {} /** Value. */ export const Value = API;",
  "/** Base. */ class Base { static target = { /** Enabled. */ enabled: true }; private static hidden = { secret: true }; } /** Source. */ class Source extends Base {} /** Shape. */ export type Shape = typeof Source.target;",
  "/** Value. */ const { hidden, ...value }: { hidden: { secret: boolean }; /** Enabled. */ enabled: boolean } = external(); export { value };",
  "/** Value. */ const [hidden, ...value]: [{ secret: boolean }, { /** Enabled. */ enabled: boolean }] = external(); export { value };",
  "/** Value. */ const [value]: readonly [{ /** Enabled. */ enabled: boolean }, { secret: boolean }] = external(); export { value };",
  "/** Value. */ const { picked: { enabled: value } } = { picked: { enabled: true, hidden: { secret: true } } }; export { value };",
])("adjacent paths preserve selected members, scoped values and private exclusions: %s", (text) => {
  expect(inspectSource({ path: "scripts/adapters/fixture.ts", text })).toEqual([]);
});

test.each([
  "/** Container. */ type Container = { value: { enabled: boolean }; hidden: { secret: boolean } }; /** Value. */ const { value }: Container = external(); export { value };",
  "/** Container. */ interface Container { value: { enabled: boolean }; hidden: { secret: boolean } } /** Value. */ const { value }: Container = external(); export { value };",
  "/** Base. */ interface Base { value: { enabled: boolean } } /** Container. */ interface Container extends Base { hidden: { secret: boolean } } /** Value. */ const { value }: Container = external(); export { value };",
])("plain module-local type shapes project destructured bindings: %s", (text) => {
  expect(inspectSource({ path: "scripts/adapters/fixture.ts", text }).length).toBeGreaterThan(0);
});
test.each([
  "/** Container. */ type Container = { value: { /** Enabled. */ enabled: boolean }; hidden: { secret: boolean } }; /** Value. */ const { value }: Container = external(); export { value };",
  "/** Container. */ interface Container { value: { /** Enabled. */ enabled: boolean }; hidden: { secret: boolean } } /** Value. */ const { value }: Container = external(); export { value };",
  "/** Base. */ interface Base { value: { /** Enabled. */ enabled: boolean } } /** Container. */ interface Container extends Base { hidden: { secret: boolean } } /** Value. */ const { value }: Container = external(); export { value };",
  "/** Container. */ interface Container { hidden: { secret: boolean }; /** Enabled. */ enabled: boolean } /** Value. */ const { hidden, ...value }: Container = external(); export { value };",
  "/** A. */ interface A extends B {} /** B. */ interface B extends A {} /** Value. */ const { value }: A = external(); export { value };",
  "interface T { secret: boolean } /** Read. */ export function read<T>(value: T): typeof value { return value; }",
])(
  "plain type shape projection preserves internal siblings and avoids generic inference/cycles: %s",
  (text) => {
    expect(inspectSource({ path: "scripts/adapters/fixture.ts", text })).toEqual([]);
  },
);
