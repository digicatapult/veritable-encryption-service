import { decode, encode } from 'cbor2'
import { CipherGCMTypes, createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { EncryptionConfig } from './config.js'
import { EncryptedResult } from './index.js'

interface Metadata {
  iv: Buffer
  tag: Buffer
}

export interface EncryptedPayload {
  algorithm: CipherGCMTypes
  ciphertext: string
  iv: string
  tag: string
}

const generateIv = (size: number): Buffer => {
  return randomBytes(size)
}

const encryptBuffer = (
  plaintext: Buffer,
  iv: Buffer,
  cek: Buffer,
  algorithm: CipherGCMTypes
): { ciphertext: Buffer; tag: Buffer } => {
  const cipher = createCipheriv(algorithm, cek, iv)

  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  return { ciphertext, tag }
}

const createEnvelope = (
  ciphertext: Buffer,
  metadata: Metadata,
  algorithm: CipherGCMTypes
): { envelopedBuffer: Buffer; filename: string } => {
  const envelope: EncryptedPayload = {
    iv: metadata.iv.toString('hex'),
    tag: metadata.tag.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    algorithm,
  }
  const envelopedBuffer = Buffer.from(encode(envelope))
  const filename = createHash('sha256').update(envelopedBuffer).digest('hex')
  return { envelopedBuffer, filename }
}

export const aesGcmEncrypt = (plaintext: Buffer, cek: Buffer, config: EncryptionConfig): EncryptedResult => {
  const iv = generateIv(config.ivSize)
  const { ciphertext, tag } = encryptBuffer(plaintext, iv, cek, config.algorithm)
  const { envelopedBuffer, filename } = createEnvelope(ciphertext, { iv, tag }, config.algorithm)

  return {
    filename,
    envelopedCiphertext: envelopedBuffer.toString('base64'),
  }
}

const parseEnvelope = (data: string): { ciphertext: Buffer; algorithm: CipherGCMTypes; metadata: Metadata } => {
  const envelopeBuffer = Buffer.from(data, 'base64')
  const envelope = decode(envelopeBuffer) as EncryptedPayload

  return {
    ciphertext: Buffer.from(envelope.ciphertext, 'hex'),
    algorithm: envelope.algorithm,
    metadata: {
      iv: Buffer.from(envelope.iv, 'hex'),
      tag: Buffer.from(envelope.tag, 'hex'),
    },
  }
}

const decryptBuffer = (ciphertext: Buffer, cek: Buffer, iv: Buffer, tag: Buffer, algorithm: CipherGCMTypes): Buffer => {
  const decipher = createDecipheriv(algorithm, cek, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

export const aesGcmDecrypt = (envelopedCiphertext: string, cek: Buffer): Buffer => {
  const { ciphertext, metadata, algorithm } = parseEnvelope(envelopedCiphertext)
  return decryptBuffer(ciphertext, cek, metadata.iv, metadata.tag, algorithm)
}
