import type { Logger } from 'pino'
import { inject, injectable, singleton } from 'tsyringe'
import { z } from 'zod'

import { type Env, EnvToken } from '../../env.js'
import { BadRequest, InternalError, NotFoundError } from '../../error.js'
import { LoggerToken } from '../../logger.js'
import { DID, SchemaId, UUID, Version } from '../../models/stringTypes.js'
import {
  BasicMessage,
  basicMessageListParser,
  Connection,
  connectionListParser,
  Credential,
  CredentialDefinition,
  credentialDefinitionListParser,
  credentialDefinitionParser,
  credentialListParser,
  CredentialOfferInput,
  credentialParser,
  CredentialSchema,
  credentialSchemaParser,
  didCreateParser,
  DidDocument,
  didListParser,
  parserFn,
  schemaListParser,
  walletDecryptParser,
} from './types.js'

@singleton()
@injectable()
export default class Cloudagent {
  constructor(
    @inject(EnvToken) protected env: Env,
    @inject(LoggerToken) protected logger: Logger
  ) {}

  /*----------------------- Connections ---------------------------------*/

  public async getConnections(
    filters: Partial<{ outOfBandId: UUID; state: Connection['state'] }> = {}
  ): Promise<Connection[]> {
    const params = new URLSearchParams(filters).toString()
    return this.getRequest(`/v1/connections?${params}`, this.buildParser(connectionListParser))
  }

  public async closeConnection(connectionId: UUID, deleteConnectionRecord?: boolean): Promise<void> {
    let url = `/v1/connections/${connectionId}`
    if (deleteConnectionRecord !== undefined) {
      url += `?deleteConnectionRecord=${deleteConnectionRecord}`
    }
    return this.deleteRequest(url, () => {})
  }

  /*---------------------------- DIDs ---------------------------------*/

  public async getDids(filters: Partial<{ method: string }> = {}): Promise<DidDocument[]> {
    const params = new URLSearchParams({
      createdLocally: 'true',
      ...filters,
    }).toString()

    return this.getRequest(`/v1/dids?${params}`, this.buildParser(didListParser)).then((dids) =>
      dids.map((did) => did.didDocument)
    )
  }

  public async createDid(method: string, options: Record<string, string>): Promise<DidDocument> {
    return this.postRequest('/v1/dids/create', { method, options }, this.buildParser(didCreateParser)).then(
      (res) => res.didDocument
    )
  }

  /*----------------------- Schemas ---------------------------------*/

  public async createSchema(
    issuerId: DID,
    name: string,
    version: Version,
    attrNames: string[]
  ): Promise<CredentialSchema> {
    return this.postRequest(
      '/v1/schemas',
      { issuerId, name, version, attrNames },
      this.buildParser(credentialSchemaParser)
    )
  }

  public async getSchemas(
    filters: Partial<{ issuerId: DID; schemaName: string; schemaVersion: Version }> = {}
  ): Promise<CredentialSchema[]> {
    const params = new URLSearchParams({
      createdLocally: 'true',
      ...filters,
    }).toString()

    return this.getRequest(`/v1/schemas?${params}`, this.buildParser(schemaListParser))
  }

  /*----------------------- Credentials ---------------------------------*/
  public async createCredentialDefinition(
    issuerId: DID,
    schemaId: SchemaId,
    tag: string
  ): Promise<CredentialDefinition> {
    return this.postRequest(
      '/v1/credential-definitions',
      { tag, issuerId, schemaId },
      this.buildParser(credentialDefinitionParser)
    )
  }

  public async getCredentialDefinitions(
    filters: Partial<{ schemaId: SchemaId; issuerId: DID }> = {}
  ): Promise<CredentialDefinition[]> {
    const params = new URLSearchParams({
      createdLocally: 'true',
      ...filters,
    }).toString()

    return this.getRequest(`/v1/credential-definitions?${params}`, this.buildParser(credentialDefinitionListParser))
  }

