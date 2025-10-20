import { createHash } from 'crypto'
import express from 'express'
import { Controller, FormField, Post, Request, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { container } from 'tsyringe'
import { BadRequest } from '../../error.js'
import Database from '../../lib/db/index.js'
import { findPublicKeyBase64 } from '../../services/cloudagent/did.js'
import Cloudagent from '../../services/cloudagent/index.js'
import { ENCRYPTION_CONFIGS } from '../../services/encryption/config.js'
import Encryption from '../../services/encryption/index.js'
import StorageClass, { StorageToken } from '../../storageClass/index.js'

export interface FileUploadResponse {
  url: string
  key: string
}
@Route('files')
export class FilesController extends Controller {
  private storageService: StorageClass
  private db: Database
  private cloudagent: Cloudagent
  private encryption: Encryption

  constructor() {
    super()
    this.storageService = container.resolve(StorageToken)
    this.db = container.resolve(Database)
    this.cloudagent = container.resolve(Cloudagent)
    this.encryption = new Encryption(ENCRYPTION_CONFIGS.VERI)
  }

  /**
   * @summary Upload and encrypt a file to storage
   * @description Uploads a file to configured storage backend (Minio/S3/Azure).
   * File is encrypted using AES-256-GCM with a randomly generated Content Encryption Key (CEK).
   * CEK is ECDH-ES encrypted using with the first X25519 public key found in recipient DID `keyAgreement`.
   * Encrypted file is stored with anonymous read access.
   * Encrypted CEK is returned for transmission to the recipient via DIDComm.
   * @param file The file to encrypt and upload
   * @param recipientDid The DID of the recipient who will decrypt the file
   * @returns Object containing the storage URL for the encrypted file and the encrypted CEK
   */
  @SuccessResponse(201, 'File uploaded successfully')
  @Post('/')
  public async uploadFile(
    @Request() req: express.Request,
    @UploadedFile() file: Express.Multer.File,
    @FormField() recipientDid: string
  ): Promise<FileUploadResponse> {
    req.log.info(`File upload request received for recipient: ${recipientDid}`)

    if (!file) {
      throw new BadRequest('No file provided')
    }

    const recipientDidDoc = await this.cloudagent.resolveDid(recipientDid)

    const recipientPublicKey64 = findPublicKeyBase64(recipientDidDoc)
    if (!recipientPublicKey64) {
      throw new BadRequest(`No valid public key found for DID ${recipientDid}`)
    }

    const { envelopedCiphertext, encryptedCek, filename } = this.encryption.encryptPlaintext(
      file.buffer,
      recipientPublicKey64
    )

    const result = await this.storageService.addFile({
      buffer: Buffer.from(envelopedCiphertext, 'base64'),
      targetPath: filename,
    })

    await this.db.insert('file', {
      uri: filename,
      plaintext_hash: createHash('sha256').update(file.buffer).digest('hex'),
    })

    this.setStatus(201)
    return {
      url: result.url,
      key: encryptedCek,
    }
  }
}
