import {
  Array,
  Effect,
  FileSystem,
  Layer,
  Path,
  Schedule,
  ServiceMap,
  Stream,
} from "effect"
import { Worktree } from "./Worktree.ts"
import { PrdIssue } from "./domain/PrdIssue.ts"
import { IssueSource } from "./IssueSource.ts"

export class Prd extends ServiceMap.Service<Prd>()("lalph/Prd", {
  make: Effect.gen(function* () {
    const worktree = yield* Worktree
    const pathService = yield* Path.Path
    const fs = yield* FileSystem.FileSystem
    const source = yield* IssueSource

    const lalphDir = pathService.join(worktree.directory, `.lalph`)
    const prdFile = pathService.join(worktree.directory, `.lalph`, `prd.yml`)

    let current = yield* source.issues
    yield* fs.writeFileString(prdFile, PrdIssue.arrayToYaml(current))

    const updatedIssues = new Map<
      string,
      {
        readonly issue: PrdIssue
        readonly originalStateId: string
        count: number
      }
    >()

    yield* fs.watch(lalphDir).pipe(
      Stream.buffer({
        capacity: 1,
        strategy: "dropping",
      }),
      Stream.runForEach((_) => Effect.ignore(sync)),
      Effect.retry(Schedule.forever),
      Effect.forkScoped,
    )

    const sync = Effect.gen(function* () {
      const yaml = yield* fs.readFileString(prdFile)
      const updated = PrdIssue.arrayFromYaml(yaml)
      const anyChanges =
        updated.length !== current.length ||
        updated.some((u, i) => u.isChangedComparedTo(current[i]!))
      if (!anyChanges) {
        return
      }

      const githubPrs = new Map<string, number>()
      const toRemove = new Set(
        current.filter((i) => i.id !== null).map((i) => i.id!),
      )
      let createdIssues = 0

      for (const issue of updated) {
        toRemove.delete(issue.id!)

        if (issue.id === null) {
          yield* source.createIssue(issue)
          createdIssues++
          continue
        }

        if (issue.githubPrNumber) {
          githubPrs.set(issue.id, issue.githubPrNumber)
        }

        const existing = current.find((i) => i.id === issue.id)
        if (!existing || !existing.isChangedComparedTo(issue)) continue

        yield* source.updateIssue({
          issueId: issue.id,
          title: issue.title,
          description: issue.description,
          stateId: issue.stateId,
          blockedBy: issue.blockedBy,
        })

        let entry = updatedIssues.get(issue.id)
        if (!entry) {
          entry = { issue, originalStateId: existing.stateId, count: 0 }
          updatedIssues.set(issue.id, entry)
        }
        entry.count++
      }

      yield* Effect.forEach(
        toRemove,
        (issueId) => source.cancelIssue(issueId),
        { concurrency: "unbounded" },
      )

      current = yield* source.issues
      yield* fs.writeFileString(
        prdFile,
        PrdIssue.arrayToYaml(
          current.map((issue) => {
            const prNumber = githubPrs.get(issue.id!)
            if (!prNumber) return issue
            return new PrdIssue({ ...issue, githubPrNumber: prNumber })
          }),
        ),
      )
    }).pipe(Effect.uninterruptible)

    const mergableGithubPrs = Effect.gen(function* () {
      const yaml = yield* fs.readFileString(prdFile)
      const updated = PrdIssue.arrayFromYaml(yaml)
      const prs = Array.empty<number>()
      for (const issue of updated) {
        const entry = updatedIssues.get(issue.id ?? "")
        if (
          !entry ||
          !issue.githubPrNumber ||
          issue.stateId === entry.originalStateId
        ) {
          continue
        }
        prs.push(issue.githubPrNumber)
      }
      return prs
    })

    const revertStateIds = (options: {
      readonly reason: "inactivity" | "error"
    }) =>
      Effect.suspend(() =>
        Effect.forEach(
          updatedIssues.values(),
          ({ issue, originalStateId, count }) =>
            options.reason === "error" || count === 1
              ? source.updateIssue({
                  issueId: issue.id!,
                  stateId: originalStateId,
                })
              : Effect.void,
          { concurrency: "unbounded", discard: true },
        ),
      )

    return { path: prdFile, mergableGithubPrs, revertStateIds } as const
  }),
}) {
  static layer = Layer.effect(this, this.make).pipe(
    Layer.provide(Worktree.layer),
  )
}
