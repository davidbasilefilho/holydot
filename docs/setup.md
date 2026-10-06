# Instalação e configuração

O holydot gera um arquivo local de preferências e as instruções que você entrega ao seu dot. O CLI não acessa sua conta, conecta aplicativos, seleciona modelos no servidor ou instala HolyCodex. Ele prepara um setup assistido pelo host para apresentar aprovações e aplicar regras aceitas, quando o host tiver controles reais para isso.

## Pré-requisito e instalação

O CLI é TypeScript executado por **Bun 1.4**, sem uma versão compilada para Node. Instale Bun pelo [guia oficial](https://bun.sh/docs/installation). Para usar só as instruções Markdown, Bun não é necessário.

Depois que uma versão estiver publicada no npm, use uma versão específica para uma instalação reproduzível:

```sh
bun add --dev holydot@VERSAO_PUBLICADA
bunx --no-install holydot init
bunx --no-install holydot render > holydot.instructions.md
```

Substitua `VERSAO_PUBLICADA` pela versão disponível que você revisou. Os exemplos não afirmam que uma versão específica já foi publicada. Durante desenvolvimento, execute `bun scripts/cli.ts` a partir deste checkout no lugar de `bunx --no-install holydot`.

`init` cria `holydot.config.json` na pasta atual, recusa sobrescrever um arquivo existente e já imprime o plano de setup assistido pelo host. O padrão é:

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
  }
}
```

## Escolher Fast explicitamente

Para optar por Fast no primeiro setup:

```sh
bunx --no-install holydot init --speed fast
```

Fast pode consumir mais franquia ou créditos. Essa preferência é opcional; instalar o pacote ou executar `init` sem essa opção mantém Standard. Ela só pode ser aplicada por um ambiente que ofereça a seleção real, dentro das permissões e aprovações exigidas pelo produto.

## Alterar depois

Veja primeiro a configuração proposta, sem escrever:

```sh
bunx --no-install holydot configure --speed fast
```

Para salvar explicitamente:

```sh
bunx --no-install holydot configure --speed fast --write
bunx --no-install holydot render > holydot.instructions.md
```

Para voltar ao padrão, use `--speed standard --write`. Também existem `--model ID` e `--effort low|medium|high`; eles registram preferências, não comprovam que o modelo ou esforço existe na sua conta.

As opções `--repository owner/repo`, `--branch NOME` e `--rule-mode ask|requested` guardam escolhas de escopo para o [setup guiado de regras](account-rules.md). Valores nulos exigem perguntas antes de qualquer proposta; não autorizam autonomia ampla.

Cada atualização com `--write` preserva uma cópia anterior com sufixo `.bak-...` e troca o arquivo por uma nova versão. Sem `--write`, `configure` apenas imprime uma proposta. Você também pode editar o JSON manualmente e executar `render` novamente. Campos desconhecidos, versões de esquema incompatíveis e valores inválidos são rejeitados com erro; não são descartados silenciosamente.

`render` escreve apenas na saída padrão. A operação `>` dos exemplos é do seu shell e pode sobrescrever o arquivo de destino; escolha outro nome se quiser preservar uma versão anterior. O CLI não modifica arquivos de instruções existentes por conta própria.

## Aplicar no dot e verificar

Leia o arquivo gerado e forneça-o na conversa com seu dot, indicando a tarefa ou responsabilidade desejada. Ele contém todas as políticas de `instructions/holydot.md` e uma seção final com as suas preferências explícitas. Essa seção substitui apenas os padrões de modelo, esforço e velocidade para delegação.

O dot deve verificar o suporte real, informar qualquer fallback e respeitar os controles do ambiente. Alterar o JSON não atualiza uma conversa ou conta automaticamente: gere e forneça o texto novamente. Para regras de confirmação, execute `holydot setup` e peça ao host que conduza o plano inteiro: ele deve apresentar as aprovações reais, aplicar somente as mudanças aceitas e verificar o resultado. O CLI nunca aceita ou grava regras de conta. Veja [o fluxo e seus bloqueios](account-rules.md).

Para uma tarefa delegada, confira o modelo/esforço/velocidade efetivamente informados pelo ambiente quando disponíveis. Se não houver como confirmá-los, trate a preferência como não verificada. O pacote não garante aplicação permanente ou cumprimento do comportamento por um modelo.
