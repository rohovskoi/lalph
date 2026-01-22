import { Command } from "effect/unstable/cli"
import { selectIssueSource } from "../IssueSources.ts"

export const commandSource = Command.make("source").pipe(
  Command.withDescription("Select the issue source to use"),
  Command.withHandler(() => selectIssueSource),
)
