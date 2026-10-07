import { expect, test } from "bun:test";
import { testRender } from "@opentui/solid";
import { SetupEditor, type EditorValues } from "../scripts/ui/setup-editor";
import { DEFAULT_CONFIG } from "../scripts/config";

test("actual OpenTUI/Solid frame supports keyboard choices, Save and cancellation", async () => {
  let saved: EditorValues | undefined;
  let cancelled = false;
  const screen = await testRender(
    () => (
      <SetupEditor
        config={DEFAULT_CONFIG}
        migrated={false}
        error={() => ""}
        onSave={(value) => {
          saved = value;
        }}
        onCancel={() => {
          cancelled = true;
        }}
      />
    ),
    { width: 80, height: 24 },
  );
  try {
    await screen.renderOnce();
    expect(screen.captureCharFrame()).toContain("holydot / setup");
    expect(screen.captureCharFrame()).toContain("gpt-6.1-sol");
    expect(screen.captureCharFrame()).toContain("gpt-6-luna");
    await screen.mockInput.pressKeys(["TAB", "TAB", "TAB", "TAB", "ARROW_RIGHT"]);
    await screen.renderOnce();
    expect(screen.captureCharFrame()).toContain("Fast is opt-in");
    screen.mockInput.pressKey("s", { ctrl: true });
    expect(saved?.speed).toBe("fast");
    expect(saved?.coordinatorModel).toBe("gpt-6.1-sol");
    screen.mockInput.pressEscape();
    await Bun.sleep(100);
    await screen.flush();
    expect(cancelled).toBe(true);
  } finally {
    screen.renderer.destroy();
  }
});

test("small terminals show resize/cancel guidance instead of clipped controls", async () => {
  const screen = await testRender(
    () => (
      <SetupEditor
        config={DEFAULT_CONFIG}
        migrated={true}
        error={() => ""}
        onSave={() => {}}
        onCancel={() => {}}
      />
    ),
    { width: 40, height: 16 },
  );
  try {
    await screen.renderOnce();
    expect(screen.captureCharFrame()).toContain("Resize to at least 48 × 24");
    expect(screen.captureCharFrame()).not.toContain("Coordinator · model");
    screen.resize(80, 30);
    await screen.renderOnce();
    expect(screen.captureCharFrame()).toContain("Legacy settings");
    expect(screen.captureCharFrame()).toContain("Save");
  } finally {
    screen.renderer.destroy();
  }
});
