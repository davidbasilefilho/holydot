import { expect, test } from "bun:test";
import { Effect } from "effect";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../scripts/cli";

// These verify the distributed decision contract, not a host scheduler or model behavior.
test.each([
  [
    "independent projects",
    [
      "Mantenha por projeto um contexto recuperável",
      "não crie duplicata",
      "preserve os demais trabalhos",
    ],
  ],
  [
    "12 minutes warm",
    [
      "menos de 20 minutos desde sua última atividade efetiva observada",
      "há 12 minutos",
      "Reutilizar como warm",
    ],
  ],
  [
    "20/21 minutes cold",
    [
      "há 20 minutos ou 21 minutos",
      "Tratar como candidata cold",
      "sem descartar contexto arbitrariamente",
    ],
  ],
  [
    "busy session",
    ["Enfileirar quando suportado", "nunca sobrescrever silenciosamente trabalho ocupado"],
  ],
  [
    "incompatible session",
    [
      "projeto, repositório, ambiente, papel/contexto, branch/worktree",
      "Frescor não supera incompatibilidade",
      "serializar ou isolar conflitos antes de escrever",
    ],
  ],
  [
    "missing controls",
    [
      "não classificar como warm sem evidência nem alegar sessão retomada",
      "não garante prompt caching, cobrança reduzida ou retenção",
    ],
  ],
  [
    "capability selection",
    [
      "subagentes nativos do dot > Codex Cloud > Codex em máquinas do usuário",
      "inclusive engenharia de software, implementação, testes e revisão",
      "insuficiência comprovada do anterior ou escolha explícita do usuário",
      "não crie configuração concorrente nem finja sincronização ausente",
    ],
  ],
  [
    "idempotent recovery",
    [
      "releia estado atual, fonte íntegra e checkpoints",
      "não recrie tarefas nem sobrescreva alterações posteriores com notas antigas",
    ],
  ],
])("full render/resume preserves orchestration decision: %s", async (_, phrases) => {
  const root = mkdtempSync(join(tmpdir(), "holydot-orchestration-"));
  try {
    await Effect.runPromise(runCli(["setup"], root, (config) => Effect.succeed(config)));
    const before = readFileSync(join(root, "holydot.config.json"));
    for (const command of ["render", "resume"]) {
      const output = await Effect.runPromise(
        runCli([command], root, () => Effect.die("prompt forbidden")),
      );
      for (const phrase of phrases) expect(output).toContain(phrase);
      expect(output).not.toContain("sem hierarquia rígida de ferramentas");
      expect(output).not.toContain("Use Codex/HolyCodex para engenharia de software");
    }
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test.each(["task", "result"])(
  "%s contract references accessible canonical policy without duplicating it",
  (name) => {
    const text = readFileSync(new URL(`../templates/${name}.md`, import.meta.url), "utf8");
    expect(text).toContain("[instructions/holydot.md](../instructions/holydot.md)");
    expect(text).toContain("uma referência inacessível não substitui a leitura");
    expect(text).toContain("última atividade efetiva observada");
    expect(text).not.toContain("## **Continuidade da autorização**");
    expect(text).not.toContain("Merge e dev já autorizados no fluxo conhecido");
  },
);

test("public routing guides and busy-task acceptance match canonical selection", () => {
  const guide = readFileSync(new URL("../docs/adaptation.md", import.meta.url), "utf8");
  expect(guide).toContain("subagentes nativos do dot > Codex Cloud > Codex em máquinas do usuário");
  expect(guide).toContain("insuficiência comprovada do anterior ou escolha explícita do usuário");
  expect(guide).not.toContain("sem hierarquia rígida");
  const acceptance = readFileSync(
    new URL("../docs/operational-acceptance.md", import.meta.url),
    "utf8",
  );
  expect(acceptance).toContain("relacionado/equivalente");
  expect(acceptance).toContain("continue a atribuição existente");
  expect(acceptance).toContain("se independente, enfileire");
});

// Delivery regressions for the policy, not a scheduler or provider billing/intent evaluation.
test.each([
  [
    "native engineering before warm cloud",
    [
      "O dot e seus subagentes nativos podem usar apps conectados",
      "computador cloud do dot e uma sessão Codex Cloud são recursos diferentes",
      "não justificam por si sós abrir Codex Cloud",
      "não use ausência de ferramenta no coordenador como prova de ausência no executor",
      "uma sessão warm em nível inferior não supera um subagente nativo suficiente",
    ],
  ],
  [
    "verified tier escalation and cost limits",
    [
      "registre a capacidade, ferramenta, arquivo, runtime ou ambiente realmente necessário",
      "Reuso e cache são otimizações dentro do nível adequado",
      "sem alegar gratuidade de subagentes nativos, quota, cobrança reduzida ou economia não verificadas",
      "Máquinas do usuário são o último nível",
      "não há proibição absoluta desses recursos",
    ],
  ],
  [
    "routing checklist rejects unnecessary Codex delegation",
    [
      "### **Checklist antes de delegar**",
      "Se houver escolha explícita de ambiente, avalie-a primeiro",
      "Sem escolha explícita de outro ambiente, confira se subagentes nativos",
      "pesquisa, navegação, implementação, testes e revisão exigidos",
      "Se atendem, atribua no nível nativo e encerre a seleção de ambiente",
      "Somente se o nível nativo for insuficiente",
      "Somente se os níveis cloud forem insuficientes",
      "não são evidências de insuficiência",
      "não invente sua ausência para escalar",
    ],
  ],
  [
    "routine setup reuses bounded authority",
    [
      "Um pedido de configurar uma CLI ou ambiente de desenvolvimento autoriza as etapas rotineiras necessárias daquele objetivo e destino",
      "Não peça aprovação de cada comando, tentativa segura ou detalhe reversível já coberto",
      "Alternativas equivalentes no mesmo destino/escopo e repetições permitidas conservam essa autoridade",
      "um registro recuperável da autorização",
      "ele referencia evidência e não cria permissão",
      "Não exporte esse registro privado no pacote",
    ],
  ],
  [
    "configuration never waives credential and security gates",
    [
      "criar ou ampliar acesso persistente, conceder credenciais/OAuth, mudar segurança ou transmitir segredos",
      "peça somente a confirmação específica exigida pelo host",
      "Uma aprovação ampla de configuração não substitui a confirmação por ação nem o handoff quando obrigatórios",
      "Configuração exige novo grant OAuth, credencial persistente ou mudança de segurança",
      "Alternativa muda destino, dados transmitidos ou compromisso material",
    ],
  ],
  [
    "explicit owner stop",
    [
      "Trate uma ordem de parada como prioridade imediata",
      "Interrompa novas ações e atribuições no escopo pedido",
      "mantenha os demais trabalhos pausados",
    ],
  ],
  [
    "tool cancellation is not owner intent or permission",
    [
      "`user cancelled`",
      "cancelamento automático de revisão de aprovação",
      "não comprova uma ordem de cancelamento do usuário",
      "Confira a origem do evento",
      "Ausência de ordem de parada também não concede uma aprovação que falta",
    ],
  ],
  [
    "confirmed outcome before bounded retry",
    [
      "Inspecione resultado, identificador, artefatos e estado remoto",
      "Se o efeito já ocorreu, confirme-o e continue a partir dele",
      "Se o resultado de uma escrita for incerto, não repita às cegas",
      "interrupção técnica comprovada sem efeito permite no máximo uma nova tentativa da mesma ação e destino",
      "apenas quando a autorização continua válida e a política do host permite",
      "sem loop de tentativas",
    ],
  ],
  [
    "safety floor and independent work",
    [
      "Negativa real de acesso ou aprovação, bloqueio de segurança",
      "formulário obrigatório pendente/cancelado",
      "Não troque ferramenta, conta ou ambiente para contornar o bloqueio",
      "nem use esta recuperação para recriar regras canceladas",
      "Continue trabalho independente autorizado",
      "não peça confirmação redundante por uma mensagem transitória",
      "respeite sempre o piso de segurança do host",
    ],
  ],
])("render/resume preserves execution priority and safe recovery: %s", async (_, phrases) => {
  const root = mkdtempSync(join(tmpdir(), "holydot-priority-"));
  try {
    await Effect.runPromise(runCli(["setup"], root, (config) => Effect.succeed(config)));
    const before = readFileSync(join(root, "holydot.config.json"));
    const literal = readFileSync(new URL("./fixtures/approved-communication.md", import.meta.url));
    for (const command of ["render", "resume"]) {
      const output = await Effect.runPromise(
        runCli([command], root, () => Effect.die("prompt forbidden")),
      );
      for (const phrase of phrases) expect(output).toContain(phrase);
      const bytes = Buffer.from(output);
      const offset = bytes.indexOf(literal);
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(bytes.subarray(offset, offset + literal.length)).toEqual(literal);
      expect(bytes.indexOf(literal, offset + literal.length)).toBe(-1);
    }
    expect(readFileSync(join(root, "holydot.config.json"))).toEqual(before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test.each(["docs/adaptation.md", "docs/usage.md"])(
  "%s keeps strict fallback priority and cache within the chosen tier",
  (file) => {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    expect(text).toContain(
      "subagentes nativos do dot > Codex Cloud > Codex em máquinas do usuário",
    );
    expect(text).toContain("insuficiência comprovada do anterior ou escolha explícita do usuário");
    expect(text).toContain("Reuso/cache fica dentro do nível adequado e não inverte essa ordem");
    expect(text).not.toMatch(/sem (?:hierarquia|ordem) rígida/);
  },
);

test("acceptance scenarios reject unintended escalation and unsafe cancellation recovery", () => {
  const text = readFileSync(new URL("../docs/operational-acceptance.md", import.meta.url), "utf8");
  for (const phrase of [
    "permanecer no nível nativo",
    "registrar a insuficiência comprovada e usar Codex Cloud",
    "Escolha explícita do usuário",
    "Ordem explícita de parada do usuário",
    "no máximo uma repetição autorizada e permitida da mesma ação",
    "repetir escrita incerta",
    "formulário obrigatório cancelado/pendente ou bloqueio de segurança",
    "silêncio e tempo decorrido não são aprovação",
    "Não simulam um escalonador",
  ])
    expect(text).toContain(phrase);
});

test("nested HolyCodex is conditional and never justifies native-tier escalation", () => {
  const source = readFileSync(new URL("../instructions/holydot.md", import.meta.url), "utf8");
  expect(source).toContain("A possibilidade de instalá-la não justifica escalada");
  const guide = readFileSync(new URL("../docs/adaptation.md", import.meta.url), "utf8");
  for (const phrase of [
    "opção condicional",
    "não é motivo para escalar quando os recursos nativos do dot bastam",
    "Linux x64 com glibc",
    "Node >=18, dependências opcionais e scripts de instalação",
    "não comprova pacote publicado",
    "não suporta device-code login",
    "não adota silenciosamente as credenciais do Codex oficial",
    "execução em Codex Cloud como não verificada",
    "instalação não substitui o orquestrador gerenciado",
    "Alegações de economia ou desempenho exigem medição",
  ])
    expect(guide).toContain(phrase);
});
