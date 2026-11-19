import { identifierParamSchema } from "../../../shared/schemas/identifier.schema"
import z from "zod"
import { paginationQuerySchema } from "../../../shared/schemas/pagination.schema"

export const createVarietyProductSchema = z.object({
    name: z.string().trim().min(1).max(255)
})

export const varietyProductIdParamSchema = z.object({
    id: identifierParamSchema
})

export const updateVarietyProductSchema = createVarietyProductSchema.partial()

export const varietyProductQuerySchema = paginationQuerySchema.extend({
    search: z.string().trim().optional()
})

export type CreateVarietyProductInput = z.infer<typeof createVarietyProductSchema>
export type UpdateVarietyProductInput = z.infer<typeof updateVarietyProductSchema>
export type VarietyProductQuery = z.infer<typeof varietyProductQuerySchema>
