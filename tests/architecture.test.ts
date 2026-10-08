import { expect, test } from "bun:test";
import { inspectSource } from "../scripts/adapters/architecture";

test("architectural guard rejects native async/try/catch/errors in domain but allows Effect adapters", () => {
  const text =
    "/** Boundary. */ export async function boundary() { try { await new Promise(() => {}); } catch { throw new Error(); } }";
  expect(inspectSource({ path: "scripts/domain.ts", text }).length).toBeGreaterThan(0);
  expect(inspectSource({ path: "scripts/adapters/native.ts", text })).toEqual([]);
  expect(
    inspectSource({
      path: "scripts/main.ts",
      text: "if (import.meta.main) { await Effect.runPromise(program); }",
    }),
  ).toEqual([]);
});

test("public JSDoc is checked for declarations and interface members", () => {
  expect(
    inspectSource({ path: "scripts/domain.ts", text: "export const value = 1;" }),
  ).toHaveLength(1);
  expect(
    inspectSource({
      path: "scripts/domain.ts",
      text: "/** Options. */ export interface Options { value: number }",
    }),
  ).toHaveLength(1);
  expect(
    inspectSource({
      path: "scripts/domain.ts",
      text: "/** Options. */ export interface Options { /** Value. */ value: number }",
    }),
  ).toEqual([]);
});

test.each([
  "/** API. */ export class API { value = 1; }",
  "/** API. */ export class API { static run() {} }",
  "/** API. */ export default class { get value() { return 1; } }",
  "/** API. */ export abstract class API { abstract run(): void; }",
  "/** API. */ export class API { /** Create. */ constructor(public id: string) {} }",
  "/** Options. */ export type Options = { value: number };",
  "/** Options. */ export type Options = { run(): void; [key: string]: unknown };",
  "/** Options. */ export type Options = { /** Nested. */ nested: { child: string } };",
  "/** Options. */ export type Options = { /** Value. */ value: number } | { other: string };",
  "/** Options. */ export interface Options { /** Nested. */ nested: { child: string } }",
])("JSDoc rejects undocumented exposed class/type members: %s", (text) => {
  expect(
    inspectSource({ path: "scripts/adapters/fixture.ts", text }).some(
      (error) => error.includes("members") || error.includes("parameter properties"),
    ),
  ).toBe(true);
});

test.each([
  "/** API. */ export class API { /** Value. */ value = 1; /** Run. */ static run() {} }",
  "/** API. */ export default class { /** Value. */ get value() { return 1; } /** Update. */ set value(next: number) {} }",
  "/** API. */ export abstract class API { /** Run. */ abstract run(): void; }",
  "/** API. */ export class API { /** Create. */ constructor(/** Identity. */ public id: string, private hidden: string) {} }",
  "/** API. */ export class API { private hidden = 1; #secret = 2; static {} }",
  "/** API. */ export class API { /** Run. */ run() { class Local { value = 1; } } }",
  "/** Options. */ export type Options = { /** Value. */ value: number; /** Run. */ run(): void; /** Keys. */ [key: string]: unknown };",
  "/** Options. */ export type Options = { /** Nested. */ nested: { /** Child. */ child: string } };",
  "/** Options. */ export type Options = { /** Value. */ value: number } & { /** Other. */ other: string };",
  "class Local { value = 1; } type LocalOptions = { value: number };",
  "/** Options. */ export type Options = string; type Internal = { value: number };",
])("JSDoc accepts documented API members and ignores private/internal members: %s", (text) => {
  expect(inspectSource({ path: "scripts/adapters/fixture.ts", text })).toEqual([]);
});

test.each([
  "const value = 1; export { value };",
  "export { value as publicValue }; const value = 1;",
  "/** Export list only. */ export { value }; const value = 1;",
  "function run() {} export { run as execute };",
  "/** API. */ class API { value = 1; } export { API };",
  "/** Options. */ type Options = { value: number }; export type { Options };",
  "/** State. */ export enum State { Ready }",
  "/** State. */ enum State { Ready } export { State as PublicState };",
  "/** State. */ enum State { Ready } export default State;",
  "/** API. */ class API { value = 1; } export default API;",
  "/** API. */ export const API = class { value = 1; };",
  "/** Options. */ const options: { value: number } = { value: 1 }; export { options };",
  "export { imported } from './external';",
  "export * from './external';",
])("all local export paths reject undocumented API declarations or members: %s", (text) => {
  expect(inspectSource({ path: "scripts/adapters/fixture.ts", text }).length).toBeGreaterThan(0);
});

