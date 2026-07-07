import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { runCliCommand } from "./runCliCommand.js"

async function main(): Promise<void> {
  const commandsFile = process.argv[2]

  if (!commandsFile) {
    console.log("Uso:")
    console.log("  npm run commands -- commands/mvp1.txt")
    process.exit(1)
  }

  const filePath = resolve(commandsFile)
  const content = await readFile(filePath, "utf-8")

  const lines: string[] = content
    .split(/\r?\n/)
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .filter((line: string) => !line.startsWith("#"))

  console.log(`[commands] Executando ${lines.length} comando(s) de ${commandsFile}`)

  for (const line of lines) {
    console.log("")
    console.log(`> ${line}`)

    const args = line.split(/\s+/)
    await runCliCommand(args)
  }

  console.log("")
  console.log("[commands] Finalizado")
}

main().catch((error) => {
  console.error("[erro]", error.message)
  process.exit(1)
})