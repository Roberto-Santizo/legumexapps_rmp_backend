import { identifierParamSchema } from "../../../shared/schemas/identifier.schema"
import z from "zod"
import { paginationQuerySchema } from "../../../shared/schemas/pagination.schema"

export const createBasketSchema = z.object({
    code: z.string().trim().min(1).max(255),
    weight: z.coerce.number().positive()
})

export const basketIdParamSchema = z.object({
    id: identifierParamSchema
})

export const updateBasketSchema = createBasketSchema.partial()

export const basketQuerySchema = paginationQuerySchema.extend({
    search: z.string().trim().optional()
})

export type CreateBasketInput = z.infer<typeof createBasketSchema>
export type UpdateBasketInput = z.infer<typeof updateBasketSchema>
export type BasketQuery = z.infer<typeof basketQuerySchema>
