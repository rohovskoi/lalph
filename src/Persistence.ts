import { Layer } from "effect"
import { KeyValueStore, Persistence } from "effect/unstable/persistence"
import { PlatformServices } from "./shared/platform.ts"

export const layerPersistence = Persistence.layerKvs.pipe(
  Layer.provide(KeyValueStore.layerFileSystem(".lalph/cache")),
  Layer.provide(PlatformServices),
)
