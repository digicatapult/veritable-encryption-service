import { container } from 'tsyringe'

import env from '../../src/env.js'
import { UUID } from '../../src/models/stringTypes.js'
import VeritableCloudagent from '../../src/services/cloudagent/index.js'
import { Connection, Credential } from '../../src/services/cloudagent/types.js'
import { mockEnvBob, mockLogger } from './mock.js'
import { pollUntil } from './poll.js'

const didKey = 'did:key:z6Mkk7yqnGF3YwTrLpqrW6PGsKci7dNqh1CjnvMbzrMerSeL' // to register schemas and cred defs

export type TwoPartyContext = {
  localCloudagent: VeritableCloudagent
  localConnectionId: UUID
  remoteCloudagent: VeritableCloudagent
  remoteConnectionId: UUID
  didKey: string
  schemaId: string
  credDefId: string
  credId: string
}

export async function setupTwoPartyContext(context: TwoPartyContext) {
  context.localCloudagent = container.resolve(VeritableCloudagent)
  context.remoteCloudagent = new VeritableCloudagent(mockEnvBob, mockLogger)
  context.didKey = didKey
}

export const withEstablishedConnection = async (context: TwoPartyContext) => {
  const invitation = await fetch(`${env.CLOUDAGENT_ADMIN_ORIGIN}/v1/oob/create-invitation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      handshake: true,
      handshakeProtocols: ['https://didcomm.org/connections/1.x'],
      autoAcceptConnection: true,
    }),
  })
  const invitationJson = await invitation.json()

  const aliceToBobInvitationUrl = invitationJson.invitationUrl
  const aliceOobRecordId = invitationJson.outOfBandRecord.id

  const bobInvitation = await fetch(`${mockEnvBob.CLOUDAGENT_ADMIN_ORIGIN}/v1/oob/receive-invitation-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ invitationUrl: aliceToBobInvitationUrl }),
  })
  const bobInvitationJson = await bobInvitation.json()
  const bobOobRecordId = bobInvitationJson.outOfBandRecord.id

  await pollUntil(
    () =>
      context.localCloudagent.getConnections({
        outOfBandId: aliceOobRecordId,
        state: 'completed',
      }),
    (connections: Connection[]) => connections.length > 0
  )

  const [localConnection] = await context.localCloudagent.getConnections({
    outOfBandId: aliceOobRecordId,
    state: 'completed',
  })
  const [remoteConnection] = await context.remoteCloudagent.getConnections({
    outOfBandId: bobOobRecordId,
    state: 'completed',
  })
  context.localConnectionId = localConnection.id
  context.remoteConnectionId = remoteConnection.id
}

export const withSchema = async (context: TwoPartyContext) => {
  const schema = await context.localCloudagent.createSchema(context.didKey, 'Context Schema', '1.0.0', ['test attr'])
  context.schemaId = schema.id
}

export const withCredDef = async (context: TwoPartyContext) => {
  const credDef = await context.localCloudagent.createCredentialDefinition(context.didKey, context.schemaId, 'tag')
  context.credDefId = credDef.id
}

export const withCred = async (context: TwoPartyContext) => {
  await context.localCloudagent.offerCredential(context.localConnectionId, {
    credentialDefinitionId: context.credDefId,
    attributes: [{ name: 'test attr', value: 'test value' }],
  })

  await pollUntil(
    () =>
      context.localCloudagent.getCredentials({
        connectionId: context.localConnectionId,
        state: 'done',
      }),
    (credentials: Credential[]) => credentials.length > 0
  )
}
