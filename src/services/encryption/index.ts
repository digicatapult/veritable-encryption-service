import { randomBytes } from 'node:crypto'
import { aesGcmDecrypt, aesGcmEncrypt } from './aesGcm.js'
import { EncryptionConfig } from './config.js'

export interface EncryptedResult {
  filename: string
  data: string
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

  encrypt(plaintext: Buffer, cek: Buffer) {
    return aesGcmEncrypt(plaintext, cek, this.config)
  }

  decrypt(cipher: string, cek: Buffer) {
    return aesGcmDecrypt(cipher, cek, this.config)
  }
}
