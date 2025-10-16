import { expect } from 'chai'
import { describe, it } from 'mocha'
import { ENCRYPTION_CONFIGS } from '../config'
import Encryption from '../index'

describe('Encryption', () => {
  it('aes-256-gcm - should encrypt and decrypt', async () => {
    const encryption = new Encryption(ENCRYPTION_CONFIGS.VERI)
    const plaintext = Buffer.from('test')
    const cek = encryption.generateCek()

    const { ciphertext } = encryption.encryptWithCek(plaintext, cek)
    const decrypted = encryption.decryptWithCek(ciphertext, cek)

    expect(decrypted).to.deep.equal(plaintext)
  })

  it('aes-256-gcm - should encrypt large file and decrypt', async function () {
    const encryption = new Encryption(ENCRYPTION_CONFIGS.VERI)
    const largeFile = Buffer.from('a'.repeat(100 * 1024 * 1024)) // 100MB
    const cek = encryption.generateCek()

    const { ciphertext } = encryption.encryptWithCek(largeFile, cek)
    const decrypted = encryption.decryptWithCek(ciphertext, cek)

    expect(decrypted).to.deep.equal(largeFile)
  })

  it('should destroy CEK', () => {
    const encryption = new Encryption(ENCRYPTION_CONFIGS.VERI)
    const cek = encryption.generateCek()
    encryption.destroyCek(cek)
    expect(cek.every((byte) => byte === 0)).to.equal(true)
  })
})
