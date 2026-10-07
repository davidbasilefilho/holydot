# Setup guiado de regras da conta

O setup prepara uma única instrução para o host conduzir as perguntas, aprovações e aplicação das regras. Ele evita pedir que você copie cada regra separadamente. O CLI sozinho **não tem uma API autenticada de administração da conta ChatGPT**: sem um host compatível recebendo o plano, nenhuma regra é aplicada.

## Escolhas antes da proposta

Informe um repositório e uma branch de trabalho exatos, sem curingas, e escolha o comportamento:

- `ask`: pedir aprovação antes das ações descritas
- `requested`: executar as ações delimitadas quando você pedir esse trabalho, sem repetir a mesma aprovação

O padrão para os três campos é `null`: nenhuma escolha ou concessão ampla é presumida. Preferências de modelo continuam separadas de autorização de conta.

```sh
bunx holydot@X.Y.Z setup --repository example/project --branch work --rule-mode requested
```

Troque `X.Y.Z` pela versão efetivamente publicada que você revisou; `@latest` só funciona depois da primeira publicação estável no npm. O primeiro `setup` cria uma configuração local segura atomicamente, guarda as opções explícitas e imprime o plano completo. Isso não aceita nem aplica regras. Para uma configuração existente:

```sh
bunx holydot@latest configure --repository example/project --branch work --rule-mode requested --write
bunx holydot@latest setup
```

`setup` também aceita esses parâmetros numa configuração existente para preparar uma proposta sem salvar as escolhas; use `configure --write` se quiser persistir. Para reprodução, troque `latest` por uma versão exata publicada, como `X.Y.Z`. Execute o comando por um host ao qual você pediu o setup, ou forneça a saída inteira ao seu dot com esse pedido. Isso é um handoff único, não uma instalação automática na conta feita pelo npm.

## O que o host deve fazer automaticamente no fluxo

1. Perguntar apenas pelas escolhas faltantes: use o controle dedicado quando a plataforma exigir aprovação, autenticação ou decisão de conta; para outras perguntas, use formulário ou ferramenta estruturada de perguntas apropriada. Nunca apresente opções em texto comum. Se nenhum controle adequado estiver disponível, informe o bloqueio sem pedir a decisão por texto.
2. Verificar um gerenciador real de regras da conta. Se não existir, relatar bloqueado e nenhuma aplicação.
3. Ler regras atuais, comparar escopo e comportamento, evitar duplicatas e preservar regras não relacionadas.
4. Verificar os limites e formatos que o host realmente aceita. Se o texto gerado não couber, preparar uma versão concisa que preserve escopo e significado ou, se necessário, dividir em propostas menores, cada uma com aprovação própria. Nunca truncar, ampliar ou dividir silenciosamente para contornar limites. Apresentar o texto final exato no formulário de aprovação dedicado do produto e esperar sua aceitação. Se não houver versão compatível, relatar bloqueado e não aplicar.
5. Aplicar somente alterações aceitas, respeitando cancelamentos e o estado atual. Reconciliar conflitos de revisão antes de tentar novamente.
6. Ler o resultado e distinguir aplicado/verificado, já existente, recusado, pendente e bloqueado.

O host não deve fingir que o gerador já abriu um formulário ou gravou uma regra. A execução depende das capacidades reais do produto e da aprovação do dono; o plano não contorna salvaguardas.

## Exemplo de proposta genérica

> Quando eu pedir trabalho, permita corrigir, testar e publicar correções de baixo risco em example/project, somente na branch work e via PR. Não autoriza merge, deploy, gastos, novos acessos ou dados sensíveis. No meu computador, antes de disparar UAC no Windows, `sudo`/`pkexec` no Linux ou elevação equivalente, verifique se já aprovei de forma informada essa mesma ação, dispositivo e escopo. Se sim, não pergunte de novo; se não, explique o comando ou alteração, o escopo e o motivo, e peça aprovação antes do prompt. Uma aprovação genérica para baixar ou executar não cobre elevação sem informação clara. Peça nova autorização se ação, dispositivo, escopo ou risco mudar materialmente, ou se o host exigir confirmação naquele momento. Se o prompt surgir inesperadamente ou com escopo diferente, não o aceite nem digite credenciais; pause e siga os controles do host. Nunca peça senha no chat nem contorne os controles. Esta regra não cria uma proibição geral para o cloud do dot. Respeite as confirmações obrigatórias do produto.

O exemplo é fictício e não concede permissão por estar no repositório. Cada dono escolhe seu escopo e aceita sua própria alteração. O texto que o CLI gerar não garante compatibilidade com limite ou formato de um host; o host deve validar e mostrar a proposta final para aprovação. Instruções de qualidade, escolha de modelos, economia de recursos e validação visual são comportamentos; não são indevidamente transformadas em regras de autorização.

Referência pública: [controles do dot](https://learn.chatgpt.com/docs/dots/controls). Este projeto não publica esquemas internos de ferramentas, regras privadas salvas ou endpoints de conta não documentados.
