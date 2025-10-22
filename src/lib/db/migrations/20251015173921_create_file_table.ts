import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex.schema.createTable('file', (def) => {
    def.string('uri').primary()
    def.string('plaintext_hash').notNullable()
    def.datetime('created_at').notNullable().defaultTo(now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('file')
}
