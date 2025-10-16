import knex from 'knex'
import { z } from 'zod'

import { container, singleton } from 'tsyringe'
import env from '../../env.js'
import Zod, { IDatabase, Models, TABLE, tablesList, Where } from './types.js'
import { reduceWhere } from './util.js'

const clientSingleton = knex({
  client: 'pg',
  connection: {
    host: env.DB_HOST,
    database: env.DB_NAME,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'migrations',
  },
})

@singleton()
export default class Database {
  private db: IDatabase

  constructor(private client = clientSingleton) {
    const models: IDatabase = tablesList.reduce((acc, name) => {
      return {
        [name]: () => this.client(name),
        ...acc,
      }
    }, {}) as IDatabase
    this.db = models
  }

  insert = async <M extends TABLE>(
    model: M,
    record: Models[typeof model]['insert']
  ): Promise<Models[typeof model]['get'][]> => {
    return z
      .array(Zod[model].get)
      .parse(await this.db[model]().insert(record).returning('*')) as Models[typeof model]['get'][]
  }

  get = async <M extends TABLE>(model: M, where?: Where<M>, limit?: number): Promise<Models[typeof model]['get'][]> => {
    let query = this.db[model]()
    query = reduceWhere(query, where)
    if (limit !== undefined) query = query.limit(limit)
    const result = await query
    return z.array(Zod[model].get).parse(result) as Models[typeof model]['get'][]
  }

  delete = async <M extends TABLE>(model: M, where: Where<M>): Promise<void> => {
    return this.db[model]()
      .where(where || {})
      .delete()
  }
}

container.register(Database, { useValue: new Database() })
