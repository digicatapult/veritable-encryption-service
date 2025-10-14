export interface EncryptionConfig {
  magicHeader: Buffer
  cekSize: number
  ivSize: number
}

export const ENCRYPTION_CONFIGS: Record<string, EncryptionConfig> = {
  VERI: {
    magicHeader: Buffer.from('VERI'),
    cekSize: 32,
    ivSize: 12,
  },
}
