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
- PR normal: escopo, origem/destino, evidência de confiança e bloqueios residuais:
- Efeitos externos já autorizados:
- Checkpoint: branch de trabalho autorizada, gatilhos de workflow inspecionados e confirmação de push exigida pelo host:
- Restrições e autorizações já concedidas:

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
