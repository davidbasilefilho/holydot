# Instalação e configuração

O holydot gera um arquivo local de preferências e as instruções que você entrega ao seu dot. O CLI não acessa sua conta, conecta aplicativos, seleciona modelos no servidor ou instala HolyCodex. Ele prepara um setup assistido pelo host para apresentar aprovações e aplicar regras aceitas, quando o host tiver controles reais para isso.

## Requisito e como executar

O CLI é TypeScript executado por **Bun 1.4**. Instale Bun pelo [guia oficial](https://bun.sh/docs/installation). Para usar só as instruções Markdown, Bun não é necessário.

Para uma execução avulsa, `bunx` baixa e executa o pacote sem instalação global, dependência no projeto, `package.json` ou lockfile. Depois que a primeira versão estável estiver publicada no npm sob a tag `latest`, rode:

```sh
bunx holydot@latest setup
```

A existência da versão no código-fonte não prova que ela já foi publicada. Para uma execução reproduzível, fixe uma versão que esteja efetivamente publicada:

```sh
bunx holydot@X.Y.Z setup
```

Troque `X.Y.Z` pela versão exata que você revisou. A tag npm `dev` é para pré-lançamentos e não é a versão estável `latest`; use `bunx holydot@dev setup` somente quando a tag `dev` estiver publicada. Também é possível fixar o número exato do pré-lançamento. Não é necessário usar `bun add`; use-o somente se quiser adicionar o pacote como dependência do projeto e registrar essa escolha no manifesto e no lockfile.

No checkout do projeto, durante o desenvolvimento, execute `bun scripts/cli.ts setup`.

## Primeiro setup

`setup` funciona numa pasta vazia, sem executar `init` antes. Ele cria `holydot.config.json` atomicamente a partir de padrões seguros, sem substituir um arquivo existente, e imprime o plano completo de setup assistido pelo host. Nenhuma regra de conta é aplicada pelo CLI. Se já houver uma configuração válida, `setup` a reutiliza sem alterá-la. JSON inválido, links simbólicos, diretórios e outros alvos que não sejam arquivos regulares falham de forma segura.

A criação atômica usa um hard link no mesmo diretório para não substituir um arquivo que apareça durante a operação. Se o diretório não for gravável ou o sistema de arquivos não oferecer suporte a hard links, o CLI para com uma orientação para corrigir o acesso ou usar um diretório em um sistema de arquivos compatível. Ele não tenta uma gravação não atômica como alternativa.

O padrão delegado é:

```json
{
  "schemaVersion": 1,
  "delegation": {
    "model": "gpt-6-luna",
    "effort": "high",
    "speed": "standard"
  },
  "accountRules": {
    "repository": null,
    "branch": null,
    "mode": null
  },
  "statusUpdates": {
    "intervalMinutes": 30
  }
}
```

Se a primeira execução incluir opções, elas serão guardadas nessa nova configuração local; isso continua sendo apenas preferência e escopo de proposta, não aceitação ou concessão de regra. Por exemplo:

```sh
bunx holydot@latest setup --repository example/project --branch work --rule-mode requested
```

Com uma configuração já existente, opções passadas a `setup` afetam somente aquela prévia e não salvam mudanças. Para persistir uma alteração, use `configure --write` explicitamente. `init` continua disponível como alternativa que se recusa a sobrescrever um arquivo já existente.

O intervalo local de status por projeto começa em 30 minutos e pode ser configurado entre 1 e 1440 minutos:

```sh
bunx holydot@latest setup --status-interval-minutes 60
```

Em uma configuração existente, `setup --status-interval-minutes 60` apenas mostra a prévia; salve com `configure --status-interval-minutes 60 --write`. Esse número é uma preferência de frequência, não um agendamento instalado. Não envie progresso proativo fora do intervalo; inclua resultados e mudanças no próximo panorama, com uma mensagem separada por projeto. Responda imediatamente a pedidos diretos de status. Se uma decisão, opinião, ação ou aprovação for necessária, use o controle dedicado quando exigido ou ferramenta estruturada permitida, sem esperar o próximo panorama; texto comum é último recurso e não deve virar lista de opções. No informe periódico, lembre apenas intervenções pendentes e ainda sem resposta/ciência; omita essa seção se não houver nenhuma e não repita pedidos resolvidos, cancelados ou substituídos. O holydot orienta o host a usar uma ferramenta real de automação/agendamento se disponível e autorizada e verificar o resultado. O CLI não cria cron, daemon ou serviço de fundo, e não afirma que uma agenda foi ativada pelo texto gerado. Se o host não oferecer esse recurso, informe a limitação.

## Escolher Fast explicitamente

Para optar por Fast no primeiro setup, use a flag explicitamente:

```sh
bunx holydot@latest setup --speed fast
```

Fast pode consumir mais franquia ou créditos. Sem essa opção, o padrão continua Standard. A preferência só pode ser aplicada por um ambiente que ofereça a seleção real, dentro das permissões e aprovações exigidas pelo produto.

## Alterar depois

Veja primeiro a configuração proposta, sem escrever:

```sh
bunx holydot@latest configure --speed fast
```

Para salvar explicitamente:

```sh
bunx holydot@latest configure --speed fast --write
bunx holydot@latest configure --status-interval-minutes 60 --write
bunx holydot@latest render > holydot.instructions.md
```

Para voltar ao padrão, use `--speed standard --write`. Também existem `--model ID` e `--effort low|medium|high`; eles registram preferências, não comprovam que o modelo ou esforço existe na sua conta.

As opções `--repository owner/repo`, `--branch NOME` e `--rule-mode ask|requested` guardam escolhas de escopo para o [setup guiado de regras](account-rules.md). Valores nulos exigem perguntas antes de qualquer proposta; não autorizam autonomia ampla. Em uma pasta com configuração existente, prefira `configure --repository owner/repo --branch NOME --rule-mode ask|requested --write` para persistir essas escolhas; `setup` com flags faz apenas uma prévia.

Cada atualização com `--write` preserva uma cópia anterior com sufixo `.bak-...` e troca o arquivo por uma nova versão. Sem `--write`, `configure` apenas imprime uma proposta. Você também pode editar o JSON manualmente e executar `render` novamente. Campos desconhecidos, versões de esquema incompatíveis e valores inválidos são rejeitados com erro; não são descartados silenciosamente.

`render` escreve apenas na saída padrão. A operação `>` dos exemplos é do seu shell e pode sobrescrever o arquivo de destino; escolha outro nome se quiser preservar uma versão anterior. O CLI não modifica arquivos de instruções existentes por conta própria.

## Aplicar no dot e verificar

Leia o plano gerado e forneça-o na conversa com seu dot, indicando a tarefa ou responsabilidade desejada. Ele contém todas as políticas de `instructions/holydot.md` e uma seção final com as suas preferências explícitas. Essa seção substitui apenas os padrões de modelo, esforço e velocidade para delegação.

O dot deve verificar o suporte real, informar qualquer fallback e respeitar os controles do ambiente. Alterar o JSON não atualiza uma conversa ou conta automaticamente: gere e forneça o texto novamente. Para regras de confirmação, `setup` prepara o plano para que o host conduza as perguntas necessárias, apresente as aprovações reais, aplique somente as mudanças aceitas e verifique o resultado. O CLI nunca aceita ou grava regras de conta. Veja [o fluxo e seus bloqueios](account-rules.md).

Para uma tarefa delegada, confira o modelo/esforço/velocidade efetivamente informados pelo ambiente quando disponíveis. Se não houver como confirmá-los, trate a preferência como não verificada. O pacote não garante aplicação permanente ou cumprimento do comportamento por um modelo.
