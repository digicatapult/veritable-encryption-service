import { expect } from 'chai'

import { Key, KeyType, TypedArrayEncoder } from '@credo-ts/core'

import { findPublicKeyBase64 } from './did.js'
import type { DidDocument } from './types.js'

describe('cloudagent did key extraction', () => {
  it('returns key when keyAgreement references verificationMethod by id', () => {
    // DID:web documents commonly use keyAgreement as a string reference that points
    // at a verificationMethod entry
    const x25519Key = Key.fromPublicKey(new Uint8Array(32).fill(1), KeyType.X25519)
    const expectedBase64 = TypedArrayEncoder.toBase64(x25519Key.publicKey)

    const didDocument: DidDocument = {
      id: 'did:web:example.com',
      verificationMethod: [
        {
          id: 'did:web:example.com#encryption',
          type: 'X25519KeyAgreementKey2019',
          controller: 'did:web:example.com',
          publicKeyBase58: x25519Key.publicKeyBase58,
        },
      ],
      keyAgreement: ['did:web:example.com#encryption'],
    }

    expect(findPublicKeyBase64(didDocument)).to.equal(expectedBase64)
  })

  it('returns key when keyAgreement embeds the verification method', () => {
    // DIDDocs can embed the key agreement verification method directly in keyAgreement
    const x25519Key = Key.fromPublicKey(new Uint8Array(32).fill(2), KeyType.X25519)
    const expectedBase64 = TypedArrayEncoder.toBase64(x25519Key.publicKey)

    const didDocument: DidDocument = {
      id: 'did:peer:123',
      keyAgreement: [
        {
          id: 'did:peer:123#key-1',
          type: 'X25519KeyAgreementKey2019',
          controller: 'did:peer:123',
          publicKeyBase58: x25519Key.publicKeyBase58,
        },
      ],
    }

    expect(findPublicKeyBase64(didDocument)).to.equal(expectedBase64)
  })

  it('returns key when keyAgreement references JsonWebKey2020 publicKeyJwk for X25519', () => {
    // DIDDocs can use JWK (eg. OKP/X25519), rather than base58 or multibase
    const x25519Key = Key.fromPublicKey(new Uint8Array(32).fill(3), KeyType.X25519)
    const expectedBase64 = TypedArrayEncoder.toBase64(x25519Key.publicKey)
    const jwkX = TypedArrayEncoder.toBase64URL(x25519Key.publicKey)

    const didDocument: DidDocument = {
      id: 'did:web:example.com',
      verificationMethod: [
        {
          id: 'did:web:example.com#encryption',
          type: 'JsonWebKey2020',
          controller: 'did:web:example.com',
          publicKeyJwk: {
            kty: 'OKP',
            crv: 'X25519',
            x: jwkX,
          },
        },
      ],
      keyAgreement: ['did:web:example.com#encryption'],
    }

    expect(findPublicKeyBase64(didDocument)).to.equal(expectedBase64)
  })

  it('returns key when keyAgreement uses a fragment-only reference', () => {
    // DIDDoc serializations can use fragment-only references (eg. '#encryption')
    // for keyAgreement entries
    const x25519Key = Key.fromPublicKey(new Uint8Array(32).fill(4), KeyType.X25519)
    const expectedBase64 = TypedArrayEncoder.toBase64(x25519Key.publicKey)

    const didDocument: DidDocument = {
      id: 'did:web:example.com',
      verificationMethod: [
        {
          id: 'did:web:example.com#encryption',
          type: 'X25519KeyAgreementKey2019',
          controller: 'did:web:example.com',
          publicKeyBase58: x25519Key.publicKeyBase58,
        },
      ],
      keyAgreement: ['#encryption'],
    }

    expect(findPublicKeyBase64(didDocument)).to.equal(expectedBase64)
  })

  it('returns the first usable X25519 key when multiple keyAgreement entries are present', () => {
    // DIDDocs may publish multiple keyAgreement references
    // We should skip unusable entries and return the first X25519
    const ed25519Key = Key.fromPublicKey(new Uint8Array(32).fill(5), KeyType.Ed25519)
    const x25519Key = Key.fromPublicKey(new Uint8Array(32).fill(6), KeyType.X25519)
    const expectedBase64 = TypedArrayEncoder.toBase64(x25519Key.publicKey)

    const didDocument: DidDocument = {
      id: 'did:web:example.com',
      verificationMethod: [
        {
          id: 'did:web:example.com#signing',
          type: 'Multikey',
          controller: 'did:web:example.com',
          publicKeyMultibase: ed25519Key.fingerprint,
        },
        {
          id: 'did:web:example.com#encryption',
          type: 'Multikey',
          controller: 'did:web:example.com',
          publicKeyMultibase: x25519Key.fingerprint,
        },
      ],
      keyAgreement: ['did:web:example.com#signing', 'did:web:example.com#encryption'],
    }

    expect(findPublicKeyBase64(didDocument)).to.equal(expectedBase64)
  })

  it('returns undefined when keyAgreement is a reference but verificationMethod is missing', () => {
    // If keyAgreement only provides an id reference, we can't extract a key without the verificationMethod array
    const didDocument: DidDocument = {
      id: 'did:web:example.com',
      keyAgreement: ['did:web:example.com#encryption'],
    }

    expect(findPublicKeyBase64(didDocument)).to.equal(undefined)
  })

  it('ignores non-X25519 verification methods', () => {
    // We only want X25519 for ECDH-ES
    // Signing keys (eg. Ed25519) must not be used for encryption
    const didDocument: DidDocument = {
      id: 'did:web:example.com',
      verificationMethod: [
        {
          id: 'did:web:example.com#encryption',
          type: 'Ed25519VerificationKey2020',
          controller: 'did:web:example.com',
          publicKeyBase64: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
        },
      ],
      keyAgreement: ['did:web:example.com#encryption'],
    }

    expect(findPublicKeyBase64(didDocument)).to.equal(undefined)
  })

  it('supports canonical Multikey/publicKeyMultibase for X25519', () => {
    // DIDDocs can represent key material via Multikey + publicKeyMultibase
    const x25519Key = Key.fromPublicKey(new Uint8Array(32).fill(7), KeyType.X25519)
    const expectedBase64 = TypedArrayEncoder.toBase64(x25519Key.publicKey)

    const didDocument: DidDocument = {
      id: 'did:web:example.com',
      verificationMethod: [
        {
          id: 'did:web:example.com#encryption',
          type: 'Multikey',
          controller: 'did:web:example.com',
          publicKeyMultibase: x25519Key.fingerprint,
        },
      ],
      keyAgreement: ['did:web:example.com#encryption'],
    }

    expect(findPublicKeyBase64(didDocument)).to.equal(expectedBase64)
  })

  it('supports a mixed DIDDoc with signing and key-agreement Multikey verification methods', () => {
    // DID:web documents typically publish both a signing key (Ed25519) and an agreement key (X25519)
    const ed25519Key = Key.fromPublicKey(new Uint8Array(32).fill(8), KeyType.Ed25519)
    const x25519Key = Key.fromPublicKey(new Uint8Array(32).fill(9), KeyType.X25519)
    const expectedBase64 = TypedArrayEncoder.toBase64(x25519Key.publicKey)

    const didDocument: DidDocument = {
      id: 'did:web:example.com',
      verificationMethod: [
        {
          id: 'did:web:example.com#owner',
          type: 'Multikey',
          controller: 'did:web:example.com',
          publicKeyMultibase: ed25519Key.fingerprint,
        },
        {
          id: 'did:web:example.com#encryption',
          type: 'Multikey',
          controller: 'did:web:example.com',
          publicKeyMultibase: x25519Key.fingerprint,
        },
      ],
      keyAgreement: ['did:web:example.com#encryption'],
    }

    expect(findPublicKeyBase64(didDocument)).to.equal(expectedBase64)
  })
})
