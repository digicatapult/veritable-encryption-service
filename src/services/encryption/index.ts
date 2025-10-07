import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createPublicKey,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from 'node:crypto'

export interface EncryptedFileResult {
  filename: string
  envelopedFile: Buffer
  encryptedCek: Buffer
}

export interface DecryptedFileResult {
  plaintext: Buffer
  plaintextHash: string
}

export interface FileMetadata {
  nonce: Buffer
  tag: Buffer
}

export default class Encryption {
  private readonly ALGO = 'aes-256-gcm'
  private readonly MAGIC_HEADER = Buffer.from('VERI')
  private readonly VERSION = Buffer.from([1])
  private readonly CEK_SIZE = 32
  private readonly IV_SIZE = 12

  generateCek(): Buffer {
    return randomBytes(this.CEK_SIZE)
  }

  generateIv(): Buffer {
    return randomBytes(this.IV_SIZE)
  }

  encryptString(plaintext: string): { ciphertext: Buffer; iv: Buffer; tag: Buffer } {
    const cek = this.generateCek()
    const iv = this.generateIv()
    const cipher = createCipheriv(this.ALGO, cek, iv)

    const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()])

    const tag = cipher.getAuthTag()

    return { ciphertext, iv, tag }
  }

  createEnvelopedFile(ciphertext: Buffer, metadata: FileMetadata): { envelopedFile: Buffer; filename: string } {
    const envelopedFile = Buffer.concat([this.MAGIC_HEADER, metadata.nonce, metadata.tag, ciphertext])

    const serializedData = JSON.stringify({
      ciphertext: ciphertext.toString('base64'),
      nonce: metadata.nonce.toString('base64'),
      tag: metadata.tag.toString('base64'),
    })
    const filename = createHash('sha256').update(serializedData).digest('hex')

    return { envelopedFile, filename }
  }

  hashPlaintext(plaintext: Buffer): string {
    return createHash('sha256').update(plaintext).digest('hex')
  }
  encryptCek(message: Buffer): Buffer {
    const jwk = {
      kty: 'RSA',
      e: 'AQAB',
      n: 'wLKeYAcf0WogfKSVpJGNwyuGpTEWdFN9nInXrsY8gZ6wNEZ_smQ7_k1o1H5rOMc9KRA9uqZ1pVChbzNbbNNkNx1UfBA3zK_w5SoTvzhNo5_hsNAuisI_s5-02D_ckeuhAffhlr8HxD_ugdxIshAXSq9TLtV6l93dJFAcFc42uT8hTY6XX6oX_Hr5w_6k8XWjP8FJuh2MaHv1J1uWfIMBjeSAcKnFsgDwkQ0H6BqPpzfMVHewRikATJdY8CRiFQxKYWgKvug-24gKUDQ6b6lCm3OXOWbmpCEHpspk-h76eRVZPZWnXozBQVzN2mHQClwP-EMbeCDaCXD4iyHyXLpOow',
    }
    const p = createPublicKey({ key: jwk, format: 'jwk' })
    return publicEncrypt(p, message)
  }

  destroyCek(cek: Buffer): void {
    cek.fill(0)
  }

  async encryptFileComplete(plaintext: Buffer, publicKey: Buffer): Promise<EncryptedFileResult> {
    const cek = await this.generateCek()
    const { ciphertext, nonce, tag } = this.encryptFile(plaintext, cek)
    const metadata: FileMetadata = { nonce, tag }
    const { envelopedFile, filename } = this.createEnvelopedFile(ciphertext, metadata)
    const encryptedCek = this.encryptCek(cek, publicKey)

    this.destroyCek(cek)

    return {
      filename,
      envelopedFile,
      encryptedCek,
    }
  }

  parseEnvelopedFile(envelopedFile: Buffer): { ciphertext: Buffer; metadata: FileMetadata } {
    let offset = 0

    const magic = envelopedFile.subarray(offset, offset + this.MAGIC_HEADER.length)
    if (!magic.equals(this.MAGIC_HEADER)) {
      throw new Error('Invalid magic header')
    }
    offset += this.MAGIC_HEADER.length

    const nonce = envelopedFile.subarray(offset, offset + this.IV_SIZE)
    offset += this.IV_SIZE

    const tag = envelopedFile.subarray(offset, offset + this.TAG_SIZE)
    offset += this.TAG_SIZE

    const ciphertext = envelopedFile.subarray(offset)

    return {
      ciphertext,
      metadata: { nonce, tag },
    }
  }

  decryptCek(encryptedCek: Buffer, privateKey: Buffer): Buffer {
    return privateDecrypt(privateKey, encryptedCek)
  }

  decryptFile(ciphertext: Buffer, cek: Buffer, nonce: Buffer, tag: Buffer): Buffer {
    const decipher = createDecipheriv('aes-256-gcm', cek)
    //decipher.setAuthTag(tag)

    return Buffer.concat([decipher.update(ciphertext), decipher.final()])
  }

  decryptFileComplete(envelopedFile: Buffer, encryptedCek: Buffer, privateKey: Buffer): DecryptedFileResult {
    const { ciphertext, metadata } = this.parseEnvelopedFile(envelopedFile)
    const cek = this.decryptCek(encryptedCek, privateKey)

    try {
      const plaintext = this.decryptFile(ciphertext, cek, metadata.nonce, metadata.tag)
      const plaintextHash = this.hashPlaintext(plaintext)

      return { plaintext, plaintextHash }
    } finally {
      this.destroyCek(cek)
    }
  }
}

// Use ECIES for encrypting the CEK with the existing ED25519 key
// or put RSA key in the DID
// hash seraliased object ()
// send nonce serealised, ignore tag for now
// we need to store the private key when we generate the RSA key
