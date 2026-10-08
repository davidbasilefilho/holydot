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
  "/** Options. */ const options: { /** Value. */ value: number } = { value: 1 }; export { options };",
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
