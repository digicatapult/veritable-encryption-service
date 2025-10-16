import { CipherGCMTypes } from 'node:crypto'

export interface EncryptionConfig {
  magicHeader: Buffer
  cekSize: number
  ivSize: number
  algorithm: CipherGCMTypes
}

export const ENCRYPTION_CONFIGS: Record<string, EncryptionConfig> = {
  VERI: {
    magicHeader: Buffer.from('VERI'),
    cekSize: 32,
    ivSize: 12,
    algorithm: 'aes-256-gcm',
  },
}
