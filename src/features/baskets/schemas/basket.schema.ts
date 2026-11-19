import { identifierParamSchema } from "../../../shared/schemas/identifier.schema"
import z from "zod"
import { paginationQuerySchema } from "../../../shared/schemas/pagination.schema"

export const createBasketSchema = z.object({
    code: z.string().trim().min(1, "El nombre es obligatorio").max(255, "Máximo 255 caracteres"),
    weight: z.union([z.number(), z.string().trim().min(1, "Ingresa un peso numérico válido")])
        .transform(Number).pipe(z.number({ error: "Ingresa un peso numérico válido" }).nonnegative("El peso debe ser mayor o igual a 0"))
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
