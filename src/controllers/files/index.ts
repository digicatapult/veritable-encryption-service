import express from 'express'
import { Controller, Post, Request, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { container } from 'tsyringe'
import StorageClass, { StorageToken } from '../../storageClass/index.js'

export interface FileUploadResponse {
  url: string
}

@Route('files')
export class FilesController extends Controller {
  private storageService: StorageClass

  constructor() {
    super()
    this.storageService = container.resolve(StorageToken)
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

    const result = await this.storageService.addFile({
      buffer: file.buffer,
      targetPath: file.originalname,
    })

    this.setStatus(201)
    return {
      url: result.url,
    }
  }
}
