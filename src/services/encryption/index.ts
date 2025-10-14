import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

interface EncryptedResult {
  filename: string
  data: string
}

interface Metadata {
  iv: Buffer
  tag: Buffer
}

export default class Encryption {
  private readonly ALGO = 'aes-256-gcm'
  private readonly MAGIC_HEADER = Buffer.from('VERI')
  private readonly CEK_SIZE = 32
  private readonly IV_SIZE = 12
  private readonly TAG_SIZE = 16

  generateCek(): Buffer {
    return randomBytes(this.CEK_SIZE)
  }

  generateIv(): Buffer {
    return randomBytes(this.IV_SIZE)
  }

  encryptBuffer(plaintext: Buffer, iv: Buffer, cek: Buffer): { ciphertext: Buffer; tag: Buffer } {
    const cipher = createCipheriv(this.ALGO, cek, iv)

    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
    const tag = cipher.getAuthTag()

    return { ciphertext, tag }
  }

  createEnvelopedBuffer(ciphertext: Buffer, metadata: Metadata): { envelopedBuffer: Buffer; filename: string } {
    const envelopedBuffer = Buffer.concat([this.MAGIC_HEADER, metadata.iv, metadata.tag, ciphertext])
    const filename = createHash('sha256').update(envelopedBuffer).digest('hex')
    return { envelopedBuffer, filename }
  }

  hashPlaintext(plaintext: Buffer): string {
    return createHash('sha256').update(plaintext).digest('hex')
  }

  destroyCek(cek: Buffer): void {
    cek.fill(0)
  }

  async encrypt(cek: Buffer, plaintext: Buffer, publicKey64: string): Promise<EncryptedResult> {
    const iv = this.generateIv()
    const { ciphertext, tag } = this.encryptBuffer(plaintext, iv, cek)
    const { envelopedBuffer, filename } = this.createEnvelopedBuffer(ciphertext, { iv, tag })
    //const encryptedCek = encryptEcdh(publicKey64, cek.toString())

    return {
      filename,
      data: envelopedBuffer.toString('base64'),
    }
  }

  parseEnvelopedFile(data: string): { ciphertext: Buffer; metadata: Metadata } {
    const envelopedBuffer = Buffer.from(data, 'base64')
    let offset = 0

    const magic = envelopedBuffer.subarray(offset, offset + this.MAGIC_HEADER.length)
    if (!magic.equals(this.MAGIC_HEADER)) {
      throw new Error('Invalid magic header')
    }
    offset += this.MAGIC_HEADER.length

    const iv = envelopedBuffer.subarray(offset, offset + this.IV_SIZE)
    offset += this.IV_SIZE

    const tag = envelopedBuffer.subarray(offset, offset + this.TAG_SIZE)
    offset += this.TAG_SIZE

    const ciphertext = envelopedBuffer.subarray(offset)

    return {
      ciphertext,
      metadata: { iv, tag },
    }
  }

  decryptBuffer(ciphertext: Buffer, cek: Buffer, iv: Buffer, tag: Buffer): Buffer {
    const decipher = createDecipheriv(this.ALGO, cek, iv)
    decipher.setAuthTag(tag)

    return Buffer.concat([decipher.update(ciphertext), decipher.final()])
  }

  decrypt(data: string, cek: Buffer): Buffer {
    const { ciphertext, metadata } = this.parseEnvelopedFile(data)
    const plaintext = this.decryptBuffer(ciphertext, cek, metadata.iv, metadata.tag)

    this.destroyCek(cek)

    return plaintext
  }
}
