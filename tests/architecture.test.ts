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
