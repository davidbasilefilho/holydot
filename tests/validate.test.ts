import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  REQUIRED_FILES,
  SOURCE_REVISION,
  validatePackage as validateEffect,
} from "../scripts/validate";
import { Effect } from "effect";
const validatePackage = (directory: string) => Effect.runSync(validateEffect(directory));

const directories: string[] = [];

/**
 * Build a complete synthetic package fixture without dependencies or network access.
 *
 * @returns The temporary package root, removed after each test.
 */
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "holydot-test-"));
  directories.push(root);
  for (const file of REQUIRED_FILES) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), "Synthetic test fixture\n");
  }
  writeFileSync(join(root, "LICENSE"), "Apache License\nEND OF TERMS AND CONDITIONS\n");
  return root;
}

afterEach(() => {
  for (const root of directories.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("offline package validation", () => {
  test("public package instructions reflect autonomy, role separation and batched questions", () => {
    const instructions = readFileSync(
      new URL("../instructions/holydot.md", import.meta.url),
      "utf8",
    );
    expect(instructions).toContain("Group related questions into one clear, self-contained batch");
    expect(instructions).toContain("GPT-6.1 Sol with medium effort");
    expect(instructions).toContain("GPT-6 Luna with high effort");
    expect(instructions).toContain("without a rule-mode selector");
    expect(instructions).toContain("An accepted tool call does not prove that the form appeared");
    expect(instructions).toContain("Apache-2.0 license");
  });

  test("adoption uses real rename and readback, preserves profile appearance and qualifies status claims", () => {
    const instructions = readFileSync(
      new URL("../instructions/holydot.md", import.meta.url),
      "utf8",
    );
    const adoption = instructions.split("### **Identity and adoption**")[1]!.split(/\n#{2,3} /)[0]!;
    expect(adoption).toContain("When the owner asks to adopt or install");
    expect(adoption).toContain("cloud_threads.change_orbit_name");
    expect(adoption).toContain("setting **holydot**");
    expect(adoption).toContain("cloud_threads.get_orbit_profile");
    expect(adoption).toContain(
      "Only claim that the name changed if the result confirms **holydot**",
    );
    expect(adoption).toContain("Preserve the current avatar and colors");
    expect(adoption).toContain("Do not change the pet, image, color, or other profile settings");
    expect(adoption).toContain("Distinguish instructions in use from a verified profile name");
    expect(adoption).toContain("If a change or verification fails or is unavailable");
    expect(adoption).toContain("what remains pending, with the next supported step");
    expect(adoption).toContain("does not prove the change");
    expect(adoption).toContain(
      "without asking the user to repeat authorization that is already explicit",
    );
    const status = instructions.split("### **Status updates**")[1]!.split(/\n#{2,3} /)[0]!;
    expect(status).toContain("An interval preference does not create a schedule");
    expect(status).toContain("confirm its configuration before claiming it is active");
    expect(status).toContain("a short message for each still-active project");
    expect(status).toContain("pending verification");
    expect(status).toContain("Respond immediately to status requests");
  });

  test.each([
    {
      file: "templates/task.md",
      required: [
        "branch de trabalho autorizada",
        "gatilhos de workflow inspecionados",
        "Local-only não conclui a persistência remota",
        "controle suportado",
        "não salva regras de conta",
      ],
    },
    {
      file: "templates/result.md",
      required: [
        "SHA remoto verificado",
        "confirmação pendente",
        "Um commit apenas local não conclui a persistência remota",
        "CI da versão entregue",
        "autorização pendente para merge",
      ],
    },
    {
      file: "instructions/specialist.md",
      required: [
        "SHA remoto verificado",
        "gatilhos de workflow",
        "propriedade da integração",
        "não comprova persistência remota",
        "sem supor uma regra de conta permanente",
      ],
    },
    {
      file: "docs/usage.md",
      required: [
        "commit e push",
        "branch de trabalho autorizada",
        "SHA remoto",
        "controle suportado",
        "render não salva nem recria regras de conta",
      ],
    },
    {
      file: "docs/account-rules.md",
      required: [
        "gatilhos de workflow",
        "SHA da referência remota",
        "um commit apenas local não conclui a persistência remota",
        "controles vivos de permissão",
        "não salvam uma regra de conta nem recriam uma regra excluída",
        "formulário real de confirmação do host",
        "não é permissão permanente presumida",
      ],
    },
    {
      file: "docs/setup.md",
      required: [
        "commit/push",
        "SHA remoto",
        "não salva regras de conta nem recria regras excluídas",
        "controle suportado",
      ],
    },
    {
      file: "examples/acceptance.md",
      required: [
        "Checkpoint:",
        "SHA remoto",
        "informar bloqueio",
        "controle de confirmação suportado",
        "não salva nem recria regra de conta",
      ],
    },
  ])("checkpoint contract remains aligned in $file", ({ file, required }) => {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    for (const requirement of required) expect(text).toContain(requirement);
    expect(text).not.toMatch(
      /libfile_|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );
  });

  test.each([
    {
      file: "templates/task.md",
      required: [
        "opções suportadas pesquisadas",
        "Plano coerente e lote",
        "inferir preferências não concede permissão",
        "todas as decisões relacionadas da etapa",
        "PR normal, sem draft",
        "estado e SHA do head",
      ],
    },
    {
      file: "templates/result.md",
      required: [
        "estado normal verificado e SHA do head",
        "Confiança em funcionalidade/qualidade e bloqueios residuais",
        "evidência de testes/CI ao SHA",
        "não autoriza merge",
      ],
    },
    {
      file: "docs/usage.md",
      required: [
        "contexto existente e pesquise opções suportadas",
        "preferências fundamentadas",
        "plano coerente",
        "sem limite pequeno e arbitrário",
        "Inferir uma preferência não concede permissão",
        "PR normal, sem draft",
        "estado normal e SHA do head",
      ],
    },
    {
      file: "docs/policy-index.md",
      required: [
        "Planejamento fundamentado e lotes completos",
        "contexto/pesquisa antes do plano",
        "PR normal com confiança e head verificado",
        "leitura real de estado/head do PR",
      ],
    },
    {
      file: "AGENTS.md",
      required: [
        "normal, non-draft pull requests proactively",
        "confidence in functionality and quality",
        "Verify PR state and head",
        "merge/release/deployment authorization separate",
      ],
    },
  ])("planning and normal PR policy stays aligned in $file", ({ file, required }) => {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    for (const requirement of required) expect(text).toContain(requirement);
    expect(text).not.toMatch(
      /libfile_|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );
  });

  test.each(["templates/task.md", "templates/result.md", "docs/usage.md", "docs/account-rules.md"])(
    "authorization policy references an accessible canonical source in %s",
    (file) => {
      const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      expect(text).toContain("[instructions/holydot.md](../instructions/holydot.md)");
      expect(text).toContain("Continuidade da autorização");
      expect(text).not.toContain("Merge e dev já autorizados no fluxo conhecido");
    },
  );
  test("specialist and release boundaries reuse authorization without expanding it", () => {
    const specialist = readFileSync(
      new URL("../instructions/specialist.md", import.meta.url),
      "utf8",
    );
    expect(specialist).toContain("Recupere a evidência da autorização recebida");
    expect(specialist).toContain("mesmo fluxo e escopo sem reconfirmar etapas rotineiras");
    expect(specialist).toContain("Nunca contorne uma negativa ou confirmação obrigatória");
    const release = readFileSync(new URL("../docs/releases.md", import.meta.url), "utf8");
    expect(release).toContain("Recupere essa evidência antes de pedir novamente");
    expect(release).toContain("adiar apenas estável não revoga dev nem exige reconfirmação");
    expect(release).toContain("tag estável e latest continuam vedados até ordem própria");
    expect(release).toContain("não altere credenciais/OIDC por presumir");
    const acceptance = readFileSync(new URL("../examples/acceptance.md", import.meta.url), "utf8");
    expect(acceptance).toContain(
      "Testes de texto/render comprovam o contrato distribuído, não o enforcement",
    );
  });
  test("general instructions have exactly three peer chapters and retain the approved block", () => {
    const text = readFileSync(new URL("../instructions/holydot.md", import.meta.url), "utf8");
    const chapters = Array.from(text.matchAll(/^## \*\*(.*?)\*\*$/gm), (match) => match[1]);
    expect(chapters).toEqual(["I. Autonomy", "II. Efficiency", "III. Quality and mergeability"]);
    expect(text).toContain("three pillars are chapters without a hierarchy");
    expect(text).toContain("joint criteria");
    expect(text).not.toContain("four objectives");
    expect(text).toContain("Efficiency does not impose cuts to the reasoning, testing, or quality");
    expect(text).toContain("Reuse compatible sessions and subagents");
  });
  test.each([
    [
      "profile read before rename and no-op when already correct",
      "If the name is already holydot, confirm the current state without writing it again",
    ],
    [
      "uncertain rename reconciles before retry",
      "On failure or a conflicting read, record the step and check the state before repeating a write",
    ],
    [
      "mandatory rule form replaces redundant chat approval",
      "that form is the confirmation point. Do not add a redundant chat question beforehand",
    ],
    [
      "pending or cancelled form does not grant authority",
      "A pending or canceled form does not authorize the covered action",
    ],
    [
      "saved rule needs matching readback",
      "Record saved only after host confirmation and verified only after a read that matches the proposal",
    ],
    [
      "deduplicate by actual scope/behavior, preserving unrelated rules",
      "Compare the action, destination, scope, and behavior to identify the corresponding rule",
    ],
    [
      "pending and cancelled proposals are not silently reopened",
      "Do not reopen a pending or canceled proposal on your own initiative",
    ],
    [
      "deleted rule is never automatically restored",
      "Never automatically recreate a deleted rule or restore an old copy",
    ],
    [
      "missing native controls only block the dependent step",
      "Discover actual capabilities, report disabled controls, and continue independent authorized work",
    ],
  ])(
    "host adoption contract (text gate, not account integration): %s",
    (_scenario, requirement) => {
      const text = readFileSync(new URL("../instructions/holydot.md", import.meta.url), "utf8");
      expect(text).toContain(requirement);
      expect(text).toContain("Do not change the pet, image, color, or other profile settings");
      expect(text).toContain(
        "Do not write personal rules, private identifiers, or current permissions into the package",
      );
    },
  );
  test("accepts a complete fixture and its local and external links", () => {
    const root = fixture();
    writeFileSync(
      join(root, "README.md"),
      `[guide](docs/usage.md) [web](https://example.com) [anchor](#start) [source](https://github.com/davidbasilefilho/holycodex/tree/${SOURCE_REVISION})`,
    );
    expect(validatePackage(root)).toEqual([]);
  });

  test("reports absent package directories", () => {
    expect(validatePackage(join(fixture(), "absent"))).toEqual([
      "Package directory does not exist or is not a directory",
    ]);
  });

  for (const file of [
    "templates/task.md",
    "tests/orchestration-policy.test.ts",
    "tests/quality-policy.test.ts",
    "docs/operational-acceptance.md",
  ]) {
    test.each(["missing", "empty", "directory"])(
      `rejects a %s required file: ${file}`,
      (condition) => {
        const root = fixture();
        const path = join(root, file);
        rmSync(path);
        if (condition === "empty") writeFileSync(path, " \n");
        if (condition === "directory") mkdirSync(path);
        expect(validatePackage(root)).toContain(`Missing or empty required file: ${file}`);
      },
    );
  }

  test.each([
    ["[broken](missing.md)", "Broken local link"],
    ["[escape](../outside.md)", "Link escapes package"],
    [
      "[source](https://github.com/davidbasilefilho/holycodex/tree/next)",
      "Unpinned or unexpected source revision",
    ],
  ])("rejects invalid Markdown target %s", (content, expected) => {
    const root = fixture();
    writeFileSync(join(root, "README.md"), content);
    expect(validatePackage(root).some((error) => error.startsWith(expected))).toBe(true);
  });

  test("rejects links following a symlink outside the package", () => {
    const root = fixture();
    const outside = fixture();
    symlinkSync(join(outside, "README.md"), join(root, "external.md"));
    writeFileSync(join(root, "README.md"), "[outside](external.md)");
    expect(
      validatePackage(root).some((error) => error.startsWith("Link resolves outside package")),
    ).toBe(true);
  });

  test("rejects incomplete license markers", () => {
    const root = fixture();
    writeFileSync(join(root, "LICENSE"), "Apache License");
    expect(validatePackage(root)).toContain("Expected complete Apache-2.0 license markers");
  });

  test("ignores dependency and build Markdown", () => {
    const root = fixture();
    for (const name of [".git", "node_modules", "dist"]) {
      mkdirSync(join(root, name));
      writeFileSync(join(root, name, "README.md"), "[bad](missing.md)");
    }
    expect(validatePackage(root)).toEqual([]);
  });

  test("does not mutate inspected content", () => {
    const root = fixture();
    const before = readFileSync(join(root, "README.md"), "utf8");
    validatePackage(root);
    expect(readFileSync(join(root, "README.md"), "utf8")).toBe(before);
  });
});
