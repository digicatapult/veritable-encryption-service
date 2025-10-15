import { createHash } from 'crypto'
import express from 'express'
import { Controller, Post, Request, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { container } from 'tsyringe'
import Database from '../../lib/db/index.js'
import StorageClass, { StorageToken } from '../../storageClass/index.js'

export interface FileUploadResponse {
  url: string
}

@Route('files')
export class FilesController extends Controller {
  private storageService: StorageClass
  private db: Database

  constructor() {
    super()
    this.storageService = container.resolve(StorageToken)
    this.db = container.resolve(Database)
  }

  /**
   * @summary Upload and encrypt a file to storage
   * @description Uploads a file to Minio storage. The file will be available for direct download from Minio using the returned URL.
   */
  @SuccessResponse(201, 'File uploaded successfully')
  @Post('/')
  public async uploadFile(
    @Request() req: express.Request,
    @UploadedFile() file: Express.Multer.File
  ): Promise<FileUploadResponse> {
    req.log.trace('File upload request received')

    if (!file) {
      this.setStatus(400)
      throw new Error('No file provided')
    }

    const fileHash = createHash('sha256').update(file.buffer).digest('hex')

    const result = await this.storageService.addFile({
      buffer: file.buffer,
      targetPath: file.originalname,
    })

    this.db.insert('file', {
      uri: result.url,
      plaintext_hash: fileHash,
    })

    this.setStatus(201)
    return {
      url: result.url,
    }
  }
}
