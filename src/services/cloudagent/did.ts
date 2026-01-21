import {
  DidDocument as CredoDidDocument,
  getKeyFromVerificationMethod,
  JsonTransformer,
  KeyType,
  TypedArrayEncoder,
  type VerificationMethod as CredoVerificationMethod,
} from '@credo-ts/core'
import { DidDocument as CloudagentDidDocument } from './types.js'

export const findPublicKeyBase64 = (didDocument: CloudagentDidDocument): string | undefined => {
  let credoDidDocument: CredoDidDocument
  try {
    credoDidDocument = JsonTransformer.fromJSON(didDocument, CredoDidDocument)
  } catch {
    // Treat invalid DID documents as having no usable public key
    return undefined
  }
  const keyAgreements = credoDidDocument.keyAgreement ?? []

  for (const keyAgreement of keyAgreements) {
    const verificationMethod = dereferenceKeyAgreement(credoDidDocument, keyAgreement)
    if (!verificationMethod) continue

    const key = safeGetKeyFromVerificationMethod(verificationMethod)
    if (!key || key.keyType !== KeyType.X25519) continue

    // Return base64 encoding of the raw X25519 public key bytes
    return TypedArrayEncoder.toBase64(key.publicKey)
  }

  return undefined
}

const dereferenceKeyAgreement = (
  didDocument: CredoDidDocument,
  keyAgreement: string | CredoVerificationMethod
): CredoVerificationMethod | undefined => {
  if (typeof keyAgreement !== 'string') return keyAgreement

  const keyAgreementReference = keyAgreement.startsWith('#') ? `${didDocument.id}${keyAgreement}` : keyAgreement

  try {
    // Only search relevant purposes for key agreement resolution
    return didDocument.dereferenceKey(keyAgreementReference, ['keyAgreement', 'verificationMethod'])
  } catch {
    return undefined
  }
}

const safeGetKeyFromVerificationMethod = (verificationMethod: CredoVerificationMethod) => {
  try {
    return getKeyFromVerificationMethod(verificationMethod)
  } catch {
    return undefined
  }
}
