import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"

/**
 * Retorna o caminho absoluto do diretório global onde os prompts serão salvos.
 * Exemplo: <UserData>/User/globalStorage/<extension-id>/prompt-master
 */
function getGlobalPromptsDir(context: vscode.ExtensionContext): string {
  const globalDir = path.join(context.globalStorageUri.fsPath, "prompt-master")
  if (!fs.existsSync(globalDir)) {
    fs.mkdirSync(globalDir, { recursive: true })
  }
  return globalDir
}

/**
 * Lê todos os `.md` de prompts armazenados globalmente
 */
export async function loadCustomPrompts(
  context: vscode.ExtensionContext
): Promise<{ name: string; content: string }[]> {
  const promptDir = getGlobalPromptsDir(context)
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
    // Se o diretório ainda não existir ou outra falha, retorne vazio
    return []
  }
}

/**
 * Salva um prompt personalizado globalmente em <globalPromptsDir>/<nome>.md
 */
export async function saveCustomPrompt(
  context: vscode.ExtensionContext,
  name: string,
  content: string
): Promise<void> {
  const promptDir = getGlobalPromptsDir(context)
  const filePath = path.join(promptDir, `${name}.md`)
  await fs.promises.writeFile(filePath, content, "utf-8")
}

/**
 * Exclui um prompt personalizado global em <globalPromptsDir>/<nome>.md
 */
export async function deleteCustomPrompt(
  context: vscode.ExtensionContext,
  name: string
): Promise<void> {
  const promptDir = getGlobalPromptsDir(context)
  const filePath = path.join(promptDir, `${name}.md`)
  try {
    await fs.promises.unlink(filePath)
  } catch (error) {
    // Se o arquivo não existir, apenas ignore
  }
}
