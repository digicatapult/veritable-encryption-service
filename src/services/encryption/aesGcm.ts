import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { EncryptionConfig } from './config.js'
import { EncryptedResult } from './index.js'

const TAG_SIZE = 16 // AES-GCM tag size in bytes

interface Metadata {
  iv: Buffer
  tag: Buffer
}

const generateIv = (size: number): Buffer => {
  return randomBytes(size)
}

const encryptBuffer = (plaintext: Buffer, iv: Buffer, cek: Buffer): { ciphertext: Buffer; tag: Buffer } => {
  const cipher = createCipheriv('aes-256-gcm', cek, iv)

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return { ciphertext, tag }
}

const createEnvelopedBuffer = (
  ciphertext: Buffer,
  metadata: Metadata,
  config: EncryptionConfig
): { envelopedBuffer: Buffer; filename: string } => {
  const envelopedBuffer = Buffer.concat([config.magicHeader, metadata.iv, metadata.tag, ciphertext])
  const filename = createHash('sha256').update(envelopedBuffer).digest('hex')
  return { envelopedBuffer, filename }
}

export const aesGcmEncrypt = async (
  plaintext: Buffer,
  cek: Buffer,
  config: EncryptionConfig
): Promise<EncryptedResult> => {
  const iv = generateIv(config.ivSize)
  const { ciphertext, tag } = encryptBuffer(plaintext, iv, cek)
  const { envelopedBuffer, filename } = createEnvelopedBuffer(ciphertext, { iv, tag }, config)

  return {
    filename,
    data: envelopedBuffer.toString('base64'),
  }
}

const parseEnvelopedBuffer = (data: string, config: EncryptionConfig): { ciphertext: Buffer; metadata: Metadata } => {
  const envelopedBuffer = Buffer.from(data, 'base64')
  let offset = 0

  const magic = envelopedBuffer.subarray(offset, offset + config.magicHeader.length)
  if (!magic.equals(config.magicHeader)) {
    throw new Error('Invalid magic header')
  }
  offset += config.magicHeader.length

  const iv = envelopedBuffer.subarray(offset, offset + config.ivSize)
  offset += config.ivSize

  const tag = envelopedBuffer.subarray(offset, offset + TAG_SIZE)
  offset += TAG_SIZE

  const ciphertext = envelopedBuffer.subarray(offset)

  return {
    ciphertext,
    metadata: { iv, tag },
  }
}

const decryptBuffer = (ciphertext: Buffer, cek: Buffer, iv: Buffer, tag: Buffer): Buffer => {
  const decipher = createDecipheriv('aes-256-gcm', cek, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

export const aesGcmDecrypt = (cipher: string, cek: Buffer, config: EncryptionConfig): Buffer => {
  const { ciphertext, metadata } = parseEnvelopedBuffer(cipher, config)
  const plaintext = decryptBuffer(ciphertext, cek, metadata.iv, metadata.tag)

  return plaintext
}
