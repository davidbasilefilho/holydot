# Aceitação real

Execute estes cenários na versão e no ambiente informados no handoff de entrega. Não marque um gate como aprovado só porque o teste de texto correspondente passou.

1. Pasta vazia: abrir setup real, conferir papéis distintos/padrões, cancelar e confirmar ausência de arquivo; repetir, alterar preferências e salvar. Setup deve indicar render sem imprimir instruções.
2. Edição: reabrir setup, conferir escolhas existentes, alterar somente um campo, salvar e comparar backup byte a byte. Repetir cancelamento com edições não salvas.
3. Migração: abrir v1, conferir indicação explícita e escolhas de especialistas, cancelar sem alteração; salvar com backup e v2. Render não muda o arquivo v1.
4. Entrada inválida: minutos não inteiros/fora do intervalo, identificador de modelo inválido, caminho com controle, symlink, JSON inválido, arquivo grande e criação/edição concorrente. Não perder conteúdo existente.
5. TUI: teclado e mouse, foco visível, opções, Save/Cancel, Fast opt-in, resize e mensagens de erro em terminais relevantes. Conferir tela real, sem clipping ou sobreposição.
6. CLI: -h/--help e -v/--version no topo e após comandos; init/configure/version/rule-mode devem ser rejeitados. Render imprime instruções completas com as preferências salvas.
7. UTF-8: inspecionar acentos/símbolos na fonte, Bun, terminal, render redirecionado e arquivo entregue. Não confundir bytes corretos com encoding incorreto no terminal receptor.
8. Pacote limpo: instalar tarball local empacotado, executar CLI a partir de outro diretório e repetir setup/render. Não publicar durante este gate.
9. Dot receptor: fornecer render completo pelo fluxo autorizado; verificar nome holydot pelo controle do host, preservando avatar/mascote/cor. Conferir perguntas em lotes e comportamento autorizado. Se o host não oferecer controles, declarar o gate bloqueado.
10. Release: testar planner/channels e filtros de checkpoint; confirmar SHA remoto dos pushes autorizados. OIDC e publicação real exigem autorização separada e evidência de npm/GitHub, sem repetir bootstrap.
