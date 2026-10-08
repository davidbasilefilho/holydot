# **Orientação das instruções**

A revisão organiza os três pilares como capítulos sem hierarquia e preserva contratos específicos, exceções e decisões aceitas. O bloco de comunicação aprovado permanece literal; sua fixture fixa bytes e SHA-256. Os demais capítulos usam instruções diretas, agrupam responsabilidades e removem repetição onde outro contrato já cobre o comportamento.

O [guia da família GPT-6](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-6-astra) orienta continuidade do trabalho, decisões fundamentadas, auditoria de instruções conflitantes e testes proporcionais. A aplicação aqui conserva autorização real e controles obrigatórios; iniciativa não concede permissões.

A [orientação de skills e prompts](https://learn.chatgpt.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra) favorece instruções específicas e referências pertinentes à tarefa. O [modelo GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol) confirma medium como esforço padrão suportado; os papéis configuráveis aceitos continuam distintos, sem mudar o modelo principal do dot.

Os [controles do dot](https://learn.chatgpt.com/docs/dots/controls) distinguem regras opcionais, permissões e confirmações obrigatórias. [Tarefas e memória](https://learn.chatgpt.com/docs/dots/tasks-and-memory) explicam continuidade de contexto e separação entre trabalho ativo e agendamentos. O fluxo de adoção aplica essas distinções com inventário, formulário e readback.

Evidência: testes do render e dos contratos; setup local instalado e TUI real; hash literal; apresentação Markdown. A aceitação do nome/regras na conta precisa de controles reais e autorização própria. Esses testes não medem comportamento de um modelo receptor nem comprovam conta modificada.

A nova fonte adotada substitui integralmente o bloco anterior e seus adendos de comunicação, conformidade e separação de mensagens. Mantém-se o texto completo sem reescrita, inclusive headings originais `#`, lowercase, exceções e alternativas por canal. Os três pilares e as escolhas de setup continuam nas seções específicas de produto, sem duplicar as instruções de comunicação substituídas.

A única normalização é CRLF → LF: 139 linhas, 14.954 bytes na representação CRLF e 14.816 bytes na fixture LF, sem acrescentar newline final. SHA-256 da fixture LF: `70b8a168767100bb05a36ba65960b942d0e2b7491e6dece4b4e6a2adc11089ea`. A leitura integral foi comparada à materialização original verificada pela coordenação: a representação CRLF reconstruída tem SHA-256 `529bd3a9568a249553f6383ad0e76614fa977587ada2040ceae6265c0ef19fdb`, igual ao original, e o hash LF também coincide. Isso confirma equivalência após somente CRLF → LF; as duas tentativas de transferência neste executor falharam, sem impedir essa comparação independente. Testes fixam conteúdo, hash, ocorrência única no render e ausência das cláusulas substituídas.

A orientação de mensagens respeita suporte do canal: uma por projeto quando possível; separação clara no mesmo destino caso contrário. A apresentação híbrida adapta-se às capacidades reais, sem presumir Intelligent UI ou DIL no dot. Pesquisa e profundidade preservam condições e preferência de fontes sem whitelist. Esses testes verificam o contrato distribuído, não comportamento futuro do modelo ou adoção na conta.
