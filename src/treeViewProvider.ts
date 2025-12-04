import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs"
import ignore from "ignore"

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
      // Se for diretório, usa a lógica inteligente para selecionar apenas arquivos relevantes
      // ou seleciona tudo se estivermos removendo a seleção (para garantir limpeza)
      const allChildren = await this.collectAllChildPaths(item.fullPath, !alreadySelected)
      
      if (alreadySelected) {
        // Desmarcar: removemos filhos e o próprio item
        for (const childPath of allChildren) {
          this.selectedPaths.delete(childPath)
        }
        this.selectedPaths.delete(item.fullPath)
      } else {
        // Marcar: adicionamos filhos filtrados e o próprio item
        for (const childPath of allChildren) {
          this.selectedPaths.add(childPath)
        }
        this.selectedPaths.add(item.fullPath)
      }
    } else {
      // Se for arquivo individual, o usuário tem controle total (pode selecionar ignorados)
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
      const children = dirents.map((dirent) => {
        const fullPath = path.join(currentPath, dirent.name)
        return new FileItem(dirent.name, fullPath, dirent.isDirectory())
      })
      return children
    } catch {
      return []
    }
  }

  /**
   * Coleta recursivamente paths filhos.
   * Se applyFilters = true (ao selecionar), ignora node_modules, dotfiles e .gitignore.
   * Se applyFilters = false (ao desselecionar), coleta tudo para garantir limpeza completa.
   */
  private async collectAllChildPaths(
    startPath: string,
    applyFilters: boolean = true
  ): Promise<string[]> {
    const results: string[] = []

    // Stack para ignoradores: mantém regras de .gitignore baseadas no diretório
    interface IgnoreContext {
      ignorer: ReturnType<typeof ignore>
      root: string
    }
    
    // Função recursiva interna
    const traverse = async (currentPath: string, ignoreStack: IgnoreContext[]) => {
      try {
        const dirents = await fs.promises.readdir(currentPath, { withFileTypes: true })

        // Verifica se há um .gitignore nesta pasta
        const gitIgnorePath = path.join(currentPath, ".gitignore")
        let currentStack = ignoreStack

        if (applyFilters && fs.existsSync(gitIgnorePath)) {
          const content = await fs.promises.readFile(gitIgnorePath, "utf-8")
          const newIgnorer = ignore().add(content)
          // Adiciona novo contexto de ignore à pilha
          currentStack = [...ignoreStack, { ignorer: newIgnorer, root: currentPath }]
        }

        for (const dirent of dirents) {
          const name = dirent.name
          const fullPath = path.join(currentPath, name)

          // 1. Filtros Hardcoded (node_modules e arquivos começando com .)
          if (applyFilters) {
            if (name === "node_modules" || name.startsWith(".")) {
              continue
            }
          }

          // 2. Filtros de .gitignore (acumulados)
          let isIgnored = false
          if (applyFilters && currentStack.length > 0) {
            // Verifica contra todos os .gitignores acumulados até aqui
            for (const ctx of currentStack) {
              // ignore package espera caminho relativo à raiz do arquivo .gitignore
              const relativePath = path.relative(ctx.root, fullPath)
              if (relativePath && ctx.ignorer.ignores(relativePath)) {
                isIgnored = true
                break
              }
            }
          }

          if (isIgnored) {
            continue
          }

          if (dirent.isDirectory()) {
            results.push(fullPath)
            await traverse(fullPath, currentStack)
          } else {
            results.push(fullPath)
          }
        }
      } catch (e) {
        // Ignora erros de permissão ou leitura
      }
    }

    // Inicializa a travessia. 
    // Tentamos pegar o .gitignore da raiz do workspace se estivermos começando de lá ou acima
    const workspaceRoot = vscode.workspace.workspaceFolders 
        ? vscode.workspace.workspaceFolders[0].uri.fsPath 
        : startPath
    
    const initialStack: IgnoreContext[] = []
    
    // Se o startPath for subpasta, precisamos tentar carregar o .gitignore da raiz do workspace primeiro
    // para garantir que regras globais sejam respeitadas
    if (applyFilters && startPath.startsWith(workspaceRoot)) {
        const rootGitIgnore = path.join(workspaceRoot, ".gitignore")
        if (fs.existsSync(rootGitIgnore)) {
            const content = await fs.promises.readFile(rootGitIgnore, "utf-8")
            initialStack.push({ ignorer: ignore().add(content), root: workspaceRoot })
        }
    }

    await traverse(startPath, initialStack)
    return results
  }

  // === INÍCIO DAS NOVAS FUNÇÕES PARA ATUALIZAÇÃO AUTOMÁTICA DA VIEW ===

  public handleFileCreated(filePath: string) {
    if (this.hasAnySelectedParent(filePath)) {
      this.selectedPaths.add(filePath)
    }
    this.refresh()
  }

  public handleFileDeleted(filePath: string) {
    if (this.selectedPaths.has(filePath)) {
      this.selectedPaths.delete(filePath)
    }
    this.refresh()
  }

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
}

export class FileItem {
  constructor(
    public readonly label: string,
    public readonly fullPath: string,
    public readonly isDirectory: boolean
  ) {}
}