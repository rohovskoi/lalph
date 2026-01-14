import { Effect, Layer, Option, Schema } from "effect"
import { Setting } from "./Settings.ts"
import { LinearIssueSource, resetLinear } from "./Linear.ts"
import { Prompt } from "effect/unstable/cli"

const issueSources = [
  {
    id: "linear",
    name: "Linear",
    layer: LinearIssueSource,
    reset: resetLinear,
  },
] as const

const selectedIssueSource = new Setting(
  "issueSource",
  Schema.Literals(issueSources.map((s) => s.id)),
)

export const selectIssueSource = Effect.gen(function* () {
  const source = yield* Prompt.select({
    message: "Select issue source:",
    choices: issueSources.map((s) => ({
      title: s.name,
      value: s,
    })),
  })
  yield* selectedIssueSource.set(Option.some(source.id))
  yield* source.reset
  return source
})

const getOrSelectIssueSource = Effect.gen(function* () {
  const issueSource = yield* selectedIssueSource.get
  if (Option.isSome(issueSource)) {
    return issueSources.find((s) => s.id === issueSource.value)!
  }
  return yield* selectIssueSource
})

export const CurrentIssueSource = Layer.unwrap(
  Effect.gen(function* () {
    const source = yield* getOrSelectIssueSource
    return source.layer
  }),
)
