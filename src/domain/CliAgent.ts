import { Data } from "effect"

export class CliAgent extends Data.Class<{
  id: string
  name: string
  command: (options: {
    readonly prompt: string
    readonly prdFilePath: string
  }) => ReadonlyArray<string>
}> {}

export const opencode = new CliAgent({
  id: "opencode",
  name: "opencode",
  command: ({ prompt, prdFilePath }) => [
    "npx",
    "-y",
    "opencode-ai@latest",
    "run",
    prompt,
    "-f",
    prdFilePath,
  ],
})

export const claude = new CliAgent({
  id: "claude",
  name: "Claude Code",
  command: ({ prompt, prdFilePath }) => [
    "npx",
    "-y",
    "@anthropic-ai/claude-code@latest",
    "-p",
    `@${prdFilePath}

${prompt}`,
  ],
})

export const allCliAgents = [opencode, claude]
