import { randomBytes } from 'node:crypto'
import { aesGcmDecrypt, aesGcmEncrypt } from './aesGcm.js'
import { EncryptionConfig } from './config.js'

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

  encryptWithCek(plaintext: Buffer, cek: Buffer) {
    return aesGcmEncrypt(plaintext, cek, this.config)
  }

  decryptWithCek(envelopedCiphertext: string, cek: Buffer) {
    return aesGcmDecrypt(envelopedCiphertext, cek)
  }
}
