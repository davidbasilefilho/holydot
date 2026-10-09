import { Effect } from "effect";
import { loadInstructionSource, type InstructionIdentity } from "./adapters/instructions";
import { HolydotError } from "./errors";

/** Host-observed state; form acceptance and saved/readback are different states. */
export type AdoptionState = "pending" | "cancelled" | "saved" | "verified" | "removed" | "blocked";

/** Exact user-authorized definition, including actual destination and scheduling context. */
export interface AdoptionDefinition {
  /** Stable caller-owned checkpoint key, not an account permission. */
  key: string;
  /** Complete definition from authorized context; never inferred from a recipe name. */
  content: string;
}

/** State returned by a real host read or required form. */
export interface AdoptionItem extends AdoptionDefinition {
  /** Real host item/form identifier, absent when no item exists. */
  id?: string;
  /** Observed lifecycle state, never inferred from an accepted tool call. */
  state: AdoptionState;
}

/** Explicit adoption intent; no account data or personal defaults are bundled. */
export interface AdoptionRequest {
  /** Exact rule proposals authorized for this instance. */
  rules: readonly AdoptionDefinition[];
  /** Exact task definition, including mode, cadence, timezone and destination. */
  task?: AdoptionDefinition;
  /** Previous observed results used to preserve cancellation and removal on resume. */
  previous: readonly AdoptionItem[];
}

/** Real host integration boundary. Missing controls block only their own step. */
export interface AdoptionHost {
  /** Load complete verified instructions before any setup action. */
  load: (text: string, identity: InstructionIdentity) => Effect.Effect<void, HolydotError>;
  /** Read back the actual source available to the receiver, not a repeated checksum. */
  readSource: () => Effect.Effect<string, HolydotError>;
  /** Set only the dot name, preserving appearance; return actual name readback. */
  name?: () => Effect.Effect<string, HolydotError>;
  /** List and read current items, with complete content and observed states. */
  inventory?: (kind: "rule" | "task") => Effect.Effect<readonly AdoptionItem[], HolydotError>;
  /** Open the mandatory rule form, without synthesizing user acceptance. */
  ruleForm?: (
    definition: AdoptionDefinition,
    existingId?: string,
  ) => Effect.Effect<AdoptionItem, HolydotError>;
  /** Create/update the exact task using its supported host scheduling mode. */
  saveTask?: (
    definition: AdoptionDefinition,
    existingId?: string,
  ) => Effect.Effect<AdoptionItem, HolydotError>;
  /** Read saved state/content by real identifier after a save result. */
  readItem?: (kind: "rule" | "task", id: string) => Effect.Effect<AdoptionItem, HolydotError>;
}

/** Adoption report separates source/name and each independently blocked account step. */
export interface AdoptionReport {
  /** Identity of the source actually loaded and read back. */
  identity: InstructionIdentity;
  /** True only after exact source readback. */
  sourceVerified: boolean;
  /** True only after name readback equals holydot. */
  nameVerified: boolean;
  /** Per-item outcomes; pending/cancelled are preserved across retries. */
  items: AdoptionItem[];
}

/**
 * Execute explicit new-instance adoption through supplied real host controls. Re-read source on
 * every initial/resumed invocation, then reconcile exact definitions. Missing account tools never
 * prevent independent name or other item steps. A previous verified item missing from inventory is
 * removed, not silently restored. Callers must retain the returned checkpoint and reauthorize
 * changes after cancellation/removal.
 *
 * @param request - Complete current authorized intent and previous observed checkpoint.
 * @param host - Host-native tools; test adapters do not prove real account adoption.
 * @param packageRoot - Installed source root, overridable for isolated validation.
 * @returns Source identity, actual name verification and individual observed outcomes.
 */
export function adoptInHost(
  request: AdoptionRequest,
  host: AdoptionHost,
  packageRoot = new URL("../", import.meta.url),
) {
  return Effect.gen(function* () {
    const source = yield* loadInstructionSource(packageRoot);
    yield* host.load(source.text, source.identity);
    if ((yield* host.readSource()) !== source.text)
      return yield* Effect.fail(
        new HolydotError({ message: "Host instruction readback differs." }),
      );
    const name = host.name ? yield* host.name().pipe(Effect.orElseSucceed(() => "")) : "";
    const report: AdoptionReport = {
      identity: source.identity,
      sourceVerified: true,
      nameVerified: name === "holydot",
      items: [],
    };
    for (const kind of ["rule", "task"] as const) {
      const reconciled = new Map<string, AdoptionItem>();
      const definitions = kind === "rule" ? request.rules : request.task ? [request.task] : [];
      const inventory = host.inventory
        ? yield* host.inventory(kind).pipe(Effect.orElseSucceed(() => null))
        : null;
      for (const definition of definitions) {
        const repeated = reconciled.get(definition.content);
        if (repeated) {
          report.items.push({ ...repeated, key: definition.key });
          continue;
        }
        const result = yield* Effect.gen(function* () {
          const prior = request.previous.find((item) => item.key === definition.key);
          const existing = inventory?.find((item) => item.content === definition.content);
          if (existing) return { ...existing, key: definition.key };
          if (prior && ["pending", "cancelled", "removed"].includes(prior.state)) return prior;
          if (
            inventory &&
            prior?.state === "verified" &&
            !inventory.some((item) => item.id === prior.id || item.key === prior.key)
          )
            return { ...prior, state: "removed" as const };
          const create = kind === "rule" ? host.ruleForm : host.saveTask;
          if (!inventory || !create || !host.readItem || !definition.content.trim())
            return { ...definition, state: "blocked" as const };
          const created = yield* create(
            definition,
            inventory.find((item) => item.key === definition.key)?.id,
          );
          if (created.state !== "saved" || !created.id)
            return {
              ...definition,
              ...(created.id ? { id: created.id } : {}),
              state: created.state === "cancelled" ? ("cancelled" as const) : ("pending" as const),
            };
          const read = yield* host
            .readItem(kind, created.id)
            .pipe(Effect.orElseSucceed(() => created));
          return {
            ...definition,
            id: created.id,
            state:
              read.id === created.id &&
              read.content === definition.content &&
              read.state === "verified"
                ? ("verified" as const)
                : ("saved" as const),
          };
        }).pipe(Effect.orElseSucceed(() => ({ ...definition, state: "blocked" as const })));
        report.items.push(result);
        reconciled.set(definition.content, result);
      }
    }
    return report;
  });
}
