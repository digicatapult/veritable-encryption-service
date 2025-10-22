import Database from '../../src/lib/db/index.js'
import { tablesList } from '../../src/lib/db/types.js'
import VeritableCloudagent from '../../src/services/cloudagent/index.js'

export async function agentCleanup(agent: VeritableCloudagent) {
  const connections = await agent.getConnections()
  for (const connection of connections) {
    await agent.closeConnection(connection.id, true)
  }

  const credentials = await agent.getCredentials()
  for (const credential of credentials) {
    await agent.deleteCredential(credential.id)
  }
}

export async function dbCleanup(db: Database) {
  for (const table of tablesList) {
    await db.delete(table, {})
  }
}
