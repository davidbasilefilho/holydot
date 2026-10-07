# Proveniência pública

Esta adaptação usa fontes públicas do repositório [davidbasilefilho/holycodex](https://github.com/davidbasilefilho/holycodex), com a base de instruções e política revisada fixada em `ff1b9ff5c2f35100095f19a4b55802bb931f6434`. A versão descrita pela política é 0.17.0 em desenvolvimento; a base não representa necessariamente o estado atual da branch `next`. Os links abaixo usam o commit imutável, não a branch móvel.

## Fontes

- [Root](https://github.com/davidbasilefilho/holycodex/blob/ff1b9ff5c2f35100095f19a4b55802bb931f6434/overlay/holycodex/instructions/root.md)
- [Specialist](https://github.com/davidbasilefilho/holycodex/blob/ff1b9ff5c2f35100095f19a4b55802bb931f6434/overlay/holycodex/instructions/specialist.md)
- [Política e contratos Rust](https://github.com/davidbasilefilho/holycodex/blob/ff1b9ff5c2f35100095f19a4b55802bb931f6434/crates/holycodex-policy/src/lib.rs)
- [Política de modelos](https://github.com/davidbasilefilho/holycodex/blob/ff1b9ff5c2f35100095f19a4b55802bb931f6434/docs/MODEL-POLICY.md)

O manifesto e a política consultados identificam a versão 0.17.0. Esta atribuição não declara que exista uma release estável.

## Modificações e atribuição

`instructions/holydot.md`, `instructions/specialist.md` e `templates/task.md` adaptam instruções e contratos públicos para orientação textual. A orientação de Root writing do fonte atual substitui qualquer dependência em skill oculta ou distribuída separadamente; o conteúdo de papel usado por Roots e especialistas fica no pacote público. Os demais guias, exemplos, o gerador de configuração e a verificação local são material original desta adaptação.

O texto Apache-2.0 deste pacote é preservado em [LICENSE](../LICENSE). A atribuição pública usada por esta adaptação permanece em [NOTICE](../NOTICE), que identifica HolyCodex e conserva a atribuição aplicável a OpenAI Codex. O holydot não incorpora código Ratatui, o codec toon-rs ou binários do Codex; as atribuições a esses componentes no repositório original não descrevem componentes distribuídos por este pacote.

O pacote de instruções não tem runtime próprio. A manutenção usa Bun, TypeScript e ferramentas de desenvolvimento registradas em package.json e bun.lock; consulte [desenvolvimento](development.md). O uso do texto não depende dessas ferramentas. A existência desta adaptação não implica endosso de OpenAI, HolyCodex ou de seus colaboradores.

## Documentação pública do produto

Também foram consultadas, em 2026-10-06, as páginas oficiais [controles](https://learn.chatgpt.com/docs/dots/controls), [tarefas e memória](https://learn.chatgpt.com/docs/dots/tasks-and-memory) e [início de uso](https://learn.chatgpt.com/docs/dots/getting-started). Elas fundamentam o uso por instrução na conversa, a separação entre regras e acesso e a necessidade de conferir resultados. Nenhuma delas é tratada como documentação de um instalador npm de dots.

As orientações sobre consumo também se apoiam nas páginas oficiais [dots](https://learn.chatgpt.com/docs/dots) e [preços e limites](https://learn.chatgpt.com/docs/pricing), consultadas em 2026-10-06. Não são reproduzidas cotas ou estimativas fixas; consulte a documentação atual e os controles da sua conta.

A página oficial [Visualizations](https://learn.chatgpt.com/docs/visualizations), consultada em 2026-10-06, fundamenta a escolha de formatos visuais e seus limites de superfície. O ciclo de validação da interface real é orientação de qualidade original do holydot, não uma afirmação sobre APIs de instalação ou garantias do produto.

## Atualizações futuras

Antes de mudar a versão-base, leia os arquivos públicos no novo commit, revise o mapa de adaptação e as licenças, atualize as referências fixadas e repita a validação. Não substitua uma base auditável por um link apenas para `main` ou `next`.
