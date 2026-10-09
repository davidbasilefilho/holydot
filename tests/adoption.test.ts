import { expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import {
  adoptInHost,
  type AdoptionHost,
  type AdoptionItem,
  type AdoptionRequest,
} from "../scripts/adoption";
import { HolydotError } from "../scripts/errors";

// Instrumented host adapters test execution and reconciliation; no real account writes.
const rule = {
  key: "checkpoint",
  content: "Commit/push only authorized repo/work branch after checks.",
};
const task = {
  key: "panorama",
  content:
    "Explicit exact_schedule every 30 minutes; test timezone/destination supplied by caller.",
};
const request: AdoptionRequest = { rules: [rule], task, previous: [] };
function fixture() {
  const calls: string[] = [];
  let source = "";
  const inventory: { rule: AdoptionItem[]; task: AdoptionItem[] } = { rule: [], task: [] };
  const host: AdoptionHost = {
    load: (text) =>
      Effect.sync(() => {
        calls.push("load");
        source = text;
      }),
    readSource: () =>
      Effect.sync(() => {
        calls.push("readSource");
        return source;
      }),
    name: () =>
      Effect.sync(() => {
        calls.push("name");
        return "holydot";
      }),
    inventory: (kind) =>
      Effect.sync(() => {
        calls.push("inventory:" + kind);
        return inventory[kind];
      }),
    ruleForm: (definition) =>
      Effect.sync(() => {
        calls.push("form");
        const item: AdoptionItem = { ...definition, id: "rule-1", state: "saved" };
        inventory.rule.push({ ...item, state: "verified" });
        return item;
      }),
    saveTask: (definition) =>
      Effect.sync(() => {
        calls.push("task");
        const item: AdoptionItem = { ...definition, id: "task-1", state: "saved" };
        inventory.task.push({ ...item, state: "verified" });
        return item;
      }),
    readItem: (kind, id) =>
      Effect.sync(() => {
        calls.push("read:" + kind);
        return inventory[kind].find((item) => item.id === id)!;
      }),
  };
  return { host, calls, inventory };
}

test("new adoption loads/readbacks full source before executing name/form/task and verifies each save", async () => {
  const f = fixture();
  const report = await Effect.runPromise(adoptInHost(request, f.host));
  expect(f.calls).toEqual([
    "load",
    "readSource",
    "name",
    "inventory:rule",
    "form",
    "read:rule",
    "inventory:task",
    "task",
    "read:task",
  ]);
  expect(report.sourceVerified).toBe(true);
  expect(report.nameVerified).toBe(true);
  expect(report.items.map((item) => item.state)).toEqual(["verified", "verified"]);
});

test("resume and existing rules/tasks reload source but do not duplicate saved items", async () => {
  const f = fixture();
  const first = await Effect.runPromise(adoptInHost(request, f.host));
  f.calls.length = 0;
  const second = await Effect.runPromise(
    adoptInHost({ ...request, previous: first.items }, f.host),
  );
  expect(f.calls).toEqual(["load", "readSource", "name", "inventory:rule", "inventory:task"]);
  expect(second.items).toEqual(first.items);
});

test.each(["pending", "cancelled"] as const)(
  "mandatory form %s blocks only that rule and is preserved on resume",
  async (state) => {
    const f = fixture();
    f.host.ruleForm = (definition) =>
      Effect.sync(() => {
        f.calls.push("form");
        return { ...definition, id: "form-1", state };
      });
    const first = await Effect.runPromise(adoptInHost(request, f.host));
    expect(first.items[0]!.state).toBe(state);
    expect(first.items[1]!.state).toBe("verified");
    f.calls.length = 0;
    await Effect.runPromise(adoptInHost({ ...request, previous: first.items }, f.host));
    expect(f.calls).not.toContain("form");
    expect(f.calls).not.toContain("task");
  },
);

test("removed verified rule is not restored; missing/rejected rule tools preserve independent task", async () => {
  const f = fixture();
  const first = await Effect.runPromise(adoptInHost(request, f.host));
  f.inventory.rule.length = 0;
  f.calls.length = 0;
  const second = await Effect.runPromise(
    adoptInHost({ ...request, previous: first.items }, f.host),
  );
  expect(second.items[0]!.state).toBe("removed");
  expect(f.calls).not.toContain("form");
  for (const control of [undefined, () => Effect.fail(new HolydotError({ message: "Denied" }))]) {
    const next = fixture();
    if (control) next.host.ruleForm = control;
    else delete next.host.ruleForm;
    const report = await Effect.runPromise(adoptInHost(request, next.host));
    expect(report.items.map((item) => item.state)).toEqual(["blocked", "verified"]);
  }
});

test("accepted call without saved result is pending; mismatched/failed readback never claims verified", async () => {
  const f = fixture();
  f.host.ruleForm = (definition) =>
    Effect.succeed({ ...definition, id: "accepted", state: "verified" });
  f.host.readItem = () => Effect.fail(new HolydotError({ message: "Readback unavailable" }));
  const report = await Effect.runPromise(adoptInHost(request, f.host));
  expect(report.items.map((item) => item.state)).toEqual(["pending", "saved"]);
});

test("duplicate requested definitions open only one form and save one task", async () => {
  const f = fixture();
  await Effect.runPromise(
    adoptInHost({ ...request, rules: [rule, { ...rule, key: "same-rule" }] }, f.host),
  );
  expect(f.calls.filter((call) => call === "form")).toHaveLength(1);
  expect(f.inventory.rule).toHaveLength(1);
});

test("explicit changed task definition updates existing identifier and reads back without creating a duplicate", async () => {
  const f = fixture();
  const first = await Effect.runPromise(adoptInHost(request, f.host));
  const changed = {
    ...task,
    content: task.content + " Updated authorized notification condition.",
  };
  f.host.saveTask = (definition, id) =>
    Effect.sync(() => {
      expect(id).toBe("task-1");
      const item: AdoptionItem = { ...definition, id: id!, state: "saved" };
      f.inventory.task[0] = { ...item, state: "verified" };
      return item;
    });
  const result = await Effect.runPromise(
    adoptInHost({ ...request, task: changed, previous: first.items }, f.host),
  );
  expect(result.items[1]!.state).toBe("verified");
  expect(f.inventory.task).toHaveLength(1);
  expect(result.items[1]!.content).toBe(changed.content);
});

test("approved source change reloads complete new source on resumed adoption; corrupted or unread source blocks dependent actions", async () => {
  const root = mkdtempSync(join(tmpdir(), "holydot-adoption-"));
  mkdirSync(join(root, "instructions"));
  const text = readFileSync(new URL("../instructions/holydot.md", import.meta.url), "utf8");
  const pin = JSON.parse(
    readFileSync(new URL("../instructions/integrity.json", import.meta.url), "utf8"),
  );
  const path = join(root, "instructions/holydot.md");
  const pinPath = join(root, "instructions/integrity.json");
  try {
    writeFileSync(path, text);
    writeFileSync(pinPath, JSON.stringify(pin));
    const f = fixture();
    const url = pathToFileURL(root + "/");
    const first = await Effect.runPromise(adoptInHost(request, f.host, url));
    const changed = text.replace(
      "### **Checkpoints e persistência remota**",
      "### **Checkpoints e entrega remota**",
    );
    pin.canonicalSHA256 = createHash("sha256").update(changed).digest("hex");
    pin.revision = "2026-10-09.99";
    writeFileSync(path, changed);
    writeFileSync(pinPath, JSON.stringify(pin));
    const resumed = await Effect.runPromise(
      adoptInHost({ ...request, previous: first.items }, f.host, url),
    );
    expect(resumed.identity.revision).toBe("2026-10-09.99");
    expect(resumed.items).toEqual(first.items);
    writeFileSync(path, changed + "invalid");
    f.calls.length = 0;
    expect(Exit.isFailure(await Effect.runPromiseExit(adoptInHost(request, f.host, url)))).toBe(
      true,
    );
    expect(f.calls).toEqual([]);
    const mismatch = fixture();
    mismatch.host.readSource = () => Effect.succeed("digest only");
    expect(Exit.isFailure(await Effect.runPromiseExit(adoptInHost(request, mismatch.host)))).toBe(
      true,
    );
    expect(mismatch.calls).toEqual(["load"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
