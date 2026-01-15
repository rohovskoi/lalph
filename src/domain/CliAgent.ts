import { Data } from "effect"

export class CliAgent extends Data.Class<{
  id: string
  name: string
  command: (options: {
    readonly prompt: string
    readonly prdFilePath: string
  }) => ReadonlyArray<string>
  commandPlan: (options: {
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
  commandPlan: ({ prompt, prdFilePath }) => [
    "npx",
    "-y",
    "opencode-ai@latest",
    "--prompt",
    `@${prdFilePath}

${prompt}`,
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
  commandPlan: ({ prompt, prdFilePath }) => [
    "npx",
    "-y",
    "@anthropic-ai/claude-code@latest",
    `@${prdFilePath}

${prompt}`,
  ],
})

export const allCliAgents = [opencode, claude]
