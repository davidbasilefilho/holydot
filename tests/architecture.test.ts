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
