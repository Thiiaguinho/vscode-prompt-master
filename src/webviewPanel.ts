import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"
import { PromptMasterTreeProvider } from "./treeViewProvider"
import { getHtmlForWebview } from "./webviewHtml"
import { loadCustomPrompts, saveCustomPrompt, deleteCustomPrompt } from "./prompts"
import { get_encoding } from "tiktoken"

let panel: vscode.WebviewPanel | undefined = undefined

export function openPromptPanel(
  context: vscode.ExtensionContext,
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

    panel.webview.html = getHtmlForWebview(panel.webview, context.extensionUri)

    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "generateAndCopy":
          {
            const selectedPaths = treeDataProvider.getSelectedFiles()
            // Concatena o conteúdo dos arquivos selecionados + prompts selecionados + prompt manual
            const combined = await concatFilesContent(
              context,
              selectedPaths,
              message.selectedPrompts,
              message.promptText
            )

            // Calcula a quantidade total de tokens contando arquivos, prompts personalizados e prompt manual
            const enc = get_encoding("o200k_base")
            const totalTokens = enc.encode(combined).length
            enc.free()

            // Copia somente o texto combinado, sem a contagem de tokens ao final
            await vscode.env.clipboard.writeText(combined)

            // Exibe mensagem no VSCode com a contagem de tokens
            vscode.window.showInformationMessage(
              `Content generated and copied - ${totalTokens} Tokens`
            )

            // Envia mensagem ao WebView incluindo a contagem de tokens
            panel?.webview.postMessage({
              command: "generatedContent",
              text: combined,
              tokenCount: totalTokens,
            })
          }
          break

        case "getCustomPrompts":
          {
            const prompts = await loadCustomPrompts(context)
            panel?.webview.postMessage({
              command: "listCustomPrompts",
              prompts,
            })
          }
          break

        case "loadMultiplePrompts":
          {
            const prompts = await loadCustomPrompts(context)
            const selectedNames: string[] = message.names
            let combinedContent = ""
            selectedNames.forEach((name) => {
              const found = prompts.find((p) => p.name === name)
              if (found) {
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
            await saveCustomPrompt(context, message.name, message.content)
            vscode.window.showInformationMessage(`Prompt "${message.name}" saved successfully!`)
            const prompts = await loadCustomPrompts(context)
            panel?.webview.postMessage({
              command: "listCustomPrompts",
              prompts,
            })
          }
          break

        case "deleteCustomPrompt":
          {
            await deleteCustomPrompt(context, message.name)
            vscode.window.showInformationMessage(`Prompt "${message.name}" deleted successfully!`)
            const prompts = await loadCustomPrompts(context)
            panel?.webview.postMessage({
              command: "listCustomPrompts",
              prompts,
            })
          }
          break

        case "processStructuredOutput":
          {
            try {
              await processFileOperations(message.structuredOutput)
              panel?.webview.postMessage({
                command: "fileOperationsCompleted",
                success: true,
                message: "File operations completed successfully!",
              })
            } catch (error) {
              panel?.webview.postMessage({
                command: "fileOperationsCompleted",
                success: false,
                message: `Error: ${error instanceof Error ? error.message : String(error)}`,
              })
            }
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
  context: vscode.ExtensionContext,
  paths: string[],
  selectedPrompts: string[],
  userPrompt: string
): Promise<string> {
  let finalText = ""
  const extsToIgnore = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".webp",
    ".ico",
    ".svg",
    ".tiff",
    ".tif",
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".wmv",
    ".flv",
    ".webm",
    ".mpeg",
    ".mpg",
    ".exe",
    ".dll",
    ".bin",
    ".iso",
    ".dmg",
    ".apk",
    ".jar",
    ".class",
    ".pdb",
    ".obj",
    ".lib",
    ".so",
    ".a",
    ".o",
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
    ".bz2",
    ".pdf",
  ]
  for (const filePath of paths) {
    try {
      const stat = fs.lstatSync(filePath)
      if (stat.isDirectory()) {
        continue
      }
      const ext = path.extname(filePath).toLowerCase()
      if (extsToIgnore.includes(ext)) {
        continue
      }
      const relativePath = vscode.workspace.asRelativePath(filePath)
      const doc = await vscode.workspace.openTextDocument(filePath)
      finalText += `---\nPath: ${relativePath}\nConteúdo:\n${doc.getText()}\n---\n\n`
    } catch {}
  }

  // Conteúdo dos prompts selecionados
  const allPrompts = await loadCustomPrompts(context)
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

interface FileOperation {
  action: "create" | "delete" | "replace"
  path: string
  content?: string
}

async function processFileOperations(structuredOutput: string): Promise<void> {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    throw new Error("No workspace open")
  }

  const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath
  let operations: FileOperation[]

  try {
    operations = JSON.parse(structuredOutput)
    if (!Array.isArray(operations)) {
      throw new Error("The structured output must be an array of operations")
    }
  } catch (error) {
    throw new Error(
      `Failed to parse structured output: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  for (const op of operations) {
    const { action, path: filePath, content } = op

    if (!filePath) {
      throw new Error(`An operation is missing the 'path' field`)
    }

    if (!action) {
      throw new Error(`An operation is missing the 'action' field`)
    }

    if ((action === "create" || action === "replace") && content === undefined) {
      throw new Error(`Operation ${action} for '${filePath}' is missing the 'content' field`)
    }

    const fullPath = path.join(rootPath, filePath)
    const directoryPath = path.dirname(fullPath)

    switch (action) {
      case "create":
        await fs.promises.mkdir(directoryPath, { recursive: true })
        await fs.promises.writeFile(fullPath, content || "")
        break

      case "delete":
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath)
        }
        break

      case "replace":
        if (fs.existsSync(fullPath)) {
          await fs.promises.writeFile(fullPath, content || "")
        } else {
          await fs.promises.mkdir(directoryPath, { recursive: true })
          await fs.promises.writeFile(fullPath, content || "")
        }
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }
}
