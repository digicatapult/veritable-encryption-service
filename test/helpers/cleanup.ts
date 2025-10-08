import VeritableCloudagent from '../../src/services/cloudagent/index.js'

export async function testCleanup(agent: VeritableCloudagent) {
  const connections = await agent.getConnections()
  for (const connection of connections) {
    await agent.closeConnection(connection.id, true)
  }

  const credentials = await agent.getCredentials()
  for (const credential of credentials) {
    await agent.deleteCredential(credential.id)
  }
}
