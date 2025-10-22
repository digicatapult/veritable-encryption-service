import { Knex } from 'knex'
import { z } from 'zod'

export const tablesList = ['file'] as const

const insertFile = z.object({
  uri: z.string(),
  plaintext_hash: z.string(),
})

const Zod = {
  file: {
    insert: insertFile,
    get: insertFile.extend({
      created_at: z.date(),
    }),
  },
}

export type InsertFile = z.infer<typeof Zod.file.insert>
export type FileRow = z.infer<typeof Zod.file.get>

export type TABLES_TUPLE = typeof tablesList
export type TABLE = TABLES_TUPLE[number]
export type Models = {
  [key in TABLE]: {
    get: z.infer<(typeof Zod)[key]['get']>
    insert: z.infer<(typeof Zod)[key]['insert']>
  }
}

export type IDatabase = {
  [key in TABLE]: () => Knex.QueryBuilder
}

type WhereComparison<M extends TABLE> = {
  [key in keyof Models[M]['get']]: [
    Extract<key, string>,
    '=' | '>' | '>=' | '<' | '<=' | '<>' | 'LIKE' | 'ILIKE',
    Extract<Models[M]['get'][key], Knex.Value>,
  ]
}
export type WhereMatch<M extends TABLE> = {
  [key in keyof Models[M]['get']]?: Models[M]['get'][key]
}

export type Where<M extends TABLE> = WhereMatch<M> | (WhereMatch<M> | WhereComparison<M>[keyof Models[M]['get']])[]

export default Zod
