import { Effect, FileSystem, Path } from "effect"
import { PromptGen } from "./PromptGen.ts"
import { Prd } from "./Prd.ts"
import { ChildProcess } from "effect/unstable/process"
import { Worktree } from "./Worktree.ts"
import { getOrSelectCliAgent } from "./CliAgent.ts"
import { Prompt } from "effect/unstable/cli"

export const plan = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  while (true) {
    if (yield* fs.exists("lalph-plan.md")) {
      const shouldContinue = yield* planFollowup
      if (!shouldContinue) {
        break
      }
    } else {
      const idea = yield* Prompt.text({
        message: "Enter the idea / request:",
      })
      yield* planInitial({ idea })
    }
  }
})

const planInitial = Effect.fnUntraced(
  function* (options: { readonly idea: string }) {
    const fs = yield* FileSystem.FileSystem
    const pathService = yield* Path.Path
    const worktree = yield* Worktree
    const promptGen = yield* PromptGen
    const cliAgent = yield* getOrSelectCliAgent

    const cliCommand = cliAgent.command({
      prompt: promptGen.planPrompt(options.idea),
      prdFilePath: pathService.join(".lalph", "prd.json"),
      progressFilePath: "PROGRESS.md",
    })
    const exitCode = yield* ChildProcess.make(
      cliCommand[0]!,
      cliCommand.slice(1),
      {
        cwd: worktree.directory,
        extendEnv: true,
        stdout: "inherit",
        stderr: "inherit",
        stdin: "inherit",
      },
    ).pipe(ChildProcess.exitCode)

    yield* Effect.log(`Agent exited with code: ${exitCode}`)

    const planContent = yield* fs
      .readFileString(pathService.join(worktree.directory, "lalph-plan.md"))
      .pipe(Effect.orElseSucceed(() => ""))

    yield* fs.writeFileString(pathService.resolve("lalph-plan.md"), planContent)
  },
  Effect.scoped,
  Effect.provide([PromptGen.layer, Prd.layer, Worktree.layer]),
)

const planFollowup = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const pathService = yield* Path.Path
  const worktree = yield* Worktree
  const promptGen = yield* PromptGen
  const cliAgent = yield* getOrSelectCliAgent

  yield* fs.copyFile(
    pathService.resolve("lalph-plan.md"),
    pathService.join(worktree.directory, "lalph-plan.md"),
  )

  const feedback = yield* Prompt.text({
    message: "Feedback (leave empty if none):",
  })
  if (feedback.trim() === "") {
    yield* Effect.log("No feedback provided, skipping follow-up planning.")
    return false
  }

  const cliCommand = cliAgent.command({
    prompt: promptGen.planPromptFollowup(feedback),
    prdFilePath: pathService.join(".lalph", "prd.json"),
    progressFilePath: "PROGRESS.md",
  })
  const exitCode = yield* ChildProcess.make(
    cliCommand[0]!,
    cliCommand.slice(1),
    {
      cwd: worktree.directory,
      extendEnv: true,
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    },
  ).pipe(ChildProcess.exitCode)

  yield* Effect.log(`Agent exited with code: ${exitCode}`)

  return true
}).pipe(
  Effect.scoped,
  Effect.provide([PromptGen.layer, Prd.layer, Worktree.layer]),
)
