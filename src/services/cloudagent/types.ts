import { z } from 'zod'
import { type CredentialDefinitionId } from '../../models/stringTypes.js'

const connectionParser = z.object({
  id: z.uuid(),
  state: z.enum([
    'start',
    'invitation-sent',
    'invitation-received',
    'request-sent',
    'request-received',
    'response-sent',
    'response-received',
    'abandoned',
    'completed',
  ]),
  outOfBandId: z.uuid(),
})
export type Connection = z.infer<typeof connectionParser>

const didDocumentParser = z.looseObject({
  id: z.string(),
})
export type DidDocument = z.infer<typeof didDocumentParser>

export const didCreateParser = z.object({
  didDocument: didDocumentParser,
})
export const didListParser = z.array(didCreateParser)

export const credentialSchemaParser = z.object({
  id: z.string(),
  issuerId: z.string(),
  name: z.string(),
  version: z.string(),
  attrNames: z.array(z.string()),
})
export type CredentialSchema = z.infer<typeof credentialSchemaParser>

export const credentialDefinitionParser = z.object({
  id: z.string(),
  issuerId: z.string(),
  schemaId: z.string(),
})
export type CredentialDefinition = z.infer<typeof credentialDefinitionParser>

const credentialAttributeParser = z.object({
  name: z.string(),
  value: z.string(),
})

export const credentialParser = z.object({
  id: z.uuid(),
  connectionId: z.uuid(),
  protocolVersion: z.string(),
  credentialAttributes: z.array(credentialAttributeParser).optional(),
  role: z.enum(['issuer', 'holder']),
  state: z.enum([
    'proposal-sent',
    'proposal-received',
    'offer-sent',
    'offer-received',
    'declined',
    'request-sent',
    'request-received',
    'credential-issued',
    'credential-received',
    'done',
    'abandoned',
  ]),
  errorMessage: z.string().optional(),
  metadata: z
    .object({
      '_anoncreds/credential': z
        .object({
          credentialDefinitionId: z.string().optional(),
          schemaId: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
})
export type Credential = z.infer<typeof credentialParser>

export type BasicMessage = z.infer<typeof basicMessageParser>

const basicMessageParser = z.object({
  content: z.string(),
  role: z.string(),
})

export const walletDecryptParser = z.string()

export const connectionListParser = z.array(connectionParser)
export const credentialListParser = z.array(credentialParser)
export const schemaListParser = z.array(credentialSchemaParser)
export const credentialDefinitionListParser = z.array(credentialDefinitionParser)
export const basicMessageListParser = z.array(basicMessageParser)

export type CredentialOfferInput = {
  credentialDefinitionId: string
  attributes: {
    name: string
    value: string
  }[]
}
export type CredentialProposalAcceptInput = {
  credentialDefinitionId?: CredentialDefinitionId
  attributes?: {
    name: string
    value: string
  }[]
}

export type parserFn<O> = (res: Response) => O | Promise<O>
