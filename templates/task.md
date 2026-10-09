# Contrato de tarefa

Modelo simplificado e modificado a partir de Intent, Assignment e AssignmentMetadata do HolyCodex 0.17.0. Não é um formato serializável compatível com o runtime original.

- Identificador e revisão:
- Objetivo e resultado pretendido, em termos claros:
- Escopo aceito e entregáveis:
- Fora do escopo e exclusões:
- Contexto existente e opções suportadas pesquisadas:
- Preferências fundamentadas e premissas de escolhas rotineiras/reversíveis:
- Plano coerente e lote das decisões materiais restantes desta etapa:
- Abordagem viável e premissas seguras/reversíveis:
- Fontes consultadas e evidências disponíveis:
- Decisões materiais resolvidas antes do handoff:
- Dependências, acessos e permissões necessários:
- Riscos e impactos relevantes:
- Critérios de aceitação, testes e verificações:
- Escopo de conclusão solicitado (implementação completa, investigação, push-only ou outro) e acompanhamento separado:
- Convenções/decisões do mantenedor recuperadas; menor diff coeso suficiente:
- Gates proporcionais: funcional, interface real quando aplicável, arquitetura e produto; revisor independente ou autocheck identificado:
- Conclusão de código: commit, push/SHA remoto, PR normal novo ou existente e checks do head; responsável pela integração e bloqueios de entrega remota:
- PR normal: escopo, origem/destino, evidência de confiança e bloqueios residuais:
- Acompanhamento de CI e review bots: SHA atual, checks/jobs, comentários/reviews/threads, auth/config/quota versus código, estado por bot e condição de retomada/limite externo:
- Efeitos externos já autorizados:
- Checkpoint: branch de trabalho autorizada, gatilhos de workflow inspecionados e confirmação de push exigida pelo host:
- Restrições e autorizações já concedidas:
- Evidência da autorização vigente, fluxo/efeitos automáticos conhecidos e limites de canal:
- Mudanças materiais ou exigências obrigatórias ainda pendentes:

Use o contrato completo somente quando a complexidade ou o handoff exigir; deixe de fora campos sem efeito nesta tarefa. Para uma tarefa simples, uma frase pode bastar. Antes de delegar uma execução, resolva as dúvidas materiais de requisitos que possam ser esclarecidas; agrupe decisões relacionadas em lotes numerados e não deixe o executor redescobrir decisões já disponíveis. HolyCodex não é dependência operacional deste contrato.

Preencha a seção abaixo somente se houver delegação real ou múltiplas etapas que precisem de coordenação.

- Tarefa e papel:
- Dependências que precisam ter sucesso:
- Recursos que podem ser alterados, ou somente leitura:
- Trabalho de que a revisão precisa ser independente:
- Estado: pronta / em andamento / concluída / falhou / cancelada
- Resultado e referência às evidências:

Bloqueios devem ser registrados com causa e próximo passo; não são sucesso. Reavalie o contrato quando o objetivo mudar. Os estados são rótulos de acompanhamento manual, não uma máquina de estados imposta por software.

Em trabalho versionado, planeje commits e pushes dos checkpoints significativos dentro da autorização vigente. A coordenação conserva a propriedade da integração. Local-only não conclui a persistência remota; registre bloqueios e peça a confirmação pelo controle suportado quando necessária. Este contrato não salva regras de conta nem autoriza merge, tags, publicação ou implantação.

Prepare contexto e pesquisa antes do plano; inferir preferências não concede permissão. Reúna todas as decisões relacionadas da etapa em lotes claros e manejáveis, sem limite pequeno e arbitrário. A coordenação abre proativamente um PR normal, sem draft, quando a verificação sustenta funcionalidade e qualidade; confira estado e SHA do head e mantenha merge/release/implantação sujeitos à autorização própria.

## **Fonte operacional canônica**

Aplique [instructions/holydot.md](../instructions/holydot.md), especialmente Continuidade da autorização, Coordenação de múltiplos projetos, Descoberta e reuso de sessões warm e os três pilares conjuntos. No handoff, forneça um recurso realmente acessível com versão/revisão/digest ou o render completo verificado; uma referência inacessível não substitui a leitura. Recupere essa fonte antes das ações dependentes, preservando autoridade vigente e controles obrigatórios.

- Setup/adoção, quando pertinente: configuração local e render; nome e aparência lidos; controles disponíveis; proposta de regra explicitamente solicitada; formulário obrigatório e readback necessários.

- Retomada de regra, quando pertinente: ação/destino/escopo/comportamento correspondentes; estado pendente ou cancelado preservado; regra existente mantida sem duplicar; controles ausentes bloqueiam só a etapa afetada.

Quando solicitar uma ação, diga diretamente quem deve agir, em qual ambiente e qual retorno é esperado, somente com os detalhes necessários. Prefira nomes concretos e distinga arquivo intermediário de final quando isso afetar o uso. Não compense formulação ruim com mais texto nem imponha checklist a toda resposta.

Para coordenação ou retomada, registre somente campos pertinentes: projeto/repositório/ambiente; tarefa equivalente e decisão de continuar; sessão/papel/branch/worktree/recursos; última atividade efetiva observada e classificação warm/cold/desconhecida; estado ocupado e dependências; delta enviado; evidência recuperável e próximo passo. Separe atribuições de projetos independentes e preserve tarefas em andamento.
