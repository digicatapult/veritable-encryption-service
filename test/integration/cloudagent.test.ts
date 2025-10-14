import { KeyType, TypedArrayEncoder, VerificationMethod } from '@credo-ts/core'
import { expect } from 'chai'
import type { DIDDocument } from 'did-resolver'
import { testCleanup } from '../helpers/cleanup.js'
import {
  setupTwoPartyContext,
  TwoPartyContext,
  withCred,
  withCredDef,
  withEstablishedConnection,
  withSchema,
} from '../helpers/twoPartyContext.js'

describe('cloudagent', async () => {
  const context: TwoPartyContext = {} as TwoPartyContext

  before(async function () {
    this.timeout(10000)
    await setupTwoPartyContext(context)
    await withEstablishedConnection(context)
    await withSchema(context)
    await withCredDef(context)
    await withCred(context)
  })

  after(async () => {
    await testCleanup(context.localCloudagent)
    await testCleanup(context.remoteCloudagent)
  })

  it('getConnections', async () => {
    const connections = await context.localCloudagent.getConnections()
    expect(connections).to.have.length(1)
    expect(connections[0].id).to.equal(context.localConnectionId)
  })

  it('createDid', async () => {
    const did = await context.localCloudagent.createDid('key', {
      keyType: KeyType.X25519,
    })
    expect(did.id).to.include('did:key:')
  })

  it('getDids', async () => {
    const dids = await context.localCloudagent.getDids({ method: 'peer' })
    expect(dids).to.be.an('array')
    expect(dids[0].id).to.include('did:peer:')
  })

  it('createSchema', async () => {
    const schema = await context.localCloudagent.createSchema(context.didKey, 'Test Schema', '1.0.0', ['test attr'])
    expect(schema.id).to.include('ipfs:')
  })

  it('getSchemas', async () => {
    const schemas = await context.localCloudagent.getSchemas({ issuerId: context.didKey, schemaName: 'Context Schema' })
    expect(schemas).to.be.an('array')
    expect(schemas[0].id).to.include('ipfs:')
  })

  it('createCredentialDefinition', async () => {
    const credDef = await context.localCloudagent.createCredentialDefinition(context.didKey, context.schemaId, 'tag')
    expect(credDef.id).to.include('ipfs:')
  })

  it('getCredentialDefinitions', async () => {
    const credDefs = await context.localCloudagent.getCredentialDefinitions({
      schemaId: context.schemaId,
      issuerId: context.didKey,
    })
    expect(credDefs).to.be.an('array')
    expect(credDefs[0].id).to.include('ipfs:')
  })

  it('offerCredential', async () => {
    const credential = await context.localCloudagent.offerCredential(context.localConnectionId, {
      credentialDefinitionId: context.credDefId,
      attributes: [{ name: 'test attr', value: 'test value' }],
    })

    expect(credential.state).to.equal('offer-sent')
  })

  it('getCredentials', async () => {
    const aliceCredentials = await context.localCloudagent.getCredentials({
      connectionId: context.localConnectionId,
      state: 'done',
    })
    expect(aliceCredentials).to.be.an('array')
    expect(aliceCredentials[0].state).to.equal('done')
  })

  it('sendBasicMessage + getBasicMessages', async () => {
    await context.localCloudagent.sendBasicMessage(context.localConnectionId, 'test message')
    const messages = await context.remoteCloudagent.getBasicMessages(context.remoteConnectionId)
    expect(messages).to.be.an('array')
    expect(messages[0].content).to.equal('test message')
  })

  it('walletDecrypt', async () => {
    const plaintext = 'test'
    const did = (await context.localCloudagent.createDid('key', {
      keyType: KeyType.X25519,
    })) as DIDDocument

    const keyAgreement = did.keyAgreement?.[0] as VerificationMethod
    const publicKey64 = TypedArrayEncoder.toBase64(TypedArrayEncoder.fromBase58(keyAgreement.publicKeyBase58!))

    const encrypted = context.localEncryption.encryptWithPublicX25519(Buffer.from(plaintext), publicKey64)
    const decrypted = await context.localCloudagent.walletDecrypt(encrypted, publicKey64)
    expect(decrypted).to.equal(plaintext)
  })
})
