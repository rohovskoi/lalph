import { Effect } from "effect"
import { PromptGen } from "./PromptGen.ts"
import { Prd } from "./Prd.ts"
import { ChildProcess } from "effect/unstable/process"

export const run = Effect.gen(function* () {
  const promptGen = yield* PromptGen
  const command = ChildProcess.make(
    "npx",
    [
      "-y",
      "opencode-ai@latest",
      "run",
      promptGen.prompt,
      "-f",
      ".lalph/prd.json",
      "-f",
      ".lalph/progress.md",
    ],
    {
      extendEnv: true,
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    },
  )

  console.log(command)

  const agent = yield* command
  const exitCode = yield* agent.exitCode
  yield* Effect.log(`Agent exited with code: ${exitCode}`)
}).pipe(Effect.scoped, Effect.provide([PromptGen.layer, Prd.layer]))
