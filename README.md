# VSCode Prompt Master

**VSCode Prompt Master** é uma extensão que permite criar e gerenciar prompts para ChatGPT (ou outra IA), usando os arquivos do seu projeto como contexto, sem precisar de um app externo.

## Funcionalidades

- **TreeView** com simulação de “checkbox” no nome do arquivo (ex: `[x] arquivo.txt`).
- **Seleção múltipla** de arquivos/pastas, guardada em estado local.
- **Painel WebView** para gerar texto final combinando os arquivos selecionados e um prompt customizado.
- **Copiar** diretamente o texto final para a área de transferência.

## Como usar

1. **Abra uma pasta** no VSCode (File > Open Folder).
2. **Localize a view “Prompt Master”** na barra lateral (Explorer).
3. **Clique em qualquer item** (arquivo/pasta) na TreeView para alternar `[ ]` <-> `[x]`.
4. **Use o comando** “Prompt Master: Abrir painel de prompts” na Paleta (Ctrl+Shift+P).
5. **No WebView**:
   - Clique em **“Gerar Conteúdo”** para ler e concatenar conteúdo dos arquivos selecionados.
   - Clique em **“Copiar Para Clipboard”** e cole na sua IA preferida.

## Desenvolvendo localmente

1. Rode `npm install`.
2. Rode `npm run compile`.
3. Abra no VSCode e pressione `F5` para iniciar uma segunda instância do editor com a extensão carregada.
4. Nessa nova janela, abra a paleta de comandos e procure por “Prompt Master”.

## Empacotando ou Publicando

- Use `vsce package` para gerar o `.vsix`.
- Use `vsce publish` (se tiver conta) para publicar no Marketplace.

## Licença

[MIT License](./LICENSE)
