import {
  Effect,
  FileSystem,
  Layer,
  Path,
  Schema,
  ServiceMap,
  Stream,
} from "effect"
import { Worktree } from "./Worktree.ts"
import { PrdIssue, PrdList } from "./domain/PrdIssue.ts"
import type { Mutable } from "effect/Types"
import { IssueSource } from "./IssueSource.ts"

export class Prd extends ServiceMap.Service<Prd>()("lalph/Prd", {
  make: Effect.gen(function* () {
    const worktree = yield* Worktree
    const pathService = yield* Path.Path
    const fs = yield* FileSystem.FileSystem
    const source = yield* IssueSource

    const prdFile = pathService.join(worktree.directory, `.lalph`, `prd.json`)

    const initial = yield* source.issues
    yield* fs.writeFileString(prdFile, PrdIssue.arrayToJson(initial))

    const checkForWork = Effect.suspend(() => {
      const hasIncomplete = initial.some(
        (issue) => issue.complete === false && issue.blockedBy.length === 0,
      )
      if (!hasIncomplete) {
        return Effect.fail(new NoMoreWork({}))
      }
      return Effect.void
    })

    const updatedIssues = new Map<
      string,
      {
        readonly issue: PrdIssue
        readonly originalStateId: string
        count: number
      }
    >()

    const sync = Effect.gen(function* () {
      const json = yield* fs.readFileString(prdFile)
      const updated = PrdList.fromJson(json)
      const current = yield* source.issues
      let createdIssues = 0

      for (const issue of updated) {
        if (issue.id === null) {
          // create new issue
          const issueId = yield* source.createIssue(issue)
          const mutable = issue as Mutable<PrdIssue>
          mutable.id = issueId
          createdIssues++
          continue
        }
        const existing = current.find((i) => i.id === issue.id)
        if (!existing || !existing.isChangedComparedTo(issue)) continue

        yield* source.updateIssue({
          issueId: issue.id,
          title: issue.title,
          description: issue.description,
          stateId: issue.stateId,
        })

        let entry = updatedIssues.get(issue.id)
        if (!entry) {
          entry = {
            issue,
            originalStateId: existing.stateId,
            count: 0,
          }
          updatedIssues.set(issue.id, entry)
        }
        entry.count++
      }

      if (createdIssues === 0) return
      yield* fs.writeFileString(prdFile, PrdIssue.arrayToJson(updated))
    }).pipe(Effect.uninterruptible)

    const mergableGithubPrs = Effect.gen(function* () {
      const json = yield* fs.readFileString(prdFile)
      const updated = PrdList.fromJson(json)
      const prs: Array<number> = []
      for (const issue of updated) {
        const count = updatedIssues.get(issue.id ?? "")?.count ?? 0
        if (count <= 1 || !issue.githubPrNumber) continue
        prs.push(issue.githubPrNumber)
      }
      return prs
    })

    yield* Effect.addFinalizer(() =>
      Effect.forEach(
        updatedIssues.values(),
        ({ issue, count, originalStateId }) => {
          if (count > 1) return Effect.void
          return source.updateIssue({
            issueId: issue.id!,
            title: issue.title,
            description: issue.description,
            stateId: originalStateId,
          })
        },
        { concurrency: "unbounded" },
      ).pipe(Effect.ignore),
    )

    yield* fs.watch(prdFile).pipe(
      Stream.buffer({
        capacity: 1,
        strategy: "dropping",
      }),
      Stream.runForEach((_) => Effect.ignore(sync)),
      Effect.forkScoped,
    )

    return { path: prdFile, mergableGithubPrs, checkForWork } as const
  }),
}) {
  static layer = Layer.effect(this, this.make).pipe(
    Layer.provide(Worktree.layer),
  )
}

export class NoMoreWork extends Schema.ErrorClass<NoMoreWork>(
  "lalph/Prd/NoMoreWork",
)({
  _tag: Schema.tag("NoMoreWork"),
}) {
  readonly message = "No more work to be done!"
}
