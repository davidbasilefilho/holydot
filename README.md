# holydot

Instruções reutilizáveis e configuração local para um dot existente. O holydot pesquisa, prepara, executa e coordena trabalho dentro do escopo autorizado, com eficiência, mergeability, qualidade e autonomia. Não exige HolyCodex instalado.

## Uso

A versão-base do produto é **0.1.0**. Depois de publicada, use a versão exata disponível no npm, sem instalação global ou dependência no seu projeto:

```sh
bunx holydot@0.1.0 setup
bunx holydot@0.1.0 render > holydot.instructions.md
```

Estes comandos descrevem o candidato 0.1.0; a existência deste checkout não comprova publicação. O bootstrap anterior tem outra interface. Para avaliar o checkout local:

```sh
bun scripts/cli.ts setup
bun scripts/cli.ts render > holydot.instructions.md
bun scripts/cli.ts -h
bun scripts/cli.ts --version
```

`setup` abre um editor OpenTUI + Solid, cria ou altera `holydot.config.json` e salva somente quando você escolhe Save. Esc/Cancel cancela. Ao terminar, orienta executar `render`; não imprime as instruções completas. `render` imprime o texto configurado em UTF-8, sem alterar a conta ou o host.

Padrões: coordenação de sessões delegadas GPT-6.1 Sol / medium; especialistas GPT-6 Luna / high; Standard, com Fast opt-in; panorama de 30 minutos como preferência, sem criar agendamento. Repositório e branch pertencem a cada tarefa, não ao setup geral.

## Documentação

- [Setup, edição e migração](docs/setup.md)
- [Uso e limites do host](docs/usage.md)
- [Permissões e regras de conta](docs/account-rules.md)
- [Adaptação e atribuição](docs/adaptation.md)
- [Proveniência pública](docs/provenance.md)
- [Desenvolvimento e arquitetura Effect](docs/development.md)
- [Versões e publicação](docs/releases.md)
- [Mapa de políticas e evidências](docs/policy-index.md)
- [Aceitação real](examples/acceptance.md)

Licença Apache-2.0. Preserve [LICENSE](LICENSE) e [NOTICE](NOTICE) ao redistribuir materiais derivados.
