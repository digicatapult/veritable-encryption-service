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
   * @description Uploads a file to Minio storage. The file will be available for direct download from Minio using the returned URL.
   */
  @SuccessResponse(201, 'File uploaded successfully')
  @Post('/')
  public async uploadFile(
    @Request() req: express.Request,
    @UploadedFile() file: Express.Multer.File,
    @FormField() recipientDid: string
  ): Promise<FileUploadResponse> {
    req.log.trace('File upload request received')

    if (!file) {
      this.setStatus(400)
      throw new Error('No file provided')
    }

    const recipientDidDoc = await this.cloudagent.resolveDid(recipientDid)

    const recipientPublicKey64 = findPublicKeyBase64(recipientDidDoc)
    if (!recipientPublicKey64) {
      throw new BadRequest(`No valid public key found for DID ${recipientDid}`)
    }

    const { encryptedCek, cipherPayload, filename } = this.encryption.encryptPlaintext(
      file.buffer,
      recipientPublicKey64
    )

    console.log(recipientPublicKey64)
    const result = await this.storageService.addFile({
      buffer: Buffer.from(cipherPayload, 'base64'),
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
