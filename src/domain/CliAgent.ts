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
  env: Record<string, string>
}> {}

export const opencode = new CliAgent({
  id: "opencode",
  name: "opencode",
  env: {
    OPENCODE_PERMISSION: '{"*":"allow"}',
  },
  command: ({ prompt, prdFilePath }) => [
    "opencode",
    "run",
    prompt,
    "-f",
    prdFilePath,
  ],
  commandPlan: ({ prompt, prdFilePath }) => [
    "opencode",
    "--prompt",
    `@${prdFilePath}

${prompt}`,
  ],
})

export const claude = new CliAgent({
  id: "claude",
  name: "Claude Code",
  env: {},
  command: ({ prompt, prdFilePath }) => [
    "claude",
    "-p",
    `@${prdFilePath}

${prompt}`,
  ],
  commandPlan: ({ prompt, prdFilePath }) => [
    "claude",
    `@${prdFilePath}

${prompt}`,
  ],
})

export const allCliAgents = [opencode, claude]
