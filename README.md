# holydot

Políticas de trabalho do HolyCodex 0.17 adaptadas para um dot que você já usa no ChatGPT. Um pacote de instruções e contratos reutilizáveis, sem aplicativo, servidor ou runtime próprio.

O objetivo é simples: definir o resultado esperado, dividir trabalho quando isso ajudar e aceitar entregas com evidências verificáveis. O pacote não recria capacidades que o ambiente já oferece.

## Comece aqui

1. Leia [limites e uso](docs/usage.md).
2. Copie [as instruções principais](instructions/holydot.md) para uma mensagem na conversa do seu dot e peça que sejam usadas na tarefa atual.
3. Descreva a tarefa usando [o contrato](templates/task.md). Para uma pergunta simples, uma frase basta.
4. Confira a resposta com [os exemplos de aceitação](examples/acceptance.md).

Isso não instala nada. Uma mensagem não garante aplicação permanente. Se seu ambiente oferecer um campo apropriado de instruções, você pode usar o mesmo texto ali, respeitando os limites e as regras desse ambiente. Este projeto não pressupõe um menu específico nem uma API de configuração de dots.

## Conteúdo

- [Instruções principais](instructions/holydot.md): coordenação, escopo e aceitação
- [Especialistas](instructions/specialist.md): contrato opcional para delegação real
- [Contrato de tarefa](templates/task.md): intenção, critérios e evidências
- [Relatório de resultado](templates/result.md): resultado, verificações e limites
- [Mapa da adaptação](docs/adaptation.md): o que veio do HolyCodex e o que não foi portado
- [Proveniência](docs/provenance.md): fontes públicas fixadas e licença

## O que o pacote não faz

Não escolhe modelos, altera esforço de raciocínio, instala ferramentas, concede acesso, cria agentes ou impõe isolamento. Não inclui monitor de CI, review bot ou agendador para o dot. Os workflows deste próprio repositório verificam e distribuem o pacote; não monitoram outros projetos. Quando disponíveis e autorizadas, essas funções continuam sendo responsabilidade do ambiente existente.

As instruções são orientação comportamental, não garantias executáveis. A validação local verifica a integridade deste pacote, não o comportamento de um modelo.

## Verificação local

Em um checkout Git deste repositório, com [mise](https://mise.jdx.dev/) instalado:

```sh
mise install
mise exec -- bun install --frozen-lockfile
mise exec -- bun run check
```

Esses comandos são para desenvolver e verificar o pacote. Para apenas usar o texto, não é necessário instalar ferramentas. Consulte [desenvolvimento](docs/development.md) para testes, JSDoc, hooks e publicação. Nenhuma instalação configura o seu dot automaticamente.

## Origem e licença

Adaptação independente do [HolyCodex 0.17.0](https://github.com/davidbasilefilho/holycodex/tree/089e8f27c6d63a2303b78d4e92eae9cca567e6d4), com fonte fixada em commit, sob [Apache-2.0](LICENSE). Consulte [NOTICE](NOTICE). Não é um produto oficial da OpenAI e não implica endosso.
