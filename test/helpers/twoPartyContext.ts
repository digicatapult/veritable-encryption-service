import { container } from 'tsyringe'

import { KeyType } from '@credo-ts/core'
import env from '../../src/env.js'
import { resetContainer } from '../../src/ioc.js'
import Database from '../../src/lib/db/index.js'
import { UUID } from '../../src/models/stringTypes.js'
import { findPublicKeyBase64 } from '../../src/services/cloudagent/did.js'
import VeritableCloudagent from '../../src/services/cloudagent/index.js'
import { Connection, Credential } from '../../src/services/cloudagent/types.js'
import { ENCRYPTION_CONFIGS } from '../../src/services/encryption/config.js'
import Encryption from '../../src/services/encryption/index.js'
import StorageClass from '../../src/storageClass/index.js'
import { agentCleanup, dbCleanup } from './cleanup.js'
import { mockEnvBob, mockLogger } from './mock.js'
import { pollUntil } from './poll.js'

const didKey = 'did:key:z6Mkk7yqnGF3YwTrLpqrW6PGsKci7dNqh1CjnvMbzrMerSeL' // to register schemas and cred defs

export type TwoPartyContext = {
  localCloudagent: VeritableCloudagent
  localDatabase: Database
  localStorageClass: StorageClass
  localConnectionId: UUID
  localEncryption: Encryption
  remoteCloudagent: VeritableCloudagent
  remoteConnectionId: UUID
  didKey: string
  schemaId: string
  credDefId: string
  credId: string
  didPeer: string
}

export async function setupTwoPartyContext(context: TwoPartyContext) {
  resetContainer()
  context.localCloudagent = container.resolve(VeritableCloudagent)
  context.localDatabase = container.resolve(Database)
  context.localStorageClass = container.resolve(StorageClass)
  context.localEncryption = new Encryption(ENCRYPTION_CONFIGS.VERI)
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

export async function testCleanup(context: TwoPartyContext) {
  await agentCleanup(context.localCloudagent)
  await agentCleanup(context.remoteCloudagent)
  await dbCleanup(context.localDatabase)
}

export const createLocalDid = async (context: TwoPartyContext) => {
  const did = await context.localCloudagent.createDid('key', {
    keyType: KeyType.X25519,
  })
  const publicKey64 = findPublicKeyBase64(did)
  if (!publicKey64) throw new Error('Failed to find public key for created DID')
  return publicKey64
}
