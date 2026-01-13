import { Array, Effect, Option } from "effect"
import { Prompt } from "effect/unstable/cli"
import { allCliAgents } from "./domain/CliAgent.ts"
import { selectedCliAgentId } from "./Settings.ts"

export const selectCliAgent = Effect.gen(function* () {
  const agent = yield* Prompt.select({
    message: "Select the CLI agent to use",
    choices: allCliAgents.map((agent) => ({
      title: agent.name,
      value: agent,
    })),
  })
  yield* selectedCliAgentId.set(Option.some(agent.id))
  return agent
})

export const getOrSelectCliAgent = Effect.gen(function* () {
  const selectedAgent = (yield* selectedCliAgentId.get).pipe(
    Option.filterMap((id) =>
      Array.findFirst(allCliAgents, (agent) => agent.id === id),
    ),
  )
  if (Option.isSome(selectedAgent)) {
    return selectedAgent.value
  }
  return yield* selectCliAgent
})
