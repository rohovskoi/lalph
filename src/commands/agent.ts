import { Command } from "effect/unstable/cli"
import { selectCliAgent } from "../CliAgent.ts"

export const commandAgent = Command.make("agent").pipe(
  Command.withDescription("Select the CLI agent to use"),
  Command.withHandler(() => selectCliAgent),
)
