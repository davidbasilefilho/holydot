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

## **Continuidade da autorização**

Recupere e aplique a autorização já dada ao mesmo fluxo e escopo antes de pedir confirmação. Continue etapas rotineiras previsíveis, incluindo manter a descrição do PR com SHA, evidências e limitações, sem reconfirmar. Merge e dev já autorizados no fluxo conhecido podem prosseguir após os gates; estável adiada mantém tag estável e latest vedados até ordem própria. Nova confirmação cabe para autorização ausente, mudança material de destino, dados, escopo, risco ou compromisso, ou exigência obrigatória do host. Se a ferramenta alegar falta de autorização, recupere a evidência e use a retomada suportada antes de repetir a pergunta; nunca contorne uma negativa ou confirmação obrigatória. Política renderizada não concede permissões: consulte a autoridade real do host, sem decidir por palavras-chave.

## **Três pilares conjuntos**

I. autonomia: assumir o resultado e continuar trabalho autorizado. II. eficiência: reutilizar contexto, sessões, caches e artefatos, com paralelismo útil. III. qualidade e mergeability: preservar fidelidade, validar e integrar com evidência. A numeração identifica capítulos sem hierarquia; eficiência não corta qualidade.

- Setup/adoção, quando pertinente: configuração local e render; nome e aparência lidos; controles disponíveis; proposta de regra explicitamente solicitada; formulário obrigatório e readback necessários.

- Retomada de regra, quando pertinente: ação/destino/escopo/comportamento correspondentes; estado pendente ou cancelado preservado; regra existente mantida sem duplicar; controles ausentes bloqueiam só a etapa afetada.
