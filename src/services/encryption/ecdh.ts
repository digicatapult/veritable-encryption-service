import { Buffer as CredoBuffer, JsonEncoder, Key, KeyType, TypedArrayEncoder } from '@credo-ts/core'
import { Key as AskarKey, EcdhEs, keyAlgFromString, KeyAlgs } from '@hyperledger/aries-askar-nodejs'

export function encryptEcdh(plaintext: Buffer, publicKey64: string): string {
  const recipientKey = new Key(TypedArrayEncoder.fromBase64(publicKey64), KeyType.X25519)

  let ephemeralKey: AskarKey | undefined

  try {
    // Generate ephemeral key using Askar (same as original)
    ephemeralKey = AskarKey.generate(keyAlgFromString(recipientKey.keyType))

    // Create header with ephemeral public key JWK
    const header = {
      enc: 'A256GCM',
      alg: 'ECDH-ES',
      epk: ephemeralKey.jwkPublic,
    }

    const encodedHeader = JsonEncoder.toBase64URL(header)

    // Use Askar's ECDH-ES implementation (same as original)
    const ecdh = new EcdhEs({
      algId: Uint8Array.from(CredoBuffer.from('A256GCM')),
      apu: Uint8Array.from([]),
      apv: Uint8Array.from([]),
    })

    // Create recipient key from public bytes
    const recipientAskarKey = AskarKey.fromPublicBytes({
      algorithm: keyAlgFromString(recipientKey.keyType),
      publicKey: recipientKey.publicKey,
    })

    // Encrypt using Askar's direct encryption (same as original)
    const { ciphertext, tag, nonce } = ecdh.encryptDirect({
      encAlg: KeyAlgs.AesA256Gcm,
      ephemeralKey,
      message: Uint8Array.from(CredoBuffer.from(plaintext)),
      recipientKey: recipientAskarKey,
      aad: Uint8Array.from(CredoBuffer.from(encodedHeader)), // AAD as bytes of encoded header
    })

    // Return compact JWE (same format as original)
    return [
      encodedHeader,
      '', // No encrypted key for ECDH-ES
      TypedArrayEncoder.toBase64URL(nonce),
      TypedArrayEncoder.toBase64URL(ciphertext),
      TypedArrayEncoder.toBase64URL(tag),
    ].join('.')
  } finally {
    // Clean up key handles
    ephemeralKey?.handle.free()
  }
}
