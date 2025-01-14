import * as fs from "fs"
import * as path from "path"
import * as vscode from "vscode"

/**
 * Retorna a contagem de tokens (palavras) de um único arquivo.
 * Esta função faz a leitura assíncrona do arquivo para não bloquear o loop principal.
 */
async function countTokensInFile(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    fs.readFile(filePath, "utf-8", (err, data) => {
      if (err) {
        // Se ocorrer erro na leitura, consideramos 0 tokens
        return resolve(0)
      }
      // Dividir por espaços em branco ou quebras de linha e filtrar vazios
      const tokens = data.split(/\s+/).filter((token) => token.length > 0)
      resolve(tokens.length)
    })
  })
}

/**
 * Retorna o total de tokens somados de todos os arquivos selecionados.
 * Usa Promise.all para contagem paralela, aumentando a eficiência.
 */
export async function getTotalTokens(paths: string[]): Promise<number> {
  // Filtra diretórios e arquivos que não devem ser lidos (ex: imagens, pdf, etc.).
  // Como exemplo, vamos manter a mesma lógica usada em concatFilesContent
  const extsToIgnore = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".ico", ".svg", ".pdf"]

  // Mapeamos todas as leituras de arquivo
  const promises = paths.map(async (filePath) => {
    try {
      const stat = await fs.promises.lstat(filePath)
      if (stat.isDirectory()) {
        return 0
      }
      const ext = path.extname(filePath).toLowerCase()
      if (extsToIgnore.includes(ext)) {
        return 0
      }
      return await countTokensInFile(filePath)
    } catch {
      // Se não conseguir ler ou for diretório, consideramos 0
      return 0
    }
  })

  const results = await Promise.all(promises)
  // Soma total de tokens
  return results.reduce((sum, current) => sum + current, 0)
}
