import { CipherGCMTypes } from 'node:crypto'

export interface EncryptionConfig {
  cekSize: number
  ivSize: number
  algorithm: CipherGCMTypes
}

export const ENCRYPTION_CONFIGS: Record<string, EncryptionConfig> = {
  VERI: {
    cekSize: 32,
    ivSize: 12,
    algorithm: 'aes-256-gcm',
  },
}
