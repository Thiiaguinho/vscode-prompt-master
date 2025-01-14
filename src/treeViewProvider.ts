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
    const checkboxSymbol = this.isSelected(element.fullPath) ? "[x]" : "[ ]"
    const displayName = `${checkboxSymbol} ${element.label}`

    const treeItem = new vscode.TreeItem(
      displayName,
      element.isDirectory
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    )

    treeItem.command = {
      command: "vscode-prompt-master.toggleSelection",
      title: "",
      arguments: [element],
    }

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
        // Ignora arquivos/pastas que começam com "."
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

  // === INÍCIO DAS NOVAS FUNÇÕES PARA ATUALIZAÇÃO AUTOMÁTICA DA VIEW ===

  /**
   * Chamado quando um arquivo ou pasta é criado.
   * Se a pasta pai estiver selecionada, este novo path também passa a ser selecionado.
   */
  public handleFileCreated(filePath: string) {
    // Se algum ancestral estiver selecionado, marcamos o novo path também
    if (this.hasAnySelectedParent(filePath)) {
      this.selectedPaths.add(filePath)
    }
    this.refresh()
  }

  /**
   * Chamado quando um arquivo ou pasta é excluído.
   * Se o path estiver selecionado, removemos da seleção.
   */
  public handleFileDeleted(filePath: string) {
    if (this.selectedPaths.has(filePath)) {
      this.selectedPaths.delete(filePath)
    }
    this.refresh()
  }

  /**
   * Verifica se algum diretório pai (ancestral) está selecionado.
   * Se sim, então novos arquivos criados nesse diretório também devem ser selecionados.
   */
  private hasAnySelectedParent(filePath: string): boolean {
    let current = path.dirname(filePath)
    while (true) {
      if (this.selectedPaths.has(current)) {
        return true
      }
      const parent = path.dirname(current)
      if (parent === current) {
        break
      }
      current = parent
    }
    return false
  }

  // === FIM DAS NOVAS FUNÇÕES PARA ATUALIZAÇÃO AUTOMÁTICA DA VIEW ===
}

export class FileItem {
  constructor(
    public readonly label: string,
    public readonly fullPath: string,
    public readonly isDirectory: boolean
  ) {}
}
