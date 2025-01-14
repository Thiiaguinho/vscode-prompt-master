// src/webviewHtml.ts

import * as vscode from "vscode"

export function getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  return /* html */ `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>Prompt Master</title>
      <style>
        body {
          font-family: sans-serif;
          margin: 0;
          padding: 1rem;
        }
        textarea {
          width: 100%;
          height: 100px;
        }
        button {
          margin-top: 1rem;
          padding: 0.4rem 0.8rem;
          cursor: pointer;
        }
        #status {
          color: green;
          margin-top: 0.5rem;
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
        }
        #status.visible {
          opacity: 1;
        }
        .section {
          margin-top: 2rem;
          padding: 1rem;
          border: 1px solid #ccc;
        }
        select {
          width: 100%;
          margin-top: 0.5rem;
        }
        .inline-btn {
          margin-left: 0.5rem;
        }
      </style>
    </head>
    <body>
      <h1>Prompt Master</h1>
      <p>Selecione arquivos/pastas na TreeView e clique em "Gerar & Copiar".</p>

      <div class="section">
        <label for="promptText"><strong>Escreva seu Prompt:</strong></label><br/>
        <textarea id="promptText"></textarea>
        <button id="btn-generate-copy">Gerar & Copiar</button>
        <p id="status"></p>
      </div>

      <div class="section">
        <h2>Prompts Personalizados</h2>
        <div>
          <label for="promptList">Selecione um ou mais Prompts Salvos:</label>
          <select id="promptList" multiple size="5"></select>
          <button class="inline-btn" id="btn-load-multiple-prompts">Carregar no Editor</button>
          <button class="inline-btn" id="btn-delete-prompt">Excluir Selecionado</button>
        </div>
        <div style="margin-top: 1rem;">
          <label for="customPromptName">Nome do Novo/Atual Prompt:</label><br/>
          <input id="customPromptName" type="text" style="width: 100%;" />
        </div>
        <div style="margin-top: 1rem;">
          <label for="customPromptContent">Conteúdo do Prompt:</label><br/>
          <textarea id="customPromptContent"></textarea>
        </div>
        <button id="btn-save-prompt">Salvar Prompt</button>
      </div>

      <script>
        const vscode = acquireVsCodeApi();

        // Botão de gerar e copiar (lê vários prompts selecionados)
        document.getElementById("btn-generate-copy").addEventListener("click", () => {
          const promptText = document.getElementById("promptText").value.trim();
          const list = document.getElementById("promptList");
          const selectedPrompts = Array.from(list.selectedOptions).map(o => o.value);

          vscode.postMessage({
            command: "generateAndCopy",
            promptText,
            selectedPrompts
          });
        });

        // Solicitar a lista de prompts ao carregar a página
        window.addEventListener("load", () => {
          vscode.postMessage({ command: "getCustomPrompts" });
        });

        // Botão de carregar vários prompts no editor
        document.getElementById("btn-load-multiple-prompts").addEventListener("click", () => {
          const list = document.getElementById("promptList");
          const selected = Array.from(list.selectedOptions).map(o => o.value);
          if (!selected.length) return;
          vscode.postMessage({
            command: "loadMultiplePrompts",
            names: selected
          });
        });

        // Botão de excluir prompt (remove apenas um, se vários estiverem selecionados, remove o primeiro)
        document.getElementById("btn-delete-prompt").addEventListener("click", () => {
          const list = document.getElementById("promptList");
          if (!list.value) return;
          vscode.postMessage({
            command: "deleteCustomPrompt",
            name: list.value
          });
        });

        // Botão de salvar prompt
        document.getElementById("btn-save-prompt").addEventListener("click", () => {
          const name = document.getElementById("customPromptName").value.trim();
          const content = document.getElementById("customPromptContent").value;
          if (!name) return;
          vscode.postMessage({
            command: "saveCustomPrompt",
            name,
            content
          });
        });

        // Recebe mensagens do VSCode
        window.addEventListener("message", (event) => {
          const data = event.data;

          if (data?.command === "generatedContent") {
            const status = document.getElementById("status");
            // Exibe a mensagem incluindo a contagem de tokens
            status.textContent = \`Conteúdo gerado e copiado! - \${data.tokenCount} Tokens\`;
            status.classList.add("visible");
            setTimeout(() => {
              status.classList.remove("visible");
            }, 3000);
          }

          if (data?.command === "listCustomPrompts") {
            const list = document.getElementById("promptList");
            list.innerHTML = "";
            (data.prompts || []).forEach((p) => {
              const option = document.createElement("option");
              option.value = p.name;
              option.textContent = p.name;
              list.appendChild(option);
            });
          }

          if (data?.command === "loadedMultiplePrompts") {
            document.getElementById("customPromptName").value = data.combinedName;
            document.getElementById("customPromptContent").value = data.combinedContent;
          }
        });
      </script>
    </body>
    </html>
  `
}
