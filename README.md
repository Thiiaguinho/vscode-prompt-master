# VSCode Prompt Master

**VSCode Prompt Master** é uma extensão que permite criar e gerenciar prompts para ChatGPT (ou outra IA), usando os arquivos do seu projeto como contexto, sem precisar de um app externo.

## Funcionalidades

- **TreeView** com simulação de “checkbox” no nome do arquivo (ex: `[x] arquivo.txt`).
- **Seleção múltipla** de arquivos/pastas, guardada em estado local.
- **Painel WebView** para gerar texto final combinando os arquivos selecionados, prompts personalizados (você pode escolher mais de um) e um prompt manual customizado.
- **Copiar** diretamente o texto final para a área de transferência.

## Como usar

1. **Abra uma pasta** no VSCode (File > Open Folder).
2. **Localize a view “Prompt Master”** na barra lateral (Explorer).
3. **Clique em qualquer item** (arquivo/pasta) na TreeView para alternar `[ ]` <-> `[x]`.
   - Arquivos marcados `[x]` serão incluídos no conteúdo final.
4. **Gerencie Prompts Personalizados**:
   - No painel WebView do Prompt Master, há uma seção de “Prompts Personalizados”.
   - Para criar ou atualizar um prompt, insira o nome e o conteúdo, depois clique em “Salvar Prompt”.
   - Para excluir, selecione o prompt desejado na lista e clique em “Excluir Selecionado”.
   - Para usar vários prompts personalizados ao mesmo tempo, mantenha a tecla **Ctrl** pressionada (no Windows ou Linux) ou **Command** (no macOS) ao clicar nos prompts na lista.
5. **Carregar vários prompts no editor** (opcional):
   - Se quiser editar vários prompts simultaneamente, selecione todos (mantendo `Ctrl` ou `Command` pressionado) e clique em “Carregar no Editor”. Assim, o conteúdo de cada um será concatenado em uma única caixa de texto para edição.
6. **Use o comando** “Prompt Master: Abrir painel de prompts” na Paleta (Ctrl+Shift+P) para abrir a interface WebView.
7. **No WebView**:
   - Escreva o seu prompt manual no campo de texto “Escreva seu Prompt” (opcional).
   - Selecione (ou não) um ou mais prompts personalizados na lista.
   - Clique em **“Gerar & Copiar”** para concatenar conteúdo dos arquivos marcados e dos prompts selecionados, finalizando com o prompt manual, e copiar tudo para a área de transferência.
8. **Use o atalho de teclado `Alt+2`**:
   - Pressione `Alt+2` para abrir o painel Prompt Master diretamente, sem precisar da Paleta de Comandos.

## Desenvolvendo localmente

1. Rode `npm install`.
2. Rode `npm run compile`.
3. Abra no VSCode e pressione `F5` para iniciar uma segunda instância do editor com a extensão carregada.
4. Nessa nova janela, abra a paleta de comandos e procure por “Prompt Master”.

## Empacotando ou Publicando

- Use `vsce package` para gerar o `.vsix`.
- Use `vsce publish` (se tiver conta) para publicar no Marketplace.

## Licença

[MIT License](https://mit-license.org/)
