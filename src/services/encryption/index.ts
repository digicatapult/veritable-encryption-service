import { randomBytes } from 'node:crypto'
import { aesGcmDecrypt, aesGcmEncrypt } from './aesGcm.js'
import { EncryptionConfig } from './config.js'
import { encryptEcdh } from './ecdh.js'

export interface EncryptedResult {
  filename: string
  envelopedCiphertext: string
}

export default class Encryption {
  private readonly config: EncryptionConfig

  constructor(config: EncryptionConfig) {
    this.config = config
  }

  generateCek(): Buffer {
    return randomBytes(this.config.cekSize)
  }

  destroyCek(cek: Buffer): void {
    cek.fill(0)
  }

  encryptPlaintext(plaintext: Buffer, recipientPublicKey64: string) {
    const cek = this.generateCek()
    const { envelopedCiphertext, filename } = this.encryptWithCek(plaintext, cek)
    const encryptedCek = encryptEcdh(cek, recipientPublicKey64)
    this.destroyCek(cek)
    return { envelopedCiphertext, encryptedCek, filename }
  }

  encryptWithCek(plaintext: Buffer, cek: Buffer) {
    return aesGcmEncrypt(plaintext, cek, this.config)
  }

  decryptWithCek(envelopedCiphertext: string, cek: Buffer) {
    return aesGcmDecrypt(envelopedCiphertext, cek)
  }
}
