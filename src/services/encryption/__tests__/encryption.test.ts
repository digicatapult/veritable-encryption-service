import { expect } from 'chai'
import { describe, it } from 'mocha'
import Encryption from '../index'

describe('Encryption', () => {
  it('aes-256-gcm - should encrypt and decrypt', async () => {
    const encryption = new Encryption()
    const plaintext = Buffer.from('test')
    const cek = encryption.generateCek()

    const { data } = await encryption.encrypt(cek, plaintext, 'publicKey64')
    const decrypted = encryption.decrypt(data, cek)

    expect(decrypted).to.deep.equal(plaintext)
  })
})
