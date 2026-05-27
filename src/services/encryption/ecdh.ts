import { JsonEncoder, TypedArrayEncoder } from '@credo-ts/core'
import { Key as AskarKey, EcdhEs, KeyAlgorithm } from '@openwallet-foundation/askar-nodejs'

export const ENC = 'A256GCM'
export const ALG = 'ECDH-ES'
const X25519 = KeyAlgorithm.X25519

export function encryptEcdh(plaintext: Buffer, publicKey: string): string {
  const recipientPublicKey = TypedArrayEncoder.fromBase64Url(publicKey)

  let ephemeralKey: AskarKey | undefined

  try {
    ephemeralKey = AskarKey.generate(X25519)

    const header = {
      enc: ENC,
      alg: ALG,
      epk: ephemeralKey.jwkPublic,
    }

    const encodedHeader = JsonEncoder.toBase64Url(header)

    const ecdh = new EcdhEs({
      algId: TypedArrayEncoder.fromUtf8String(ENC),
      apu: Uint8Array.from([]),
      apv: Uint8Array.from([]),
    })

    const recipientAskarKey = AskarKey.fromPublicBytes({
      algorithm: X25519,
      publicKey: recipientPublicKey,
    })

    const { ciphertext, tag, nonce } = ecdh.encryptDirect({
      encryptionAlgorithm: KeyAlgorithm.AesA256Gcm,
      ephemeralKey,
      message: plaintext,
      recipientKey: recipientAskarKey,
      aad: TypedArrayEncoder.fromUtf8String(encodedHeader), // AAD as bytes of encoded header
    })

    // Return compact JWE
    return [
      encodedHeader,
      '', // No encrypted key for ECDH-ES
      TypedArrayEncoder.toBase64Url(nonce),
      TypedArrayEncoder.toBase64Url(ciphertext),
      TypedArrayEncoder.toBase64Url(tag),
    ].join('.')
  } finally {
    ephemeralKey?.handle.free()
  }
}