  public async offerCredential(connectionId: UUID, offer: CredentialOfferInput): Promise<Credential> {
    const body = {
      protocolVersion: 'v2',
      credentialFormats: {
        anoncreds: {
          ...offer,
        },
      },
      connectionId,
    }
    return this.postRequest('/v1/credentials/offer-credential', body, this.buildParser(credentialParser))
  }

  public async getCredentials(
    filters: Partial<{ threadId: UUID; connectionId: UUID; state: Credential['state'] }> = {}
  ): Promise<Credential[]> {
    const params = new URLSearchParams({
      ...filters,
    }).toString()

    return this.getRequest(`/v1/credentials?${params}`, this.buildParser(credentialListParser))
  }

  public async deleteCredential(id: UUID): Promise<void> {
    return this.deleteRequest(`/v1/credentials/${id}`, () => {})
  }

  /*------------------------- Basic Messages -------------------------*/

  public async sendBasicMessage(connectionId: UUID, content: string): Promise<void> {
    await this.postRequest(`/v1/basic-messages/${connectionId}`, { content }, async () => {})
  }

  public async getBasicMessages(connectionId: UUID): Promise<BasicMessage[]> {
    return await this.getRequest(`/v1/basic-messages/${connectionId}`, this.buildParser(basicMessageListParser))
  }

  /*----------------------------- Wallet ---------------------------------*/

  public async walletDecrypt(jwe: string, recipientPublicKey64: string): Promise<Buffer> {
    const decryptPayload = {
      jwe,
      recipientPublicKey: recipientPublicKey64,
      enc: 'A256GCM',
      alg: 'ECDH-ES',
    }
    const result = await this.postRequest(`/v1/wallet/decrypt`, decryptPayload, this.buildParser(walletDecryptParser))
    return Buffer.from(result, 'base64')
  }

  /*--------------------------- Shared Methods ---------------------------------*/

  private async getRequest<O>(path: string, parse: parserFn<O>): Promise<O> {
    return this.noBodyRequest('GET', path, parse)
  }

  private async deleteRequest<O>(path: string, parse: parserFn<O>): Promise<O> {
    return this.noBodyRequest('DELETE', path, parse)
  }

  private async noBodyRequest<O>(method: 'GET' | 'DELETE', path: string, parse: parserFn<O>): Promise<O> {
    const url = `${this.env.CLOUDAGENT_ADMIN_ORIGIN}${path}`

    const response = await fetch(url, {
      method,
    })

    if (!response.ok) {
      if (response.status === 400) {
        throw new BadRequest(`${method} ${path}`)
      }
      if (response.status === 404) {
        throw new NotFoundError(`${method} ${path}`)
      }
      throw new InternalError(`Unexpected error calling ${method} ${path}: ${response.statusText}`)
    }
    try {
      return await parse(response)
    } catch (err) {
      if (err instanceof Error) {
        throw new InternalError(`Error parsing response from ${method} ${path}: ${err.name} - ${err.message}`)
      }
      throw new InternalError(`Unknown error parsing response from ${method} ${path}`)
    }
  }

  private async postRequest<O>(path: string, body: Record<string, unknown>, parse: parserFn<O>): Promise<O> {
    return this.bodyRequest('POST', path, body, parse)
  }

  private async bodyRequest<O>(
    method: 'POST' | 'PUT',
    path: string,
    body: Record<string, unknown>,
    parse: parserFn<O>
  ): Promise<O> {
    const url = `${this.env.CLOUDAGENT_ADMIN_ORIGIN}${path}`

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      if (response.status === 400) {
        throw new BadRequest(`${method} ${path}`)
      }
      if (response.status === 404) {
        throw new NotFoundError(`${method} ${path}`)
      }
      throw new InternalError(`Unexpected error calling ${method} ${path}: ${await response.text()}`)
    }

    try {
      return await parse(response)
    } catch (err) {
      if (err instanceof Error) {
        throw new InternalError(`Error parsing response from ${method} ${path}: ${err.name} - ${err.message}`)
      }
      throw new InternalError(`Unknown error parsing response from ${method} ${path}`)
    }
  }

  private buildParser =
    <O>(parser: z.ZodType<O>) =>
    async (response: Response) => {
      const asJson = await response.json()
      return parser.parse(asJson)
    }
}
