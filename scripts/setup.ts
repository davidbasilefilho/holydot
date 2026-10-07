/** Owner-selected confirmation style for one scoped rule proposal. */
export type RuleMode = "ask" | "requested";

/** Explicit onboarding choices; null means the host must ask before proposing a rule. */
export interface RuleScope {
  /** Exact owner/repository identifier, never a wildcard audience. */
  repository: string | null;
  /** Exact authorized working branch, not a merge or deployment target. */
  branch: string | null;
  /** Ask each time, or proceed only when the owner requests the scoped work. */
  mode: RuleMode | null;
}

/** Safe setup defaults: no project, branch or autonomy choice is inferred. */
export const DEFAULT_RULE_SCOPE: RuleScope = { repository: null, branch: null, mode: null };

/**
 * Validate explicit owner choices without granting any account permission.
 *
 * @param value - Parsed account-rule proposal configuration.
 * @returns A fresh, bounded rule scope.
 * @throws If fields, identifiers or confirmation mode are unsupported.
 */
export function parseRuleScope(value: unknown): RuleScope {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== 3 ||
    !Object.hasOwn(value, "repository") ||
    !Object.hasOwn(value, "branch") ||
    !Object.hasOwn(value, "mode")
  ) {
    throw new Error(
      "accountRules requires only repository, branch and mode; use null for missing choices.",
    );
  }
  const record = value as Record<string, unknown>;
  const { repository, branch, mode } = record;
  if (
    repository !== null &&
    (typeof repository !== "string" ||
      repository.length > 80 ||
      !/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(repository))
  ) {
    throw new Error(
      "Repository must be an exact owner/repository identifier of at most 80 characters.",
    );
  }
  if (
    branch !== null &&
    (typeof branch !== "string" ||
      branch.length > 60 ||
      !/^[A-Za-z0-9](?:[A-Za-z0-9._/-]*[A-Za-z0-9])?$/.test(branch) ||
      branch.includes("..") ||
      branch.includes("//") ||
      branch.endsWith(".lock"))
  ) {
    throw new Error(
      "Branch must be an exact simple branch name of 1 to 60 characters, without wildcards or traversal.",
    );
  }
  if (mode !== null && mode !== "ask" && mode !== "requested") {
    throw new Error("Rule mode must be ask or requested; null means the owner has not chosen.");
  }
  return { repository, branch, mode };
}

/**
 * Build a generic, owner-scoped proposal only when every required choice is present.
 *
 * @param input - Owner choices, validated before interpolation.
 * @returns Proposal text, or null while decisions are missing; never a saved account rule.
 */
export function createRuleProposal(input: RuleScope): string | null {
  const { repository, branch, mode } = parseRuleScope(input);
  if (repository === null || branch === null || mode === null) return null;
  const action =
    mode === "ask"
      ? "Peça aprovação antes de corrigir, testar ou publicar correções"
      : "Quando eu pedir trabalho, permita corrigir, testar e publicar correções de baixo risco sem repetir aprovação";
  return (
    `${action} em ${repository}, somente na branch ${branch} e via PR. ` +
    "Não autoriza merge, deploy, gastos, novos acessos ou dados sensíveis. " +
    "No meu computador, antes de disparar UAC no Windows, sudo/pkexec no Linux ou elevação equivalente, verifique se já dei aprovação informada para essa mesma ação, dispositivo e escopo; se sim, não pergunte de novo. Se não, explique o comando, o escopo e o motivo, peça aprovação específica e espere minha resposta antes do prompt. " +
    "A aprovação genérica para baixar ou executar uma tarefa não cobre elevação, a menos que a ação elevada tenha sido informada e incluída no pedido. Peça nova autorização se ação, dispositivo, escopo ou risco mudar materialmente, ou se o host exigir confirmação naquele momento. Se um prompt inesperado ou diferente do autorizado surgir, não o aceite nem digite credenciais; pause e siga os controles do host. Nunca peça senha no chat nem contorne os controles. Esta exigência é para meu computador e não cria uma proibição geral para o cloud do dot. " +
    "Respeite as confirmações obrigatórias do produto."
  );
}

/**
 * Generate one complete host-assisted onboarding handoff, including account-rule proposals.
 *
 * @param instructions - Complete rendered holydot policies and selected delegation preferences.
 * @param input - Explicit project/branch/confirmation choices or safe null defaults.
 * @returns A prepared needs-input/needs-host plan; it does not contact or mutate an account.
 */
export function renderSetup(instructions: string, input: RuleScope): string {
  const scope = parseRuleScope(input);
  const proposal = createRuleProposal(scope);
  const state = proposal === null ? "needs-input" : "needs-host";
  const decisions = [
    `Repositório: ${scope.repository ?? "não informado"}`,
    `Branch de trabalho: ${scope.branch ?? "não informada"}`,
    `Modo de confirmação: ${scope.mode ?? "não escolhido"}`,
  ].join("\n- ");
  return (
    `${instructions.trim()}\n\n# Setup guiado de regras da conta\n\n` +
    `Estado deste plano local: ${state}. Regras aplicadas pelo CLI: nenhuma.\n\n- ${decisions}\n\n` +
    "Ao receber este plano em uma solicitação de setup do dono, conduza o fluxo abaixo proativamente. " +
    "Não peça que ele copie cada regra manualmente quando o ambiente puder apresentar os controles reais.\n\n" +
    "1. Se faltarem projeto, branch ou escolha de confirmação, use primeiro o controle dedicado quando a plataforma exigir aprovação, autenticação ou decisão de conta. " +
    "Nas demais perguntas, prefira a ferramenta estruturada permitida e respeite os tipos aceitos; se não houver uma ferramenta adequada, use outra interação suportada mais legível. " +
    "Texto comum é o último recurso. Não infira escopo amplo ou autorização pelo download/leitura do pacote.\n" +
    "2. Verifique se há um gerenciador real de regras da conta, autenticado e apropriado. " +
    "Se não houver, informe bloqueado: nenhuma regra aplicada. Não invente API, formulário ou sucesso.\n" +
    "3. Leia as regras atuais pelos controles suportados. Compare escopo e comportamento para evitar duplicatas; " +
    "uma regra já correspondente deve ser verificada, não recriada. Preserve regras fora do escopo.\n" +
    "4. Verifique limites de tamanho e formatos aceitos pelo host. Se o texto não couber, prepare uma versão concisa que preserve escopo e significado ou, se necessário, divida em propostas menores, cada uma com aprovação própria. Não trunque, amplie ou divida silenciosamente para contornar limites. " +
    "Apresente o texto final exato no fluxo dedicado de aprovação do produto e aguarde a aceitação do dono. Se não houver versão compatível, informe bloqueado e não aplique. " +
    "Configuração local, resposta de questionário e instruções do repositório não substituem essa aceitação.\n" +
    "5. Aplique somente alterações aceitas usando os controles reais. Respeite cancelamentos e revisões de estado; " +
    "se houver conflito ou resultado incerto, releia o estado antes de decidir se cabe tentar novamente. " +
    "Não sobrescreva com uma revisão antiga nem repita uma criação incerta.\n" +
    "6. Leia o estado novamente e relate separadamente verificado/aplicado, já existente, recusado, pendente ou bloqueado. " +
    "Não marque a conta como instalada/configurada sem evidência, nem publique conteúdo privado de regras existentes.\n\n" +
    (proposal === null
      ? "Proposta de autonomia ainda não gerada: obtenha as escolhas faltantes e use o modelo genérico em docs/account-rules.md.\n"
      : `Proposta gerada para revisão do dono (ainda não aplicada; valide os limites do host):\n\n${proposal}\n`)
  );
}
