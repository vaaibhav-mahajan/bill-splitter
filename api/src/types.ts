import type { createDb } from './db'

export type AppEnv = {
  Bindings: {
    DB: D1Database
  }
  Variables: {
    db: ReturnType<typeof createDb>
  }
}