test.each([
  "/** Value. */ const value = 1; export { value as publicValue };",
  "export { value }; /** Value. */ const value = 1;",
  "/** Run. */ function run() {} export { run as execute };",
  "/** API. */ class API { /** Value. */ value = 1; private hidden = 2; } export { API };",
  "/** Options. */ type Options = { /** Value. */ value: number }; export type { Options };",
  "/** State. */ export enum State { /** Ready. */ Ready }",
  "/** State. */ enum State { /** Ready. */ Ready } export { State as PublicState };",
  "/** State. */ enum State { /** Ready. */ Ready } export default State;",
  "/** API. */ class API { /** Value. */ value = 1; } export default API;",
  "/** API. */ export const API = class { /** Value. */ value = 1; };",
  "/** Options. */ const options: { /** Value. */ value: number } = { /** Value. */ value: 1 }; export { options };",
  "/** Run. */ export const run = () => { type Internal = { value: string }; };",
  "/** Value. */ const { value } = { value: 1 }; export { value };",
  "/** Public import. */ export { imported } from './external';",
  "/** Public exports. */ export * from './external';",
  "enum Internal { Hidden } type InternalType = { value: number };",
])("all local export paths accept documented API without requiring private details: %s", (text) => {
  expect(inspectSource({ path: "scripts/adapters/fixture.ts", text })).toEqual([]);
});

test.each([
  "/** Read. */ export function read(options: { value: string }) {}",
  "/** Read. */ export function read(): { value: string } { return { value: '' }; }",
  "/** Read. */ function read(options: { value: string }) {} export { read as publicRead };",
  "/** Read. */ function read(): { value: string } { return { value: '' }; } export default read;",
  "/** Read. */ export const read = (options: { value: string }) => options;",
  "/** Read. */ export const read = function(): { value: string } { return { value: '' }; };",
  "/** Read. */ export declare function read({ value }: { value: string }): void;",
  "/** API. */ export class API { /** Read. */ read(): { value: string } { return { value: '' }; } }",
  "/** API. */ export class API { /** Value. */ value: { nested: string } = { nested: '' }; }",
  "/** API. */ export class API { /** Create. */ constructor(options: { value: string }) {} }",
])("public signatures expose inline object members: %s", (text) => {
  expect(
    inspectSource({ path: "scripts/adapters/fixture.ts", text }).some((error) =>
      error.includes("object type members"),
    ),
  ).toBe(true);
});
test.each([
  "/** Read. */ export function read(options: { /** Value. */ value: string }): { /** Value. */ value: string } { return options; }",
  "/** Read. */ function read(options: { /** Value. */ value: string }) {} export { read };",
  "/** Read. */ const read = (options: { /** Value. */ value: string }) => options; export default read;",
  "/** Read. */ export declare function read({ value }: { /** Value. */ value: string }): void;",
  "/** API. */ export class API { /** Read. */ read(): { /** Value. */ value: string } { return { value: '' }; } private hidden(options: { value: string }) {} }",
  "/** Read. */ export function read() { function internal(options: { value: string }) {} type Local = { value: string }; }",
  "function internal(options: { value: string }): { value: string } { return options; }",
])("documented signatures pass and internal signatures stay excluded: %s", (text) => {
  expect(inspectSource({ path: "scripts/adapters/fixture.ts", text })).toEqual([]);
});

test.each([
  "/** Options. */ export const options = { enabled: true };",
  "/** Options. */ const options = { enabled: true }; export { options };",
  "/** Options. */ const options = { enabled: true }; export default options;",
  "/** Options. */ export default { enabled: true };",
  "/** Options. */ export const options = { /** Nested. */ nested: { enabled: true } };",
  "/** Options. */ export const options = { enabled: true } as const;",
  "/** Options. */ export const options = { enabled: true } satisfies Record<string, boolean>;",
  "/** Options. */ export const options = [{ enabled: true }];",
  "/** Internal. */ const internal = { enabled: true }; /** Options. */ export const options = { /** Spread. */ ...internal };",
  "/** Options. */ export const options = { /** Read. */ read(options: { enabled: boolean }) {} };",
])("known exported object literal members require docs across equivalent paths: %s", (text) => {
  expect(
    inspectSource({ path: "scripts/adapters/fixture.ts", text }).some(
      (error) => error.includes("object literal members") || error.includes("object type members"),
    ),
  ).toBe(true);
});
test.each([
  "/** Options. */ export const options = { /** Enabled. */ enabled: true };",
  "/** Options. */ const options = { /** Enabled. */ enabled: true }; export { options };",
  "/** Options. */ export default { /** Enabled. */ enabled: true };",
  "/** Options. */ export const options = { /** Nested. */ nested: { /** Enabled. */ enabled: true } } as const;",
  "/** Options. */ export const options = [{ /** Enabled. */ enabled: true }];",
  "/** Internal. */ const internal = { /** Enabled. */ enabled: true }; /** Options. */ export const options = { /** Spread. */ ...internal };",
  "/** Options. */ export const options = { /** Read. */ read(options: { /** Enabled. */ enabled: boolean }) { const hidden = { secret: true }; } };",
  "const internal = { enabled: true };",
])("documented runtime object members pass, without checking internal bodies: %s", (text) => {
  expect(inspectSource({ path: "scripts/adapters/fixture.ts", text })).toEqual([]);
});

