import * as vscode from "vscode"

export function getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  return /* html */ `
    <!DOCTYPE html>
    <html lang="en">
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
        pre {
          background-color: #f5f5f5;
          padding: 0.5rem;
          border-radius: 4px;
          overflow: auto;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .info-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: #007acc;
          color: white;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
        }
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 100;
          justify-content: center;
          align-items: center;
        }
        .modal-content {
          background-color: white;
          padding: 20px;
          border-radius: 5px;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
        }
        .close-btn {
          float: right;
          font-size: 20px;
          font-weight: bold;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <h1>Prompt Master</h1>
      <p>Select files/folders from the TreeView and click "Generate & Copy".</p>

      <div class="section">
        <label for="promptText"><strong>Enter your prompt:</strong></label><br/>
        <textarea id="promptText"></textarea>
        <button id="btn-generate-copy">Generate & Copy</button>
        <p id="status"></p>
      </div>

      <div class="section">
        <h2>Custom Prompts</h2>
        <div>
          <label for="promptList">Select one or more Saved Prompts:</label>
          <select id="promptList" multiple size="5"></select>
          <button class="inline-btn" id="btn-load-multiple-prompts">Load into Editor</button>
          <button class="inline-btn" id="btn-delete-prompt">Delete Selected</button>
        </div>
        <div style="margin-top: 1rem;">
          <label for="customPromptName">Name of New/Current Prompt:</label><br/>
          <input id="customPromptName" type="text" style="width: 100%;" />
        </div>
        <div style="margin-top: 1rem;">
          <label for="customPromptContent">Prompt Content:</label><br/>
          <textarea id="customPromptContent"></textarea>
        </div>
        <button id="btn-save-prompt">Save Prompt</button>
      </div>

      <div class="section">
        <div class="section-title">
          <h2>File Operations from Structured Output</h2>
          <div class="info-icon" id="info-btn">i</div>
        </div>
        <p>Paste structured output from LLM to create, delete, or replace files:</p>
        <textarea id="structuredOutput" style="height: 200px;"></textarea>
        <button id="btn-process-output">Process File Operations</button>
        <p id="file-ops-status"></p>
      </div>

      <div id="tutorial-modal" class="modal">
        <div class="modal-content">
          <span class="close-btn" id="close-modal">&times;</span>
          <h3>JSON Format for File Operations</h3>
          <p>The structured output should be a JSON array with objects for each file operation. Each operation must include an "action" and "path" field, with optional "content" field depending on the action.</p>
          <p>Supported actions:</p>
          <ul>
            <li><strong>create</strong>: Creates a new file with the specified content</li>
            <li><strong>delete</strong>: Deletes an existing file</li>
            <li><strong>replace</strong>: Replaces the content of an existing file, or creates it if it doesn't exist</li>
          </ul>
          <p>Example format:</p>
          <pre>
[
  {
    "action": "create",
    "path": "path/to/file.ext",
    "content": "File content goes here"
  },
  {
    "action": "delete", 
    "path": "path/to/delete.ext"
  },
  {
    "action": "replace",
    "path": "path/to/replace.ext",
    "content": "New content for file"
  }
]</pre>
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();

        // Tutorial modal functionality
        const infoBtn = document.getElementById("info-btn");
        const modal = document.getElementById("tutorial-modal");
        const closeModal = document.getElementById("close-modal");

        infoBtn.addEventListener("click", () => {
          modal.style.display = "flex";
        });

        closeModal.addEventListener("click", () => {
          modal.style.display = "none";
        });

        window.addEventListener("click", (event) => {
          if (event.target === modal) {
            modal.style.display = "none";
          }
        });

        // Button to generate and copy (reads multiple selected prompts)
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

        // Request the list of custom prompts when the page loads
        window.addEventListener("load", () => {
          vscode.postMessage({ command: "getCustomPrompts" });
        });

        // Button to load multiple prompts into the editor
        document.getElementById("btn-load-multiple-prompts").addEventListener("click", () => {
          const list = document.getElementById("promptList");
          const selected = Array.from(list.selectedOptions).map(o => o.value);
          if (!selected.length) return;
          vscode.postMessage({
            command: "loadMultiplePrompts",
            names: selected
          });
        });

        // Button to delete prompt (deletes only one, even if multiple are selected)
        document.getElementById("btn-delete-prompt").addEventListener("click", () => {
          const list = document.getElementById("promptList");
          if (!list.value) return;
          vscode.postMessage({
            command: "deleteCustomPrompt",
            name: list.value
          });
        });

        // Button to save prompt
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

        // Button to process structured output
        document.getElementById("btn-process-output").addEventListener("click", () => {
          const structuredOutput = document.getElementById("structuredOutput").value.trim();
          if (!structuredOutput) return;
          vscode.postMessage({
            command: "processStructuredOutput",
            structuredOutput
          });
        });

        // Receive messages from VSCode
        window.addEventListener("message", (event) => {
          const data = event.data;

          if (data?.command === "generatedContent") {
            const status = document.getElementById("status");
            // Display message including token count
            status.textContent = \`Content generated and copied! - \${data.tokenCount} Tokens\`;
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

          if (data?.command === "fileOperationsCompleted") {
            const status = document.getElementById("file-ops-status");
            status.textContent = data.message;
            status.style.color = data.success ? "green" : "red";
            status.classList.add("visible");
            setTimeout(() => {
              status.classList.remove("visible");
            }, 5000);
          }
        });
      </script>
    </body>
    </html>
  `
}
