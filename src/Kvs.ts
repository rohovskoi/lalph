import { Layer } from "effect"
import { KeyValueStore } from "effect/unstable/persistence"
import { PlatformServices } from "./shared/platform.ts"

export const layerKvs = KeyValueStore.layerFileSystem(".lalph/config").pipe(
  Layer.provide(PlatformServices),
)