test("named local object export checks only exposed bindings in a shared declaration", () => {
  expect(
    inspectSource({
      path: "scripts/adapters/fixture.ts",
      text: "/** Values. */ const hidden = { secret: true }, value = 1; export { value };",
    }),
  ).toEqual([]);
  expect(
    inspectSource({
      path: "scripts/adapters/fixture.ts",
      text: "/** Values. */ const hidden = { secret: true }, value = { /** Enabled. */ enabled: true }; export { value };",
    }),
  ).toEqual([]);
  expect(
    inspectSource({
      path: "scripts/adapters/fixture.ts",
      text: "/** Values. */ const first = { /** A. */ a: 1 }, second = { missing: true }; export { first, second };",
    }).some((error) => error.includes("object literal members")),
  ).toBe(true);
});

test.each([
  "/** Result. */ interface Result { value: string } /** Read. */ export function read(): Result { return {} as Result; }",
  "/** Result. */ type Result = { value: string }; /** Read. */ export const read = (input: Result) => input;",
  "/** Base. */ interface Base { value: string } /** Result. */ interface Result extends Base {} /** Read. */ export function read(): Result { return {} as Result; }",
  "/** Base. */ type Base = { value: string }; /** Result. */ type Result = Base; /** Read. */ export function read(): Result { return {} as Result; }",
  "/** A. */ interface A { /** B. */ b: B } /** B. */ interface B { value: string; /** A. */ a: A } /** Read. */ export function read(): A { return {} as A; }",
  "/** Base. */ class Base { value = 1; } /** API. */ export class API extends Base {}",
  "/** Result. */ interface Result { value: string } /** API. */ export class API { /** Read. */ read(): Result { return {} as Result; } }",
])("public named local types and inherited members require documentation: %s", (text) => {
  expect(inspectSource({ path: "scripts/adapters/fixture.ts", text }).length).toBeGreaterThan(0);
});

test.each([
  "/** Result. */ interface Result { /** Value. */ value: string } /** Read. */ export function read(): Result { return {} as Result; }",
  "/** Base. */ interface Base { /** Value. */ value: string } /** Result. */ interface Result extends Base {} /** Read. */ export function read(): Result { return {} as Result; }",
  "/** A. */ interface A { /** B. */ b: B } /** B. */ interface B { /** A. */ a: A } /** Read. */ export function read(): A { return {} as A; }",
  "interface T { hidden: string } /** Read. */ export function read<T>(input: T): T { return input; }",
  "interface T { hidden: string } /** API. */ export interface API<T> { /** Value. */ value: T }",
  "interface Hidden { hidden: string } /** Read. */ export function read() { const internal: Hidden = {} as Hidden; }",
  "interface Hidden { hidden: string } /** API. */ export class API { private hidden(): Hidden { return {} as Hidden; } }",
  'import type { Result } from "external"; /** Read. */ export function read(): Result { return {} as Result; }',
])("documented named types pass and generic/internal/external types stay excluded: %s", (text) => {
  expect(inspectSource({ path: "scripts/adapters/fixture.ts", text })).toEqual([]);
});

