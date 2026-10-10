import { createSignal, For, Show } from "solid-js";
import { useKeyboard, useTerminalDimensions, type JSX } from "@opentui/solid";
import type { HolydotConfig } from "../config";

/** Values from the editor, revalidated before any write. */
export interface EditorValues {
  /** Coordinator host identifier. */
  readonly coordinatorModel: string;
  /** Coordinator reasoning selection. */
  readonly coordinatorEffort: string;
  /** Specialist host identifier. */
  readonly specialistModel: string;
  /** Specialist reasoning selection. */
  readonly specialistEffort: string;
  /** Explicit speed preference. */
  readonly speed: string;
  /** Reporting interval text. */
  readonly interval: string;
  /** Empty means respect environment/default Codex home. */
  readonly codexHome: string;
}
/** Rendering and callback contract for the interactive OpenTUI/Solid editor. */
export interface EditorProps {
  /** Current saved or migrated choices, never reset when editing. */
  readonly config: HolydotConfig;
  /** Whether Save will migrate a legacy file with backup. */
  readonly migrated: boolean;
  /** Latest validated inline error. */
  readonly error: () => string;
  /** Submit values to the Effect adapter for validation. */
  readonly onSave: (values: EditorValues) => void;
  /** Exit without touching settings. */
  readonly onCancel: () => void;
}

/**
 * Interactive preferences editor with keyboard and mouse focus and explicit Save/Cancel.
 *
 * @param props - Initial choices and Effect adapter callbacks.
 * @returns A Solid component tree rendered by OpenTUI, including compact-terminal guidance.
 */
export function SetupEditor(props: EditorProps): JSX.Element {
  const dimensions = useTerminalDimensions();
  const [selected, setSelected] = createSignal(0);
  const [values, setValues] = createSignal<EditorValues>({
    coordinatorModel: props.config.delegation.coordinator.model,
    coordinatorEffort: props.config.delegation.coordinator.effort,
    specialistModel: props.config.delegation.specialist.model,
    specialistEffort: props.config.delegation.specialist.effort,
    speed: props.config.delegation.speed,
    interval: String(props.config.statusUpdates.intervalMinutes),
    codexHome: props.config.codexHome ?? "",
  });
  const fields: ReadonlyArray<{
    key: keyof EditorValues;
    label: string;
    options?: readonly string[];
  }> = [
    { key: "coordinatorModel", label: "Coordinator · model" },
    { key: "coordinatorEffort", label: "Coordinator · effort", options: ["low", "medium", "high"] },
    { key: "specialistModel", label: "Specialists · model" },
    { key: "specialistEffort", label: "Specialists · effort", options: ["low", "medium", "high"] },
    { key: "speed", label: "Speed", options: ["standard", "fast"] },
    { key: "interval", label: "Status · minutes" },
    { key: "codexHome", label: "CODEX_HOME · override" },
  ];
  const move = (step: number) => setSelected((n) => (n + step + 9) % 9);
  const cycle = (step: number) => {
    const field = fields[selected()];
    if (field?.options) {
      const options = field.options;
      const index = options.indexOf(values()[field.key]);
      setValues((v) => ({
        ...v,
        [field.key]: options[(index + step + options.length) % options.length]!,
      }));
    }
  };
  useKeyboard((key) => {
    if (key.name === "escape" || (key.ctrl && key.name === "c")) {
      key.preventDefault();
      props.onCancel();
    } else if (dimensions().width < 48 || dimensions().height < 24) {
      // The resize fallback hides the form; do not edit or submit unseen preferences.
      key.preventDefault();
    } else if (key.name === "tab") {
      key.preventDefault();
      move(key.shift ? -1 : 1);
    } else if (key.name === "up" || key.name === "down") {
      key.preventDefault();
      move(key.name === "up" ? -1 : 1);
    } else if (
      fields[selected()]?.options &&
      ["left", "right", "space", "return"].includes(key.name)
    ) {
      key.preventDefault();
      cycle(key.name === "left" ? -1 : 1);
    } else if (key.ctrl && key.name === "s") {
      key.preventDefault();
      props.onSave(values());
    } else if (key.name === "return" && selected() >= 7) {
      key.preventDefault();
      if (selected() === 7) props.onSave(values());
      else props.onCancel();
    }
  });
  return (
    <box
      flexDirection="column"
      width="100%"
      height="100%"
      backgroundColor="#1e2030"
      padding={1}
      gap={1}
    >
      <text fg="#82aaff">
        <strong>holydot</strong>
        <span> / setup</span>
      </text>
      <Show
        when={dimensions().width >= 48 && dimensions().height >= 24}
        fallback={
          <box flexDirection="column" gap={1}>
            <text fg="#ffc777">Resize to at least 48 × 24 to edit preferences.</text>
            <text fg="#c8d3f5">Esc / Ctrl+C cancels without saving.</text>
          </box>
        }
      >
        <text fg="#a9b1d6">
          {props.migrated
            ? "Legacy settings · Save migrates with a backup."
            : "Local preferences · only Save writes changes."}
        </text>
        <box flexDirection="column" gap={dimensions().height >= 30 ? 1 : 0}>
          <For each={fields}>
            {(field, index) => (
              <box flexDirection="row" height={1} gap={1} onMouseDown={() => setSelected(index())}>
                <text width={25} fg={selected() === index() ? "#82aaff" : "#a9b1d6"}>
                  {selected() === index() ? "› " : "  "}
                  {field.label}
                </text>
                <Show
                  when={field.options}
                  fallback={
                    <input
                      id={field.key}
                      flexGrow={1}
                      value={values()[field.key]}
                      focused={selected() === index()}
                      backgroundColor={selected() === index() ? "#2f334d" : "#222436"}
                      textColor="#c8d3f5"
                      focusedTextColor="#c8d3f5"
                      placeholder={field.key === "codexHome" ? "Environment / ~/.codex" : ""}
                      onInput={(value) => setValues((v) => ({ ...v, [field.key]: value }))}
                      onSubmit={() => move(1)}
                    />
                  }
                >
                  <text
                    flexGrow={1}
                    fg={selected() === index() ? "#c3e88d" : "#c8d3f5"}
                    onMouseDown={() => {
                      setSelected(index());
                      cycle(1);
                    }}
                  >
                    {"‹ "}
                    {values()[field.key]}
                    {" ›"}
                  </text>
                </Show>
              </box>
            )}
          </For>
        </box>
        <text fg="#ffc777">
          {values().speed === "fast"
            ? "Fast is opt-in and may consume more credits."
            : "Standard · host support required for model choices."}
        </text>
        <box flexDirection="row" gap={2}>
          <box
            backgroundColor={selected() === 7 ? "#82aaff" : "#2f334d"}
            paddingLeft={2}
            paddingRight={2}
            onMouseDown={() => props.onSave(values())}
          >
            <text fg={selected() === 7 ? "#1e2030" : "#c8d3f5"}>
              <strong>Save</strong>
            </text>
          </box>
          <box
            backgroundColor={selected() === 8 ? "#82aaff" : "#2f334d"}
            paddingLeft={2}
            paddingRight={2}
            onMouseDown={props.onCancel}
          >
            <text fg={selected() === 8 ? "#1e2030" : "#c8d3f5"}>
              <strong>Cancel</strong>
            </text>
          </box>
        </box>
        <text fg="#ff757f">{props.error()}</text>
        <text fg="#a9b1d6">Tab / ↑↓ focus · ←→ choose · Ctrl+S save · Esc cancel</text>
      </Show>
    </box>
  );
}
