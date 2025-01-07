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
      </style>
    </head>
    <body>
      <h1>Prompt Master</h1>
      <p>Selecione arquivos/pastas na TreeView (imagens e pastas não serão copiadas) e clique em "Gerar & Copiar".</p>

      <label for="promptText"><strong>Escreva seu Prompt:</strong></label><br/>
      <textarea id="promptText"></textarea>

      <button id="btn-generate-copy">Gerar & Copiar</button>
      <p id="status"></p>

      <script>
        const vscode = acquireVsCodeApi();

        document.getElementById("btn-generate-copy").addEventListener("click", () => {
          const promptText = document.getElementById("promptText").value.trim();
          vscode.postMessage({
            command: "generateAndCopy",
            promptText
          });
        });

        window.addEventListener("message", (event) => {
          if (event.data?.command === "generatedContent") {
            const status = document.getElementById("status");
            status.textContent = "Conteúdo gerado e copiado!";
            status.classList.add("visible");

            // Ocultar a mensagem após 3 segundos
            setTimeout(() => {
              status.classList.remove("visible");
            }, 3000);
          }
        });
      </script>
    </body>
    </html>
  `
}
