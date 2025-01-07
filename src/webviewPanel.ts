// src/webviewPanel.ts

import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"
import { PromptMasterTreeProvider } from "./treeViewProvider"
import { getHtmlForWebview } from "./webviewHtml"

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
          const selectedPaths = treeDataProvider.getSelectedFiles()
          const combined = await concatFilesContent(selectedPaths, message.promptText)
          await vscode.env.clipboard.writeText(combined)

          // Exibe a notificação no VSCode
          vscode.window.showInformationMessage(
            "Conteúdo gerado e copiado para a área de transferência!"
          )

          // Opcional: enviar uma confirmação para o WebView, se desejar manter
          panel?.webview.postMessage({
            command: "generatedContent",
            text: combined,
          })
          break
      }
    }, undefined)

    panel.onDidDispose(() => {
      panel = undefined
    })
  }
}

async function concatFilesContent(paths: string[], userPrompt: string): Promise<string> {
  let finalText = ""

  for (const filePath of paths) {
    try {
      // Se for pasta ou imagem, ignorar
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

      const doc = await vscode.workspace.openTextDocument(filePath)
      finalText += `---\nPath: ${filePath}\nConteúdo:\n${doc.getText()}\n---\n\n`
    } catch {
      // Se não conseguir ler, ignore
    }
  }

  finalText += `\nPROMPT:\n${userPrompt}\n`
  return finalText
}
