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
    expect(instructions).toContain("Agrupe perguntas relacionadas em um único lote");
    expect(instructions).toContain("GPT-6.1 Sol com esforço medium");
    expect(instructions).toContain("GPT-6 Luna com esforço high");
    expect(instructions).toContain("sem seletor rule-mode");
    expect(instructions).toContain(
      "Uma chamada aceita pela ferramenta não comprova que o formulário apareceu",
    );
    expect(instructions).toContain("licença Apache-2.0");
  });

  test("adoption uses real rename and readback, preserves profile appearance and qualifies status claims", () => {
    const instructions = readFileSync(
      new URL("../instructions/holydot.md", import.meta.url),
      "utf8",
    );
    const adoption = instructions.split("### **Identidade e adoção**")[1]!.split(/\n#{2,3} /)[0]!;
    expect(adoption).toContain("Quando o dono pedir para adotar ou instalar");
    expect(adoption).toContain("cloud_threads.change_orbit_name");
    expect(adoption).toContain("definindo **holydot**");
    expect(adoption).toContain("cloud_threads.get_orbit_profile");
    expect(adoption).toContain("Só afirme que o nome mudou se o resultado confirmar **holydot**");
    expect(adoption).toContain("Preserve o avatar e as cores atuais");
    expect(adoption).toContain("Não altere pet, imagem, cor, nem outras configurações do perfil");
    expect(adoption).toContain("Diferencie instruções em uso de nome de perfil verificado");
    expect(adoption).toContain("Se a alteração ou a verificação falhar ou não estiver disponível");
    expect(adoption).toContain("o que continua pendente, com o próximo passo suportado");
    expect(adoption).toContain("não comprova a mudança");
    expect(adoption).toContain("sem pedir que o usuário repita uma autorização já explícita");
    const status = instructions.split("### **Atualizações de status**")[1]!.split(/\n#{2,3} /)[0]!;
    expect(status).toContain("Uma preferência de intervalo não cria um agendamento");
    expect(status).toContain("confirme sua configuração antes de afirmar que está ativo");
    expect(status).toContain("uma mensagem curta por projeto ainda ativo");
    expect(status).toContain("verificação pendente");
    expect(status).toContain("Responda imediatamente a pedidos de status");
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

  test.each(["docs/usage.md", "docs/account-rules.md"])(
    "authorization continuity stays aligned in %s",
    (file) => {
      const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
      for (const requirement of [
        "autorização já dada ao mesmo fluxo e escopo",
        "descrição do PR com SHA, evidências e limitações",
        "Merge e dev já autorizados no fluxo conhecido",
        "tag estável e latest vedados até ordem própria",
        "mudança material de destino, dados, escopo, risco ou compromisso",
        "retomada suportada antes de repetir a pergunta",
        "nunca contorne uma negativa ou confirmação obrigatória",
        "Política renderizada não concede permissões",
        "autoridade real do host, sem decidir por palavras-chave",
      ])
        expect(text).toContain(requirement);
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
    expect(chapters).toEqual(["I. Autonomia", "II. Eficiência", "III. Qualidade e mergeability"]);
    expect(text).toContain("três pilares são capítulos sem hierarquia");
    expect(text).toContain("critérios conjuntos");
    expect(text).not.toContain("quatro objetivos");
    expect(text).toContain("Eficiência não impõe cortes de raciocínio, testes ou qualidade");
    expect(text).toContain("Reutilize sessões e subagentes compatíveis");
  });
  test.each([
    [
      "profile read before rename and no-op when already correct",
      "Se o nome já for holydot, confirme o estado atual sem gravar novamente",
    ],
    [
      "uncertain rename reconciles before retry",
      "Quando houver falha ou leitura divergente, registre a etapa e confira o estado antes de repetir uma gravação",
    ],
    [
      "mandatory rule form replaces redundant chat approval",
      "esse formulário é o ponto de confirmação. Não acrescente uma pergunta de chat redundante antes",
    ],
    [
      "pending or cancelled form does not grant authority",
      "Formulário pendente ou cancelado não autoriza a ação coberta",
    ],
    [
      "saved rule needs matching readback",
      "Só registre salva após confirmação do host e verificada após leitura que corresponda à proposta",
    ],
    [
      "deduplicate by actual scope/behavior, preserving unrelated rules",
      "Compare ação, destino, escopo e comportamento para identificar a regra correspondente",
    ],
    [
      "pending and cancelled proposals are not silently reopened",
      "Não reabra uma proposta pendente nem uma cancelada por iniciativa própria",
    ],
    [
      "deleted rule is never automatically restored",
      "Nunca recrie automaticamente uma regra excluída nem restaure uma cópia antiga",
    ],
    [
      "missing native controls only block the dependent step",
      "Descubra capacidades reais, relate controles desabilitados e mantenha trabalho independente autorizado",
    ],
  ])(
    "host adoption contract (text gate, not account integration): %s",
    (_scenario, requirement) => {
      const text = readFileSync(new URL("../instructions/holydot.md", import.meta.url), "utf8");
      expect(text).toContain(requirement);
      expect(text).toContain("Não altere pet, imagem, cor, nem outras configurações do perfil");
      expect(text).toContain(
        "Não grave regras pessoais, identificadores privados ou permissões atuais no pacote",
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

  test.each(["missing", "empty", "directory"])("rejects a %s required file", (condition) => {
    const root = fixture();
    const path = join(root, "templates/task.md");
    rmSync(path);
    if (condition === "empty") writeFileSync(path, " \n");
    if (condition === "directory") mkdirSync(path);
    expect(validatePackage(root)).toContain("Missing or empty required file: templates/task.md");
  });

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
