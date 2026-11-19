import { identifierParamSchema } from "../../../shared/schemas/identifier.schema"
import z from "zod"
import { paginationQuerySchema } from "../../../shared/schemas/pagination.schema"

export const createCdpSchema = z.object({
    name: z.string().trim().min(1).max(255),
    fincaId: z.coerce.number().int().positive()
})

export const cdpIdParamSchema = z.object({
    id: identifierParamSchema
})

export const updateCdpSchema = createCdpSchema.partial()

export const cdpQuerySchema = paginationQuerySchema.extend({
    search: z.string().trim().optional()
})

export type CreateCdpInput = z.infer<typeof createCdpSchema>
export type UpdateCdpInput = z.infer<typeof updateCdpSchema>
export type CdpQuery = z.infer<typeof cdpQuerySchema>
