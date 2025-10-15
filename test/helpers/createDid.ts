import { KeyType, TypedArrayEncoder } from '@credo-ts/core'
import { DIDDocument, VerificationMethod } from 'did-resolver'
import Cloudagent from '../../src/services/cloudagent'

// returns base64-encoded X25519 public key
export const createDid = async (cloudagent: Cloudagent) => {
  const did = (await cloudagent.createDid('key', {
    keyType: KeyType.X25519,
  })) as DIDDocument
  const keyAgreement = did.keyAgreement?.[0] as VerificationMethod
  return TypedArrayEncoder.toBase64(TypedArrayEncoder.fromBase58(keyAgreement.publicKeyBase58!))
}
