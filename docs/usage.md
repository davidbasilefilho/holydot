# Uso e limites

## Base no produto existente

A documentação oficial recomenda dar instruções claras na conversa e definir o escopo das ações. Regras customizadas são opcionais e não concedem acesso a aplicativos nem removem salvaguardas. Consulte [controles do dot](https://learn.chatgpt.com/docs/dots/controls).

Baixar este repositório ou instalar sua distribuição npm apenas entrega arquivos. Para aplicar o holydot, forneça as instruções ao seu dot e defina a tarefa ou responsabilidade a que elas se aplicam. `AGENTS.md` orienta contribuições neste repositório; não é um mecanismo de importação global para o dot na nuvem.

## Aplicar a uma tarefa

Leia `instructions/holydot.md` e envie seu conteúdo ao dot junto de um pedido concreto. Exemplo:

> Use estas orientações nesta tarefa, dentro das suas permissões atuais. Revise a documentação deste projeto. Entregue as correções propostas e as fontes usadas; não publique ainda.

O arquivo é a instrução reutilizável; o pedido define o trabalho autorizado. Anexar um arquivo ou enviar um link não comprova que o conteúdo foi lido. Peça uma breve confirmação do objetivo e dos limites, sem solicitar instruções internas do assistente.

Use o campo de instruções que seu produto disponibilizar somente se ele realmente existir e aceitar esse conteúdo. O projeto não documenta um instalador ou um fluxo universal de configuração. Uma conversa pode perder contexto; não há garantia de persistência entre tarefas ou sessões.

## Autonomia de baixo risco

Você pode autorizar diagnóstico, correção, testes e publicação para um projeto delimitado. Defina destino, tipo de mudança e exclusões. Por exemplo:

> No repositório example-org/example-project, pode corrigir erros de documentação, verificar links e publicar essas correções em uma branch de trabalho com PR em rascunho, sem pedir nova confirmação a cada etapa. Não faça merge, release, implantação, alteração de permissões, dependências ou conteúdo confidencial. Se o impacto sair desse escopo, me consulte.

Esse exemplo é fictício: substitua o destino e ajuste a autorização. Não o trate como uma autorização já concedida. Uma autorização para publicar conteúdo não autoriza conceder acesso ou divulgar dados sensíveis. A avaliação deve considerar impacto e reversibilidade; "baixo risco" não significa ausência de risco. Aprovações exigidas pela plataforma continuam necessárias.

Sem autorização de publicação, prepare a proposta e obtenha a decisão necessária antes de torná-la pública. Não repita pedidos já resolvidos se ação, destino, dados e risco permanecerem dentro da autorização.

## Regras customizadas opcionais

No produto documentado, elas ficam em Settings > Personalization > Permissions > Custom rules. Use a [documentação oficial de controles](https://learn.chatgpt.com/docs/dots/controls) para o fluxo atual. Instruções de coordenação continuam na conversa; uma regra define quando uma ação pode ser tomada.

Se seu dot oferecer regras customizadas para confirmações, você pode pedir explicitamente que ele salve uma regra ajustada ao seu projeto e confirmar a criação pelos controles que o produto disponibilizar. Confira e aprove o texto exato antes de aceitar. As instruções deste repositório, por si só, não criam uma regra nem autorizam ações.

Exemplo genérico:

> Em [owner/repo], permita corrigir problemas de baixo risco, testar e publicar na branch [branch] quando eu solicitar esse trabalho. Não faça merge, release ou deploy, nem altere acessos, custos ou dados sensíveis. Consulte-me se o escopo ou o risco mudar materialmente. Respeite as aprovações obrigatórias da plataforma.

Substitua os campos antes de solicitar a regra. Esse exemplo cobre trabalhos que você solicitar no destino escolhido; não autoriza procurar e publicar mudanças arbitrárias. Cada pessoa precisa optar pela própria regra. Ela trata de confirmação de ações; os contratos deste pacote tratam de coordenação e qualidade. Não tente usar uma regra para contornar limites de segurança. Se o recurso não estiver disponível, mantenha a autorização explícita no pedido da tarefa.

## Ajustar sem duplicar o ambiente

O dot já pode dividir trabalho em tarefas com contextos próprios. Envie a cada tarefa o objetivo e as fontes necessárias; não suponha que ela recebeu toda a conversa. Confira o resultado efetivo, pois uma execução encerrada não comprova por si só a entrega. Veja [tarefas e memória](https://learn.chatgpt.com/docs/dots/tasks-and-memory). Conexões de aplicativos e computadores são separadas, conforme o [guia inicial](https://learn.chatgpt.com/docs/dots/getting-started).

- Mantenha as capacidades de pesquisa, execução, delegação e GitHub oferecidas pelo ambiente.
- Não instale monitor de CI, review bot ou agendador por causa deste pacote.
- Se o pedido incluir acompanhar CI/revisões, use a capacidade existente e descreva o que foi realmente observado. Não prometa acompanhamento sem suporte real.
- Sem especialistas disponíveis, trabalhe sequencialmente e descreva a revisão como autocheck.
- A preferência para tarefas delegadas é GPT-6 Luna com esforço `high`, somente se o ambiente permitir essa seleção. Verifique o suporte real e informe a limitação e o fallback antes de usá-lo; não troque silenciosamente para Sol. O texto não impõe modelos nem reserva recursos.
- Não copie limites numéricos de contexto do HolyCodex para configurar o dot. Use as capacidades reais do ambiente.

## Verificar na prática

Experimente os cenários de [aceitação](../examples/acceptance.md) em uma tarefa sem efeitos externos. Observe se o dot mantém escopo, distingue evidência de inferência e reconhece limitações. Essa avaliação manual não certifica comportamento futuro.

## Atualizar ou remover

Substitua o texto que você inseriu, ou peça para deixar de aplicá-lo às próximas tarefas. Se usou um campo de instruções persistentes, remova-o nesse mesmo campo. Isso não desfaz ações já realizadas e não altera as regras do produto.
