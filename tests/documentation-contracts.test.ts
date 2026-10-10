import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test.each(["task", "result"])(
  "%s branch guidance preserves existing conventions before the fallback",
  (name) => {
    const text = readFileSync(new URL(`../templates/${name}.md`, import.meta.url), "utf8");
    const conventions = text.indexOf("siga primeiro as convenções existentes");
    const fallback = text.indexOf("somente como fallback sem convenção aplicável");
    expect(conventions).toBeGreaterThanOrEqual(0);
    expect(fallback).toBeGreaterThan(conventions);
    expect(text).toContain("Não renomeie branches válidas para impor o fallback");
    expect(text).toContain("preserve CI, review, gatilhos e mergeability");
    expect(text).not.toContain("Se existir uma branch sem sufixo, migre-a");
  },
);

test("acceptance cases distinguish repository policy from naming fallback and release triggers", () => {
  const text = readFileSync(new URL("../docs/operational-acceptance.md", import.meta.url), "utf8");
  expect(text).toContain("Existing codebase conventions");
  expect(text).toContain("No applicable convention");
  expect(text).toContain("forcing the fallback or renaming it without a workflow need fails");
  expect(text).toContain(
    "preserve commits, head/base relationships, actual dependencies and mergeability",
  );
  expect(text).toContain("In holydot's existing workflow");
  expect(text).toContain("Other repositories require inspection of their own conventions");
});

test("render documentation identifies the en-US revision without retaining a stale literal digest", () => {
  const docs = ["setup", "usage", "prompt-design"].map((name) =>
    readFileSync(new URL(`../docs/${name}.md`, import.meta.url), "utf8"),
  );
  for (const text of docs) {
    expect(text).toContain("en-US");
    expect(text).toContain("fontes preferidas");
    expect(text).not.toContain("70b8a168767100bb05a36ba65960b942d0e2b7491e6dece4b4e6a2adc11089ea");
  }
  expect(docs[2]).toContain("instructions/integrity.json");
  expect(docs[2]).toContain("não se alega identidade de bytes com uma revisão anterior");
});
