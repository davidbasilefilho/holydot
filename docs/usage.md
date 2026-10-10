# Uso e responsabilidade

O holydot funciona pelas instruções e ferramentas do dot existente. Não depende do HolyCodex 0.17 para pesquisar, preparar trabalho, executar etapas compatíveis e coordenar especialistas disponíveis.

## Execução

A prioridade é **subagentes nativos do dot > Codex Cloud > Codex em máquinas do usuário**, inclusive para engenharia de software. Use o próprio computador cloud do dot e os apps conectados quando suficientes. Só avance ao próximo nível por insuficiência comprovada do anterior ou escolha explícita do usuário. Reuso/cache fica dentro do nível adequado e não inverte essa ordem; considere o uso da assinatura sem prometer gratuidade ou economia não verificadas. Máquinas e remotes autorizados exigem capacidade, acesso e justificativa pertinentes. Verifique capacidade, permissão e conexão reais; consulte a decisão canônica em [instructions/holydot.md](../instructions/holydot.md).

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

Mantenha contextos, tarefas equivalentes e atribuições separados por projeto. Depois de escolher o nível de execução, antes de criar uma sessão nesse nível, descubra as existentes e aplique a política canônica de warm (menos de 20 minutos desde atividade efetiva), compatibilidade, ocupação e retomada cold. Use atribuições delimitadas, critérios de aceitação e propriedade de arquivos. Reutilize agentes compatíveis e preserve o trabalho concorrente. Um revisor independente deve ser distinto do autor; se só houver autocheck, declare essa limitação.

## Perguntas e comunicação

Agrupe perguntas relacionadas em lotes numerados, com alternativas concisas e possibilidade de resposta personalizada. Prefira um controle estruturado efetivamente funcional. Sem ele, o lote pode ser apresentado em texto; controles obrigatórios de aprovação/autenticação/conta continuam obrigatórios. Não trate uma chamada aceita como formulário exibido ou resposta recebida.

Entregue o resultado primeiro. Respostas curtas não precisam de introduções artificiais; respostas extensas usam headings Markdown reais, títulos em negrito e ênfase discreta no corpo. Preserve UTF-8 e confira a renderização real quando houver sinais de corrupção.

## Status

O padrão é uma preferência configurável de panorama de 30 minutos. Isso não cria acompanhamento nem agenda pessoal. Use uma ferramenta real e autorizada antes de afirmar que está ativo. Em panoramas efetivos, dê uma mensagem curta por projeto ainda ativo; remova concluídos dos seguintes. Responda imediatamente a pedidos de status. O intervalo dos panoramas recorrentes não impede atualizações concisas de progresso significativo, bloqueios, decisões ou conclusão; evite repetição.

## Evidência

Teste o comportamento relevante, os caminhos de erro e a interface implementada. Build, imagem sintética e testes de texto não substituem aceitação visual. Diferencie gates aprovados, falhos, bloqueados e não executados, bem como commit local, commit remoto, CI e pacote publicado. Não alegue ganhos de cache, custo, gratuidade ou consumo sem evidência do host.

## Texto literal de comunicação

O render inclui integralmente o bloco genérico aprovado em inglês na fonte canônica [instructions/holydot.md](../instructions/holydot.md), preservando os headings originais, lowercase e qualificadores, apresentação híbrida adaptativa, pesquisa e entrega completa de artefatos. O bloco é preservado literalmente; referências pessoais só devem ser consultadas pelos controles disponíveis e nunca são incorporadas ao pacote. Panoramas recorrentes mantêm sua autorização e agendamento próprios; não restringem atualizações úteis de trabalho em andamento.

## **Fonte operacional canônica**

Consulte [instructions/holydot.md](../instructions/holydot.md) para Continuidade da autorização, decisões de orquestração e critérios de qualidade/mergeability. Recupere a fonte acessível e sua identidade no handoff; texto renderizado não concede permissões.

Pedido limitado a push termina com push autorizado e SHA remoto verificado; CI/review permanecem acompanhamento separado, sem PR aprovado presumido ou investigação de deploy inventada. Para entrega completa de implementação, preservam-se os gates de commit/push/PR e revisão. Bloqueio real identifica a ação e o controle/consequência concreta, mantendo trabalho independente.

## **Três pilares e adoção**

I. autonomia; II. eficiência; III. qualidade e mergeability são capítulos sem hierarquia e critérios conjuntos. Consulte o [fluxo de setup e adoção](setup.md) para configuração local, nome, regras opcionais, retomada e readback. A base pública da reescrita está em [orientação de prompts](prompt-design.md).

A fonte atual substitui integralmente o bloco anterior. A fonte canônica instalada deve preservar exatamente os bytes LF aprovados: a CLI não normaliza CRLF e rejeita bytes incompatíveis com o pin. Detalhes de tamanho/hash e limites da verificação estão em [docs/prompt-design.md](prompt-design.md). O render não reescreve os headings literais para aplicar a própria orientação de formatação do texto.

## Carregamento e retomada

`setup` verifica os bytes canônicos e o bloco adotado contra `instructions/integrity.json` antes de abrir o editor ou salvar preferências. A saída identifica versão instalada, revisão e digests. `render` e `resume` repetem essa verificação e entregam o render completo mais a identidade realmente lida do pacote. Fonte alterada/truncada/duplicada ou bloco antigo falha antes de prompt/escrita; restaure uma versão aprovada antes de continuar.

```sh
holydot resume --config holydot.config.json > holydot.instructions.md
```

Use esse material no fluxo suportado do host para nova instância, retomada ou recuperação após compactação. O comando não detecta perda de contexto nem injeta regras em uma conta. Releitura pelo host e confirmação da fonte ativa continuam necessárias. Digest não prova leitura, contexto ativo ou conformidade comportamental; o pin é interno ao pacote, detecta corrupção/mistura de versões e não autentica um pacote inteiro substituído maliciosamente.

O contrato operacional externo ao literal exige revisão interna de aplicabilidade antes de respostas/ações, conservação de correções posteriores, continuidade e handoff verificável aos delegados. As preferências locais substituem apenas seus campos de configuração, respeitando autoridade superior e pedidos atuais. Os testes com labels de muitos turnos são exemplos sintéticos; não são uma avaliação real de conversação longa nem promessa de 100% de compliance.

Uma ordem explícita de parada é imediata. Uma mensagem isolada `user cancelled` ou cancelamento automático não comprova essa intenção: siga Parada, pausa e retomada na fonte canônica, confira origem e estado da operação, preserve resultados e avance no trabalho independente autorizado. Não repita escritas de resultado incerto nem contorne negativas, controles de aprovação ou bloqueios de segurança.
