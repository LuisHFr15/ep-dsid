import { runCliCommand } from "./runCliCommand.js"

runCliCommand(process.argv.slice(2)).catch((error) => {
  console.error("[erro]", error.message)
  process.exit(1)
})