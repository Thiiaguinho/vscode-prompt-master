import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"

export class PromptMasterTreeProvider implements vscode.TreeDataProvider<FileItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | void> =
    new vscode.EventEmitter<FileItem | undefined | void>()
  public readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | void> =
    this._onDidChangeTreeData.event

  private selectedPaths: Set<string> = new Set<string>()

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  isSelected(fullPath: string): boolean {
    return this.selectedPaths.has(fullPath)
  }

  async toggleSelection(item: FileItem) {
    const alreadySelected = this.isSelected(item.fullPath)
    if (item.isDirectory) {
      // Se for diretório, seleciona/desseleciona tudo dentro dele recursivamente
      const allChildren = await this.collectAllChildPaths(item.fullPath)
      if (alreadySelected) {
        for (const childPath of allChildren) {
          this.selectedPaths.delete(childPath)
        }
        this.selectedPaths.delete(item.fullPath)
      } else {
        for (const childPath of allChildren) {
          this.selectedPaths.add(childPath)
        }
        this.selectedPaths.add(item.fullPath)
      }
    } else {
      if (alreadySelected) {
        this.selectedPaths.delete(item.fullPath)
      } else {
        this.selectedPaths.add(item.fullPath)
      }
    }
  }

  getSelectedFiles(): string[] {
    return Array.from(this.selectedPaths.values())
  }

  getTreeItem(element: FileItem): vscode.TreeItem {
    // Não abrir/collapse ao clicar no label: vamos remover a ação padrão e usar outro "trick" abaixo
    const checkboxSymbol = this.isSelected(element.fullPath) ? "[x]" : "[ ]"
    const displayName = `${checkboxSymbol} ${element.label}`

    const treeItem = new vscode.TreeItem(
      displayName,
      element.isDirectory
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    )

    // O comando abaixo serve apenas para togglar seleção.
    // Isso previne que o VSCode abra/feche a pasta ao clicar no label (ficando só na setinha).
    treeItem.command = {
      command: "vscode-prompt-master.toggleSelection",
      title: "",
      arguments: [element],
    }

    // Recurso: o tooltip do item (opcional)
    treeItem.tooltip = element.fullPath

    treeItem.contextValue = element.isDirectory ? "folder" : "file"
    treeItem.resourceUri = vscode.Uri.file(element.fullPath)

    return treeItem
  }

  async getChildren(element?: FileItem): Promise<FileItem[]> {
    if (!vscode.workspace.workspaceFolders) {
      return []
    }
    const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath
    const currentPath = element ? element.fullPath : rootPath

    try {
      const dirents = await fs.promises.readdir(currentPath, { withFileTypes: true })
      const children = dirents
        // Ignora ocultos
        .filter((dirent) => !dirent.name.startsWith("."))
        .map((dirent) => {
          const fullPath = path.join(currentPath, dirent.name)
          return new FileItem(dirent.name, fullPath, dirent.isDirectory())
        })
      return children
    } catch {
      return []
    }
  }

  // Coleta recursivamente todos os paths (arquivos/pastas) de um diretório
  private async collectAllChildPaths(dirPath: string): Promise<string[]> {
    const result: string[] = []
    const stack = [dirPath]

    while (stack.length > 0) {
      const current = stack.pop()!
      try {
        const dirents = await fs.promises.readdir(current, { withFileTypes: true })
        for (const dirent of dirents) {
          if (dirent.name.startsWith(".")) {
            continue
          }
          const full = path.join(current, dirent.name)
          if (dirent.isDirectory()) {
            stack.push(full)
            result.push(full)
          } else {
            result.push(full)
          }
        }
      } catch {
        // Se não for possível ler, ignore
      }
    }

    return result
  }
}

export class FileItem {
  constructor(
    public readonly label: string,
    public readonly fullPath: string,
    public readonly isDirectory: boolean
  ) {}
}
