# Relatório de resultado

- Resultado entregue:
- Recursos ou arquivos alterados e versão avaliada:
- Checkpoint: commit local, branch de trabalho, push e SHA remoto verificado (ou bloqueio/confirmação pendente):
- Critérios atendidos e evidências correspondentes:
- PR: referência, origem/destino, estado normal verificado e SHA do head:
- CI e review bots no head: runs/jobs/checks, comentários/reviews/threads tratados, correção/resposta verificada e estado confirmado após resolução:
- Bots pendentes/desativados/skipped ou quota; CI bloqueada por auth/config versus falha de código; última consulta e próximo passo de retomada:
- Confiança em funcionalidade/qualidade e bloqueios residuais:
- Verificações aprovadas:
- Verificações com falha:
- Verificações não executadas ou bloqueadas e motivo:
- Riscos restantes e decisões necessárias:
- Estado final do escopo solicitado:
- Autorização já aplicada e efeitos verificados, sem confundir texto renderizado com permissão:
- Retomada suportada tentada e negativa/confirmação obrigatória restante, se houver:

Use apenas os campos relevantes. Para uma consulta simples, resultado e fonte podem bastar. Não inclua credenciais, dados pessoais desnecessários ou registros privados em uma entrega pública.

Um commit apenas local não conclui a persistência remota. Informe separadamente o push confirmado, a CI da versão entregue e qualquer autorização pendente para merge, release, publicação ou implantação.

Não marque uma tarefa de código concluída enquanto houver mudanças apenas locais, push não confirmado, PR ausente/draft ou checks pendentes/com falha. Backup/checkpoint recuperável preserva o trabalho, mas não substitui commit, push e PR normal apropriado. Informe bloqueio e próximo passo seguro quando a entrega remota não puder ser verificada.

Relacione a evidência de testes/CI ao SHA do head do PR normal. Estado pronto para revisão não autoriza merge, release, publicação ou implantação; informe qualquer confirmação obrigatória ou controle indisponível.

CI verde isolada não conclui o PR: acompanhe review bots e comentários posteriores no head atual. Review ausente/pending ou bot disabled/skipped/quota não é aprovação. Resolve exige evidência verificada e releitura; outdated não basta. Sem polling infinito ou automação redundante; limite externo permanece explícito e não autoriza merge.

## **Fonte operacional canônica**

Aplique [instructions/holydot.md](../instructions/holydot.md), especialmente Continuidade da autorização, Coordenação de múltiplos projetos, Descoberta e reuso de sessões warm e os três pilares conjuntos. No handoff, forneça um recurso realmente acessível com versão/revisão/digest ou o render completo verificado; uma referência inacessível não substitui a leitura. Recupere essa fonte antes das ações dependentes, preservando autoridade vigente e controles obrigatórios.

- Setup/adoção, quando pertinente: instruções em uso; nome verificado; regra proposta / formulário pendente / cancelada / salva / verificada / bloqueada; leitura divergente ou controle indisponível. Teste de contrato não comprova mudança real no host.

Quando solicitar uma ação, diga diretamente quem deve agir, em qual ambiente e qual retorno é esperado, somente com os detalhes necessários. Prefira nomes concretos e distinga arquivo intermediário de final quando isso afetar o uso. Não compense formulação ruim com mais texto nem imponha checklist a toda resposta.

Para coordenação ou retomada, registre somente campos pertinentes: projeto/repositório/ambiente; tarefa equivalente e decisão de continuar; sessão/papel/branch/worktree/recursos; última atividade efetiva observada e classificação warm/cold/desconhecida; estado ocupado e dependências; delta enviado; evidência recuperável e próximo passo. Separe atribuições de projetos independentes e preserve tarefas em andamento.
