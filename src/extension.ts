import * as vscode from "vscode"
import { PromptMasterTreeProvider } from "./treeViewProvider"
import { openPromptPanel } from "./webviewPanel"

export function activate(context: vscode.ExtensionContext) {
  const treeDataProvider = new PromptMasterTreeProvider()

  vscode.window.registerTreeDataProvider("promptMasterView", treeDataProvider)

  const openPanelDisposable = vscode.commands.registerCommand(
    "vscode-prompt-master.openPromptPanel",
    () => {
      // Passamos o 'context' para o openPromptPanel
      openPromptPanel(context, treeDataProvider)
    }
  )

  const toggleSelectionDisposable = vscode.commands.registerCommand(
    "vscode-prompt-master.toggleSelection",
    async (element) => {
      await treeDataProvider.toggleSelection(element)
      treeDataProvider.refresh()
    }
  )

  // Watcher para atualizar automaticamente a view quando novos arquivos/pastas forem criados/excluídos
  const watcher = vscode.workspace.createFileSystemWatcher("**/*", false, false, false)

  watcher.onDidCreate((uri) => {
    treeDataProvider.handleFileCreated(uri.fsPath)
  })

  watcher.onDidDelete((uri) => {
    treeDataProvider.handleFileDeleted(uri.fsPath)
  })

  context.subscriptions.push(openPanelDisposable)
  context.subscriptions.push(toggleSelectionDisposable)
  context.subscriptions.push(watcher)
}

export function deactivate() {}
