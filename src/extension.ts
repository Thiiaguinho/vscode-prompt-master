import * as vscode from "vscode"
import { PromptMasterTreeProvider } from "./treeViewProvider"
import { openPromptPanel } from "./webviewPanel"

export function activate(context: vscode.ExtensionContext) {
  const treeDataProvider = new PromptMasterTreeProvider()

  vscode.window.registerTreeDataProvider("promptMasterView", treeDataProvider)

  const openPanelDisposable = vscode.commands.registerCommand(
    "vscode-prompt-master.openPromptPanel",
    () => {
      openPromptPanel(context.extensionUri, treeDataProvider)
    }
  )

  const toggleSelectionDisposable = vscode.commands.registerCommand(
    "vscode-prompt-master.toggleSelection",
    async (element) => {
      await treeDataProvider.toggleSelection(element)
      treeDataProvider.refresh()
    }
  )

  context.subscriptions.push(openPanelDisposable)
  context.subscriptions.push(toggleSelectionDisposable)
}

export function deactivate() {}
