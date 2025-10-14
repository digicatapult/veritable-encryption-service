import { expect } from 'chai'
import { describe, it } from 'mocha'
import { ENCRYPTION_CONFIGS } from '../config'
import Encryption from '../index'

describe('Encryption', () => {
  it('aes-256-gcm - should encrypt and decrypt', async () => {
    const encryption = new Encryption(ENCRYPTION_CONFIGS.VERI)
    const plaintext = Buffer.from('test')
    const cek = encryption.generateCek()

    const { cipher } = encryption.encryptWithCek(plaintext, cek)
    const decrypted = encryption.decryptWithCek(cipher, cek)

    expect(decrypted).to.deep.equal(plaintext)
  })
})
