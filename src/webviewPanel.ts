import * as vscode from "vscode"
import * as fs from "fs"
import * as path from "path"
import { PromptMasterTreeProvider } from "./treeViewProvider"
import { getHtmlForWebview } from "./webviewHtml"
import { loadCustomPrompts, saveCustomPrompt, deleteCustomPrompt } from "./prompts"
import { get_encoding } from "tiktoken"
import { XMLParser } from "fast-xml-parser" // Import XML Parser

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
            const combined = await concatFilesContent(
              context,
              selectedPaths,
              message.selectedPrompts,
              message.promptText
            )

            const enc = get_encoding("o200k_base")
            const totalTokens = enc.encode(combined).length
            enc.free()

            await vscode.env.clipboard.writeText(combined)
            vscode.window.showInformationMessage(
              `Content generated and copied - ${totalTokens} Tokens`
            )

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
              // Use the new XML processing function
              await processFileOperationsXML(message.structuredOutput)
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

  const allPrompts = await loadCustomPrompts(context)
  for (const name of selectedPrompts) {
    const found = allPrompts.find((p) => p.name === name)
    if (found) {
      finalText += `---\nPrompt Personalizado: ${found.name}\nConteúdo:\n${found.content}\n---\n\n`
    }
  }

  finalText += `PROMPT:\n${userPrompt}\n`
  return finalText
}

// Define expected structure after XML parsing
interface XmlOperation {
  "@_action": "create" | "delete" | "replace"
  "@_path": string
  content?: string | { "#text": string } | { __cdata: string } // Handle text, CDATA, or empty
}

// New function to process file operations using XML
async function processFileOperationsXML(structuredOutput: string): Promise<void> {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    throw new Error("No workspace open")
  }

  const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath
  const parser = new XMLParser({
    ignoreAttributes: false, // Keep attributes like action and path
    attributeNamePrefix: "@_", // Default prefix for attributes
    textNodeName: "#text", // Default name for text content
    cdataPropName: "__cdata", // Property name for CDATA content
    allowBooleanAttributes: true, // Although not used here, good practice
    parseAttributeValue: true, // Try to parse attribute values (e.g., numbers, booleans)
    trimValues: true, // Trim whitespace from values
    ignoreDeclaration: true, // Ignore <?xml ...?> declaration
  })

  let operations: XmlOperation[] = []

  try {
    const parsedXml = parser.parse(structuredOutput)

    // Check for root <operations> tag
    if (!parsedXml.operations) {
      throw new Error("Missing root <operations> tag in XML input")
    }

    // Access the operation(s). It might be a single object or an array.
    let ops = parsedXml.operations.operation
    if (!ops) {
      // No operations found
      operations = []
    } else if (!Array.isArray(ops)) {
      // Single operation found, wrap in an array
      operations = [ops]
    } else {
      // Multiple operations found (already an array)
      operations = ops
    }
  } catch (error) {
    throw new Error(
      `Failed to parse XML input: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  for (const op of operations) {
    const action = op["@_action"]
    const filePath = op["@_path"]
    let content: string | undefined = undefined

    // Extract content, handling CDATA, plain text, or absence
    if (op.content) {
      if (typeof op.content === "string") {
        content = op.content
      } else if (typeof op.content === "object") {
        if ("__cdata" in op.content && op.content.__cdata !== undefined) {
          content = op.content.__cdata
        } else if ("#text" in op.content && op.content["#text"] !== undefined) {
          content = op.content["#text"]
        }
      }
    }
    content = content ?? "" // Default to empty string if undefined/null

    if (!filePath) {
      throw new Error(`An operation is missing the 'path' attribute`)
    }

    const validActions = ["create", "delete", "replace"]
    if (!action || !validActions.includes(action)) {
      throw new Error(
        `Operation for '${filePath}' has missing or invalid 'action' attribute. Must be one of: ${validActions.join(
          ", "
        )}`
      )
    }

    // Content is required for create/replace, but we default to "" if missing
    // No explicit check needed here as we default content to ""

    const fullPath = path.join(rootPath, filePath)
    const directoryPath = path.dirname(fullPath)

    try {
      switch (action) {
        case "create":
          // Check if file already exists for 'create' action
          if (fs.existsSync(fullPath)) {
            console.warn(
              `File already exists at ${filePath}. Overwriting for 'create' action. Consider using 'replace'.`
            )
            // Allow overwriting for 'create' for simplicity, or throw error:
            // throw new Error(`Cannot create file at '${filePath}', it already exists. Use action="replace" to overwrite.`);
          }
          await fs.promises.mkdir(directoryPath, { recursive: true })
          await fs.promises.writeFile(fullPath, content)
          break

        case "delete":
          if (fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath)
          } else {
            // Optionally warn or ignore if file doesn't exist
            console.warn(`File to delete at '${filePath}' not found. Skipping delete operation.`)
          }
          break

        case "replace":
          // Ensure directory exists before writing
          await fs.promises.mkdir(directoryPath, { recursive: true })
          // Write file, replacing if exists, creating if not
          await fs.promises.writeFile(fullPath, content)
          break
      }
    } catch (err) {
      throw new Error(
        `Failed to perform action '${action}' on path '${filePath}': ${
          err instanceof Error ? err.message : String(err)
        }`
      )
    }
  }
}
