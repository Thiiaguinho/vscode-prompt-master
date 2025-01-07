// src/webviewPanel.ts

import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"
import { PromptMasterTreeProvider } from "./treeViewProvider"
import { getHtmlForWebview } from "./webviewHtml"
import { loadCustomPrompts, saveCustomPrompt, deleteCustomPrompt } from "./prompts"

let panel: vscode.WebviewPanel | undefined = undefined

export function openPromptPanel(
  extensionUri: vscode.Uri,
  treeDataProvider: PromptMasterTreeProvider
) {
  if (panel) {
    panel.reveal(vscode.ViewColumn.One)
  } else {
    panel = vscode.window.createWebviewPanel(
      "promptMasterPanel",
      "Prompt Master",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    )

    panel.webview.html = getHtmlForWebview(panel.webview, extensionUri)

    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "generateAndCopy":
          {
            const selectedPaths = treeDataProvider.getSelectedFiles()
            const combined = await concatFilesContent(
              selectedPaths,
              message.selectedPrompts,
              message.promptText
            )
            await vscode.env.clipboard.writeText(combined)

            vscode.window.showInformationMessage(
              "Conteúdo gerado e copiado para a área de transferência!"
            )

            panel?.webview.postMessage({
              command: "generatedContent",
              text: combined,
            })
          }
          break

        case "getCustomPrompts":
          {
            const prompts = await loadCustomPrompts()
            panel?.webview.postMessage({
              command: "listCustomPrompts",
              prompts,
            })
          }
          break

        case "loadMultiplePrompts":
          {
            const prompts = await loadCustomPrompts()
            const selectedNames: string[] = message.names
            let combinedContent = ""
            selectedNames.forEach((name) => {
              const found = prompts.find((p) => p.name === name)
              if (found) {
                // Concatenamos o conteúdo desses prompts
                combinedContent += `\n=== [${found.name}] ===\n${found.content}\n`
              }
            })
            panel?.webview.postMessage({
              command: "loadedMultiplePrompts",
              combinedName: selectedNames.join("+"),
              combinedContent: combinedContent.trim(),
            })
          }
          break

        case "saveCustomPrompt":
          {
            await saveCustomPrompt(message.name, message.content)
            vscode.window.showInformationMessage(`Prompt "${message.name}" salvo com sucesso!`)
            const prompts = await loadCustomPrompts()
            panel?.webview.postMessage({
              command: "listCustomPrompts",
              prompts,
            })
          }
          break

        case "deleteCustomPrompt":
          {
            await deleteCustomPrompt(message.name)
            vscode.window.showInformationMessage(`Prompt "${message.name}" excluído com sucesso!`)
            const prompts = await loadCustomPrompts()
            panel?.webview.postMessage({
              command: "listCustomPrompts",
              prompts,
            })
          }
          break
      }
    }, undefined)

    panel.onDidDispose(() => {
      panel = undefined
    })
  }
}

async function concatFilesContent(
  paths: string[],
  selectedPrompts: string[],
  userPrompt: string
): Promise<string> {
  let finalText = ""

  // Conteúdo dos arquivos selecionados
  for (const filePath of paths) {
    try {
      const stat = fs.lstatSync(filePath)
      if (stat.isDirectory()) {
        continue
      }
      const ext = path.extname(filePath).toLowerCase()
      if (
        [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".ico", ".svg", ".pdf"].includes(ext)
      ) {
        continue
      }

      const relativePath = vscode.workspace.asRelativePath(filePath)
      const doc = await vscode.workspace.openTextDocument(filePath)
      finalText += `---\nPath: ${relativePath}\nConteúdo:\n${doc.getText()}\n---\n\n`
    } catch {
      // Se não conseguir ler, ignore
    }
  }

  // Conteúdo dos prompts selecionados
  const allPrompts = await loadCustomPrompts()
  for (const name of selectedPrompts) {
    const found = allPrompts.find((p) => p.name === name)
    if (found) {
      finalText += `---\nPrompt Personalizado: ${found.name}\nConteúdo:\n${found.content}\n---\n\n`
    }
  }

  // Prompt manual final
  finalText += `PROMPT:\n${userPrompt}\n`
  return finalText
}
