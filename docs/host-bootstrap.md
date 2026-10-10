# Bootstrap ativo e limite do host

O caminho real é `scripts/setup.ts` (preferências locais), `scripts/cli.ts` (fonte verificada) e `scripts/render.ts` (fonte completa mais preferências), entregue ao dot existente. `instructions/holydot.md` começa pelo bootstrap ativo que manda o receptor executar as chamadas nativas no pedido de adoção. `resume` volta a emitir a fonte verificada. O pacote não contém servidor, extensão de conta, SDK de perfil, conector de Custom Rules ou hook de contexto. `package.json` expõe somente o binário da CLI; `scripts/adapters/build.ts` compila esse caminho. O módulo de adoção isolado foi removido porque nenhum consumidor real do host o executava.

A [documentação oficial dos controles](https://learn.chatgpt.com/docs/dots/controls) atribui regras e permissões aos controles da conta, incluindo opções de comportamento e configurações do workspace. A [documentação de tarefas e memória](https://learn.chatgpt.com/docs/dots/tasks-and-memory) exige objetivo, horário/timezone, condições e destino para trabalho recorrente salvo; contexto e notas não são um transcript completo. Essas páginas descrevem a operação do dot, sem fornecer um conector npm para controlar a conta a partir deste pacote. Não confunda este limite arquitetural com uma garantia de ausência de outras extensões na plataforma.

## Schemas e execução

Descubra ferramentas nativas no receptor e leia os schemas atuais antes de enviar chamadas. Este pacote não fixa nomes privados, campos inventados ou schemas de conta de uma sessão anterior. O roteiro no render mapeia operações reais: ler perfil, alterar somente nome, ler regras/tarefas, abrir formulário exato, criar/atualizar tarefa e ler resultado salvo. Se a sessão não expuser um controle, marque apenas essa etapa bloqueada e informe a rota manual suportada; não substitua a ferramenta por um callback sem consumidor.

Para regras, confira campos reais de ação/escopo/destino/comportamento. O controle oficial pode oferecer agir sem perguntar, agir quando solicitado, perguntar antes ou transferir ao usuário; escolha conforme a intenção explícita e limites vigentes, sem ampliar autoridade. O formulário obrigatório ainda precisa da resposta e da confirmação de gravação. Não há aceitação de regra por texto de chat nem por resultado de chamada aceito.

Para o agendador, confira campos reais de título, instrução/prompt, schedule, timezone, modo e destino quando expostos. Não suponha que campos presentes em um serviço existam em outro. O panorama em cadência explícita usa `exact_schedule` quando suportado; `condition_watch` representa condição e tem seus próprios limites. Se houver schema que suporte 30 minutos, preserve esse intervalo. Se o schema da sessão limitar a recorrência pedida, reporte a incompatibilidade concreta, sem alterar a intenção nem alegar limite universal. Eventos suportados precisam do trigger correspondente quando solicitados; não transforme monitor em resumo periódico.

Objetivo da tarefa e cadência estão no render, com preferências atuais; timezone/canal vêm do contexto autorizado da instância. Não fixe dados de uma pessoa no pacote nem crie tarefa na sessão de desenvolvimento para testar. Save/readback deve confirmar o identificador, estado habilitado e definição efetiva; campos não verificáveis permanecem explícitos.

## Aceitação mínima em uma instância real

No pedido explícito de adoção de uma nova instância, observe estas etapas sem reiniciar itens já concluídos:

1. Fornecer o render inteiro verificado e pedir adoção; registrar versão/revisão/digest e confirmar que o receptor acessou o conteúdo completo antes das ações.
2. Observar descoberta dos schemas e chamadas nativas de inventário/perfil. Confirmar nome holydot por leitura, preservando aparência.
3. Observar a proposta exata e o formulário obrigatório de cada regra solicitada. Enquanto pendente, registrar pendente. Após resposta, confirmar save e readback; negativa/cancelamento preserva bloqueio sem recriação.
4. Observar comparação com tarefa equivalente e criação ou atualização pelo identificador existente. Confirmar objetivo, cadence/schedule/timezone, habilitação, condições e destino efetivos. Não duplicar.
5. Retomar com o checkpoint e render atuais: observar recuperação da fonte e releitura dos itens, sem repetir save. Uma regra removida continua removida; nova criação precisa de novo pedido válido próprio.
6. Após mudança aprovada de instruções ou recuperação de contexto, verificar fonte nova e decisões atuais, além de uma ação posterior compatível. Usar interrupção/continuação e resultados delegados pertinentes para avaliar persistência instrucional; não alegar garantia absoluta contra esquecimento.

Se uma ferramenta faltar, o formulário continuar pendente ou houver negativa, observe bloqueio somente daquela etapa e continuação do trabalho independente autorizado. O gate de conta fica parcial até resultados reais verificados ou aceitação explícita de entrega parcial. Testes de render/callplan são regressões do contrato; não comprovam chamadas nativas, conta alterada ou comportamento real do modelo.