test.each([
  "/** API. */ export class API { /** Options. */ options = { enabled: true }; }",
  "/** API. */ class API { /** Options. */ options = { enabled: true }; } export { API as PublicAPI };",
  "/** API. */ class API { /** Options. */ options = { enabled: true }; } export default API;",
  "/** API. */ export default class { /** Options. */ options = { enabled: true }; }",
  "/** API. */ export const API = class { /** Options. */ options = { enabled: true }; };",
  "/** API. */ export class API { /** Options. */ static readonly options = { enabled: true }; }",
  "/** API. */ export class API { /** Options. */ public options = { /** Nested. */ nested: { enabled: true } }; }",
  "/** API. */ export class API { /** Options. */ protected options = [{ enabled: true }]; }",
  "/** API. */ export class API { /** Options. */ options = { enabled: true } as const; }",
  "/** API. */ export class API { /** Options. */ options = { enabled: true } satisfies Record<string, boolean>; }",
  "const shared = { enabled: true }; /** API. */ export class API { /** Options. */ options = shared; }",
  "const shared = { enabled: true }; /** API. */ export class API { /** Options. */ options = { /** Shared. */ ...shared }; }",
  "/** Base. */ class Base { /** Options. */ options = { enabled: true }; } /** API. */ export class API extends Base {}",
  "/** API. */ export class API { /** Read. */ read = (options: { enabled: boolean }) => options; }",
  "/** API. */ export class API { /** Child. */ child = class { /** Options. */ options = { enabled: true }; }; }",
])(
  "public class field initializers expose inferred members across equivalent paths: %s",
  (text) => {
    expect(inspectSource({ path: "scripts/adapters/fixture.ts", text }).length).toBeGreaterThan(0);
  },
);

test.each([
  "/** API. */ export class API { /** Options. */ options = { /** Enabled. */ enabled: true }; }",
  "/** API. */ export class API { /** Options. */ static readonly options = [{ /** Enabled. */ enabled: true }]; }",
  "/** API. */ class API { /** Options. */ options = { /** Enabled. */ enabled: true } as const; } export { API };",
  "/** API. */ export default class { /** Options. */ options = { /** Enabled. */ enabled: true }; }",
  "/** API. */ export const API = class { /** Options. */ options = { /** Enabled. */ enabled: true }; };",
  "const shared = { /** Enabled. */ enabled: true }; /** API. */ export class API { /** Options. */ options = { /** Shared. */ ...shared }; }",
  "/** API. */ export class API { private options = { enabled: true }; #hidden = { enabled: true }; private static hidden = [{ enabled: true }]; }",
  "/** API. */ export class API { private read = (options: { enabled: boolean }) => options; }",
  "/** API. */ export class API { /** Read. */ read() { const hidden = { enabled: true }; } static { const hidden = { enabled: true }; } }",
  "class Internal { options = { enabled: true }; }",
  "const shared = { enabled: true }; /** API. */ export class API { private options = shared; }",
  "/** API. */ export class API { /** Child. */ child = class { private options = { enabled: true }; }; }",
])(
  "documented public class initializers pass while private and internal values stay excluded: %s",
  (text) => {
    expect(inspectSource({ path: "scripts/adapters/fixture.ts", text })).toEqual([]);
  },
);

test.each([
  "/** API. */ export namespace Api { export const value = 1; }",
  "/** API. */ export namespace Api { /** Inner. */ export namespace Inner { export const value = 1; } }",
  "/** API. */ namespace Api { export const value = 1; } export { Api };",
  "/** API. */ namespace Api { export const value = 1; } export default Api;",
  "/** API. */ export namespace Api { /** Value. */ export const value = { enabled: true }; }",
  "/** API. */ export namespace Api { /** Options. */ export interface Options { enabled: boolean } }",
])(
  "namespace direct-export traversal rejects undocumented declarations and members: %s",
  (text) => {
    expect(inspectSource({ path: "scripts/adapters/fixture.ts", text }).length).toBeGreaterThan(0);
  },
);
test.each([
  "/** API. */ export namespace Api { /** Value. */ export const value = 1; }",
  "/** API. */ export namespace Api { /** Inner. */ export namespace Inner { /** Value. */ export const value = 1; } }",
  "/** API. */ namespace Api { /** Value. */ export const value = 1; } export { Api };",
  "/** API. */ namespace Api { /** Value. */ export const value = 1; } export default Api;",
  "/** API. */ export namespace Api { /** Value. */ export const value = { /** Enabled. */ enabled: true }; }",
  "/** API. */ export namespace Api { /** Options. */ export interface Options { /** Enabled. */ enabled: boolean } }",
])("documented namespace direct exports already pass: %s", (text) => {
  expect(inspectSource({ path: "scripts/adapters/fixture.ts", text })).toEqual([]);
});
