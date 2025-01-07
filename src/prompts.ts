import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"

/**
 * Lê todos os `.md` de prompts armazenados em .vscode/prompt-master
 */
export async function loadCustomPrompts(): Promise<{ name: string; content: string }[]> {
  if (!vscode.workspace.workspaceFolders) {
    return []
  }
  const root = vscode.workspace.workspaceFolders[0].uri.fsPath
  const promptDir = path.join(root, ".vscode", "prompt-master")

  try {
    const files = await fs.promises.readdir(promptDir)
    const mdFiles = files.filter((f) => f.endsWith(".md"))
    const results = []
    for (const file of mdFiles) {
      const filePath = path.join(promptDir, file)
      const content = await fs.promises.readFile(filePath, "utf-8")
      results.push({
        name: path.basename(file, ".md"),
        content,
      })
    }
    return results
  } catch (error) {
    // Se o diretório não existe, simplesmente retorne vazio
    return []
  }
}

/**
 * Salva um prompt personalizado em .vscode/prompt-master/[nome].md
 */
export async function saveCustomPrompt(name: string, content: string): Promise<void> {
  if (!vscode.workspace.workspaceFolders) {
    return
  }
  const root = vscode.workspace.workspaceFolders[0].uri.fsPath
  const promptDir = path.join(root, ".vscode", "prompt-master")
  if (!fs.existsSync(promptDir)) {
    fs.mkdirSync(promptDir, { recursive: true })
  }
  const filePath = path.join(promptDir, `${name}.md`)
  await fs.promises.writeFile(filePath, content, "utf-8")
}
