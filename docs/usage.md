# Uso e responsabilidade

O holydot funciona pelas instruções e ferramentas do dot existente. Não depende do HolyCodex 0.17 para pesquisar, preparar trabalho, executar etapas compatíveis e coordenar especialistas disponíveis.

## Execução

Priorize capacidades adequadas nesta ordem: dot, subagentes nativos e computador cloud do dot; Codex Cloud quando necessário; outro computador somente para dependências reais daquele ambiente. O tamanho da tarefa não escolhe o ambiente sozinho. Verifique capacidade, permissão e conexão reais.

Autonomia leva o trabalho autorizado ao resultado combinado. Não inventa autorização para publicar, fazer merge, implantar, enviar mensagens ou alterar contas. Aproveite aprovações informadas ainda válidas para a mesma ação e escopo. Uma ordem de parada interrompe novas ações e atribuições; preserve checkpoints e distinga solicitação de confirmação de parada.

## Checkpoints

Em trabalho versionado, conclua checkpoints significativos com commit e push para uma branch de trabalho autorizada. Inspecione os gatilhos de workflow antes de escolher a branch e confirme o SHA remoto após o push. Um commit apenas local não conclui a persistência remota. Se o host exigir aprovação, solicite a confirmação pelo controle suportado e informe o bloqueio; preserve o checkpoint recuperável enquanto aguarda. Merge, tags, release, publicação e implantação mantêm suas autorizações próprias. Consulte [permissões e regras de conta](account-rules.md); render não salva nem recria regras de conta.

## Planejamento e PRs

Recupere primeiro o contexto existente e pesquise opções suportadas. Resolva escolhas rotineiras e reversíveis com preferências fundamentadas e julgamento técnico; apresente um plano coerente e um lote das decisões materiais restantes. Inclua todas as decisões relacionadas da etapa, sem limite pequeno e arbitrário, mantendo clareza e carga de leitura manejável. Inferir uma preferência não concede permissão.

Abra proativamente um PR normal, sem draft, para trabalho autorizado e delimitado quando verificações sustentarem confiança na funcionalidade e qualidade. Reutilize PRs compatíveis; confira origem/destino, estado normal e SHA do head, com testes/CI dessa versão. Declare bloqueios residuais e respeite controles obrigatórios. Merge, tags, release, publicação e implantação têm autorização separada.

## CI e review bots

Depois de cada push, acompanhe CI e bots existentes no SHA atual: checks/statuses/jobs, comentários de conversa/inline, reviews e threads. Separe falha de código de auth/config/quota pela evidência; CI bloqueada não impede review independente. Corrija materiais no escopo, teste e faça push, responda com evidência e confirme resolução da thread. Outdated não basta. Releia head novo e comentários posteriores; CI verde ou status success que diz review skipped não é aprovação.

Pending/ausência de review permanece pendente; disabled/skipped/quota é limite externo explícito. Observe proporcionalmente até estado terminal ou limite, sem polling infinito, nova automação ou mudança de configuração de conta. Use revisão única suportada quando necessária e autorizada, sem duplicar execução. Entregue estado por gate/bot, última consulta e próximo passo de retomada. A coordenação verifica o head integrado; merge exige autoridade e critérios próprios.

## Coordenação e especialistas

Os papéis são distintos: coordenação de sessões delegadas prefere GPT-6.1 Sol / medium; especialistas preferem GPT-6 Luna / high. Standard é padrão e Fast é opt-in. Essas escolhas só valem quando suportadas por controles reais; uma configuração salva não comprova roteamento. Não altere o modelo principal do dot.

Use atribuições delimitadas, critérios de aceitação e propriedade de arquivos. Reutilize agentes compatíveis e preserve o trabalho concorrente. Um revisor independente deve ser distinto do autor; se só houver autocheck, declare essa limitação.

## Perguntas e comunicação

Agrupe perguntas relacionadas em lotes numerados, com alternativas concisas e possibilidade de resposta personalizada. Prefira um controle estruturado efetivamente funcional. Sem ele, o lote pode ser apresentado em texto; controles obrigatórios de aprovação/autenticação/conta continuam obrigatórios. Não trate uma chamada aceita como formulário exibido ou resposta recebida.

Entregue o resultado primeiro. Respostas curtas não precisam de introduções artificiais; respostas extensas usam headings Markdown reais, títulos em negrito e ênfase discreta no corpo. Preserve UTF-8 e confira a renderização real quando houver sinais de corrupção.

