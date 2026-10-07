# Uso e limites

## Base no produto existente

A documentação oficial recomenda dar instruções claras na conversa e definir o escopo das ações. Regras customizadas são opcionais e não concedem acesso a aplicativos nem removem salvaguardas. Consulte [controles do dot](https://learn.chatgpt.com/docs/dots/controls).

Baixar este repositório ou instalar sua distribuição npm apenas entrega arquivos. Para aplicar o holydot, forneça as instruções ao seu dot e defina a tarefa ou responsabilidade a que elas se aplicam. `AGENTS.md` orienta contribuições neste repositório; não é um mecanismo de importação global para o dot na nuvem.

## Aplicar a uma tarefa

Leia `instructions/holydot.md` e envie seu conteúdo ao dot junto de um pedido concreto. Exemplo:

> Use estas orientações nesta tarefa, dentro das suas permissões atuais. Revise a documentação deste projeto. Entregue as correções propostas e as fontes usadas; não publique ainda.

O arquivo é a instrução reutilizável; o pedido define o trabalho autorizado. Anexar um arquivo ou enviar um link não comprova que o conteúdo foi lido. Peça uma breve confirmação do objetivo e dos limites, sem solicitar instruções internas do assistente.

Se a plataforma exigir aprovação, autenticação ou controle de conta dedicado, use-o primeiro; uma pergunta genérica não o substitui. Nas demais perguntas materiais ou de preferência, prefira a ferramenta estruturada permitida e adequada. Respeite os tipos de pergunta permitidos. Texto comum no chat é o último recurso, somente se não houver alternativa adequada mais legível.

## Atualizações de status por projeto

O padrão é um panorama de status curto por projeto ativo a cada 30 minutos, configurável nas preferências locais entre 1 e 1440 minutos. Não envie atualizações proativas de progresso fora desse intervalo; resultados e mudanças entram no próximo panorama. Se o usuário pedir status, responda imediatamente com uma mensagem separada por projeto. Cada resumo inclui estado, mudanças desde o último panorama, evidências verificadas, próxima etapa e verificações pendentes. Se nada mudou, diga isso brevemente. Para decisão/opinião/ação/aprovação necessária, use o formulário dedicado quando exigido ou ferramenta estruturada permitida, sem esperar o panorama. Não reporte opções em texto comum, salvo como último recurso se não houver alternativa suportada mais legível; não trate pedido aceito por uma ferramenta como prova de exibição. No panorama, lembre somente pedidos de intervenção pendentes e ainda sem resposta/ciência; omita a seção se não houver nenhum e não repita pedidos respondidos, cancelados ou substituídos. Nunca invente progresso.

O intervalo local não cria um agendador. Use uma automação periódica somente por uma ferramenta existente, autorizada e suportada pelo host, e confira o estado salvo antes de afirmar que está ativa. Se não houver esse recurso, informe a limitação; não instale cron, daemon, serviço ou monitor no projeto.

Use o campo de instruções que seu produto disponibilizar somente se ele realmente existir e aceitar esse conteúdo. O projeto não oferece um instalador remoto ou um fluxo universal de configuração do produto. Uma conversa pode perder contexto; não há garantia de persistência entre tarefas ou sessões.

## Autonomia de baixo risco

Você pode autorizar diagnóstico, correção, testes e publicação para um projeto delimitado. Defina destino, tipo de mudança e exclusões. Por exemplo:

> No repositório example-org/example-project, pode corrigir erros de documentação, verificar links e publicar essas correções em uma branch de trabalho com PR em rascunho, sem pedir nova confirmação a cada etapa. Não faça merge, release, implantação, alteração de permissões, dependências ou conteúdo confidencial. Se o impacto sair desse escopo, me consulte.

Esse exemplo é fictício: substitua o destino e ajuste a autorização. Não o trate como uma autorização já concedida. Uma autorização para publicar conteúdo não autoriza conceder acesso ou divulgar dados sensíveis. A avaliação deve considerar impacto e reversibilidade; "baixo risco" não significa ausência de risco. Aprovações exigidas pela plataforma continuam necessárias.

Sem autorização de publicação, prepare a proposta e obtenha a decisão necessária antes de torná-la pública. Não repita pedidos já resolvidos se ação, destino, dados e risco permanecerem dentro da autorização.

## Regras customizadas opcionais

No produto documentado, elas ficam em Settings > Personalization > Permissions > Custom rules. Use a [documentação oficial de controles](https://learn.chatgpt.com/docs/dots/controls) para o fluxo atual. Instruções de coordenação continuam na conversa; uma regra define quando uma ação pode ser tomada.

Se seu dot oferecer regras customizadas para confirmações, use [o setup guiado](account-rules.md) para que ele apresente as propostas nos controles reais, aplique somente mudanças aceitas e verifique o resultado. Você também pode pedir explicitamente uma regra ajustada ao seu projeto. Confira e aprove o texto exato antes de aceitar. As instruções deste repositório, por si só, não criam uma regra nem autorizam ações.

Exemplo genérico:

> Em [owner/repo], permita corrigir problemas de baixo risco, testar e publicar na branch [branch] quando eu solicitar esse trabalho. Não faça merge, release ou deploy, nem altere acessos, custos ou dados sensíveis. Consulte-me se o escopo ou o risco mudar materialmente. Respeite as aprovações obrigatórias da plataforma.

Substitua os campos antes de solicitar a regra. Esse exemplo cobre trabalhos que você solicitar no destino escolhido; não autoriza procurar e publicar mudanças arbitrárias. Cada pessoa precisa optar pela própria regra. Ela trata de confirmação de ações; os contratos deste pacote tratam de coordenação e qualidade. Não tente usar uma regra para contornar limites de segurança. Se o recurso não estiver disponível, mantenha a autorização explícita no pedido da tarefa.

## Ajustar sem duplicar o ambiente

A ordem de execução considera capacidades e dependências. Faça integralmente no dot as tarefas pequenas; em pesquisas e na preparação de tarefas grandes, use diretamente suas ferramentas para reunir evidências e contexto úteis. Quando começar a execução de uma tarefa grande, entregue o plano e as evidências a um HolyCodex Root real se houver integração disponível e autorizada; esse Root coordena especialistas na hierarquia dot → HolyCodex Roots → especialistas. Use Roots adicionais somente para frentes grandes independentes que realmente precisem de execução paralela e quando houver suporte real. O tamanho, sozinho, não justifica encaminhar uma tarefa a Codex Cloud ou ao computador do usuário. Verifique a integração antes de usá-la ou alegar que existe; o futuro preset embedding do HolyCodex não está implementado por este pacote. Sem Root disponível, explique a limitação e só prossiga por uma alternativa suportada e autorizada.

Use o computador do usuário somente quando uma etapa depender realmente de sessão, arquivo, hardware ou comportamento exclusivamente local e dentro das permissões concedidas. Prefira o dot e seu cloud quando puderem realizar a mesma etapa. Uma conexão existente não justifica operar a máquina, e o CLI não cria acesso a ela.

Quando navegador, computador ou conexão de aplicativo forem relevantes, confira disponibilidade e acesso reais; não assuma disponibilidade ou indisponibilidade sem verificar. Evite pedir conexão local quando as ferramentas do dot/cloud bastarem. Se uma dependência exclusiva local existir e o acesso estiver autorizado, use a máquina apenas para essa etapa e continue o trabalho independente.

Cloud-first não significa uso gratuito: a documentação distingue conversas com o dot das tarefas Work/Codex, que seguem os limites dos respectivos produtos. Uso local e cloud compartilham a franquia aplicável. Prefira ferramentas diretas para consultas simples, reúna etapas úteis em tarefas existentes e evite sessões e níveis de velocidade desnecessários. Consulte [uso de dots](https://learn.chatgpt.com/docs/dots) e [limites e preços atuais](https://learn.chatgpt.com/docs/pricing); este pacote não garante economia nem monitora sua franquia.

No HolyCodex, continue normalmente na mesma sessão e conta quando o trabalho relacionado for compatível, mantendo modelo, configuração e prefixo estáveis. Peça ao Root que reutilize especialistas compatíveis. Inicie outra sessão somente quando o trabalho ou o host exigir; não crie turnos ociosos de keepalive. Mantenha instruções estáveis, busque apenas fontes pertinentes e envie handoffs concisos com o delta necessário; evite dumps de transcrições e turnos de status redundantes. Preserve o material e as verificações necessários, sem impor limites de tokens à execução. Eficiência deve ser medida externamente e não alegada sem benchmarks e dados do host.

Nota de manutenção: a documentação da [OpenAI sobre cache de prompts](https://developers.openai.com/api/docs/guides/prompt-caching) exige prefixo de tokens estável para cache hit; reutilizar uma sessão sozinho não o garante, e compactar/reformular o prefixo pode mudar o resultado. Os [diagnósticos](https://developers.openai.com/api/docs/guides/prompt-caching/diagnostics) descrevem `usage.input_tokens_details.cached_tokens`. Cache pode expirar, mas este pacote não promete janelas de tempo nem cria keepalives. A documentação de API não prova que o dot ou o Codex exponham o mesmo controle ou métricas. Em avaliações externas, compare input novo/em cache e o total do trabalho concluído, além da qualidade e latência; não altere configurações do host nem alegue economia sem suporte e benchmark representativos.

Modelo de estimativa para manutenção: use como hipótese para HolyCodex e holydot um custo ponderado API-equivalente, somando input novo, input em cache e output com os respectivos pesos documentados para a API. Essa aproximação orienta comparações de fluxo; não é a fórmula confirmada do Pro, não prevê saldo restante nem reproduz necessariamente o uso incluído na assinatura. Mantenha os pesos vinculados à documentação atual, não fixe multiplicadores nesta instrução e trate qualquer ganho como não medido até que benchmarks representativos o confirmem.

O dot já pode dividir trabalho em tarefas com contextos próprios. Envie a cada tarefa o objetivo e as fontes necessárias; não suponha que ela recebeu toda a conversa. Confira o resultado efetivo, pois uma execução encerrada não comprova por si só a entrega. Veja [tarefas e memória](https://learn.chatgpt.com/docs/dots/tasks-and-memory). Conexões de aplicativos e computadores são separadas, conforme o [guia inicial](https://learn.chatgpt.com/docs/dots/getting-started).

- Mantenha as capacidades de pesquisa, execução, delegação e GitHub oferecidas pelo ambiente.
- Não instale monitor de CI, review bot, cron, daemon ou serviço de agendamento por causa deste pacote. Relatórios periódicos pedidos pelo usuário dependem da automação já oferecida pelo host.
- Se o pedido incluir acompanhar CI/revisões, use a capacidade existente e descreva o que foi realmente observado. Não prometa acompanhamento sem suporte real.
- Para a execução de uma tarefa grande, verifique a integração HolyCodex Root real. Se não estiver disponível, continue diretamente apenas com o que for viável e autorizado, sem alegar orquestração ou revisão independente. Não use Codex Cloud ou o computador do usuário como substituto automático só pelo porte; explique limitações e siga apenas por uma alternativa suportada.
- A preferência para tarefas delegadas é GPT-6 Luna com esforço `high`, somente se o ambiente permitir essa seleção. Verifique o suporte real e informe a limitação e o fallback antes de usá-lo; não troque silenciosamente para Sol. O texto não impõe modelos nem reserva recursos.
- Não copie limites numéricos de contexto do HolyCodex para configurar o dot. Use as capacidades reais do ambiente.

## Visualizações e interfaces

O holydot orienta usar visualizações quando elas melhorarem materialmente a resposta, conforme as capacidades documentadas em [Visualizations](https://learn.chatgpt.com/docs/visualizations). A disponibilidade depende da conta e da interface; CLI e extensão IDE não renderizam esse recurso. Use uma saída alternativa útil quando necessário, sem inventar uma API de instalação.

O ciclo de inspeção da interface real é uma política de qualidade desta adaptação: a coordenação principal deve avaliar evidências visuais, corrigir defeitos e verificar novamente, sem tratar build ou mockup como prova da experiência implementada. Isso não instala navegador, biblioteca ou runtime.

## Verificar na prática

Experimente os cenários de [aceitação](../examples/acceptance.md) em uma tarefa sem efeitos externos. Observe se o dot mantém escopo, distingue evidência de inferência e reconhece limitações. Essa avaliação manual não certifica comportamento futuro.

## Atualizar ou remover

Substitua o texto que você inseriu, ou peça para deixar de aplicá-lo às próximas tarefas. Se usou um campo de instruções persistentes, remova-o nesse mesmo campo. Isso não desfaz ações já realizadas e não altera as regras do produto.
