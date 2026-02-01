import { Command } from "effect/unstable/cli"
import { selectIssueSource } from "../CurrentIssueSource.ts"
import { Settings } from "../Settings.ts"

export const commandSource = Command.make("source").pipe(
  Command.withDescription("Select the issue source to use"),
  Command.withHandler(() => selectIssueSource),
  Command.provide(Settings.layer),
)