## Status

O padrão é uma preferência configurável de panorama de 30 minutos. Isso não cria acompanhamento nem agenda pessoal. Use uma ferramenta real e autorizada antes de afirmar que está ativo. Em panoramas efetivos, dê uma mensagem curta por projeto ainda ativo; remova concluídos dos seguintes. Responda imediatamente a pedidos de status. O intervalo dos panoramas recorrentes não impede atualizações concisas de progresso significativo, bloqueios, decisões ou conclusão; evite repetição.

## Evidência

Teste o comportamento relevante, os caminhos de erro e a interface implementada. Build, imagem sintética e testes de texto não substituem aceitação visual. Diferencie gates aprovados, falhos, bloqueados e não executados, bem como commit local, commit remoto, CI e pacote publicado. Não alegue ganhos de cache, custo, gratuidade ou consumo sem evidência do host.

## Texto literal de comunicação

O render inclui integralmente o bloco genérico aprovado em inglês na fonte canônica [instructions/holydot.md](../instructions/holydot.md), preservando os headings originais, lowercase e qualificadores, apresentação híbrida adaptativa, pesquisa e entrega completa de artefatos. O bloco é preservado literalmente; referências pessoais só devem ser consultadas pelos controles disponíveis e nunca são incorporadas ao pacote. Panoramas recorrentes mantêm sua autorização e agendamento próprios; não restringem atualizações úteis de trabalho em andamento.

## **Continuidade da autorização**

Recupere e aplique a autorização já dada ao mesmo fluxo e escopo antes de pedir confirmação. Continue etapas rotineiras previsíveis, incluindo manter a descrição do PR com SHA, evidências e limitações, sem reconfirmar. Merge e dev já autorizados no fluxo conhecido podem prosseguir após os gates; estável adiada mantém tag estável e latest vedados até ordem própria. Nova confirmação cabe para autorização ausente, mudança material de destino, dados, escopo, risco ou compromisso, ou exigência obrigatória do host. Se a ferramenta alegar falta de autorização, recupere a evidência e use a retomada suportada antes de repetir a pergunta; nunca contorne uma negativa ou confirmação obrigatória. Política renderizada não concede permissões: consulte a autoridade real do host, sem decidir por palavras-chave.

## **Três pilares e adoção**

I. autonomia; II. eficiência; III. qualidade e mergeability são capítulos sem hierarquia e critérios conjuntos. Consulte o [fluxo de setup e adoção](setup.md) para configuração local, nome, regras opcionais, retomada e readback. A base pública da reescrita está em [orientação de prompts](prompt-design.md).

A fonte atual substitui integralmente o bloco anterior. Somente as quebras CRLF são normalizadas para LF; detalhes de tamanho/hash e limites da verificação estão em [docs/prompt-design.md](prompt-design.md). O render não reescreve os headings literais para aplicar a própria orientação de formatação do texto.

## Carregamento e retomada

`setup` verifica os bytes canônicos e o bloco adotado contra `instructions/integrity.json` antes de abrir o editor ou salvar preferências. A saída identifica versão instalada, revisão e digests. `render` e `resume` repetem essa verificação e entregam o render completo mais a identidade realmente lida do pacote. Fonte alterada/truncada/duplicada ou bloco antigo falha antes de prompt/escrita; restaure uma versão aprovada antes de continuar.

```sh
holydot resume --config holydot.config.json > holydot.instructions.md
```

Use esse material no fluxo suportado do host para nova instância, retomada ou recuperação após compactação. O comando não detecta perda de contexto nem injeta regras em uma conta. Releitura pelo host e confirmação da fonte ativa continuam necessárias. Digest não prova leitura, contexto ativo ou conformidade comportamental; o pin é interno ao pacote, detecta corrupção/mistura de versões e não autentica um pacote inteiro substituído maliciosamente.

O contrato operacional externo ao literal exige revisão interna de aplicabilidade antes de respostas/ações, conservação de correções posteriores, continuidade e handoff verificável aos delegados. As preferências locais substituem apenas seus campos de configuração, respeitando autoridade superior e pedidos atuais. Os testes com labels de muitos turnos são exemplos sintéticos; não são uma avaliação real de conversação longa nem promessa de 100% de compliance.
