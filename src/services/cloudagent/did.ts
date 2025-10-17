import { TypedArrayEncoder } from '@credo-ts/core'
import { DidDocument, VerificationMethod } from './types.js'

export const findPublicKeyBase64 = (didDocument: DidDocument): string | undefined => {
  if (!didDocument.keyAgreement) return undefined
  for (const vm of didDocument.keyAgreement) {
    const publicKey = getPublicKeyFromVM(vm)
    if (publicKey) {
      return publicKey
    }
  }
  return undefined
}

const getPublicKeyFromVM = (verificationMethod: VerificationMethod): string | undefined => {
  if (verificationMethod.publicKeyBase64) {
    return verificationMethod.publicKeyBase64
  } else if (verificationMethod.publicKeyBase58) {
    return TypedArrayEncoder.toBase64(TypedArrayEncoder.fromBase58(verificationMethod.publicKeyBase58))
  } else if (verificationMethod.publicKeyJwk && verificationMethod.publicKeyJwk.crv === 'X25519') {
    return verificationMethod.publicKeyJwk.x
  }
}
