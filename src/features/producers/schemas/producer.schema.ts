import z from "zod"
import { paginationQuerySchema } from "../../../shared/schemas/pagination.schema"
import { identifierParamSchema } from "../../../shared/schemas/identifier.schema"

export const createProducerSchema = z.object({
    code: z.string().trim().min(1, "El código del productor es obligatorio").max(255),
    name: z.string().trim().min(1, "El nombre del productor es obligatorio").max(255),
})

export const producerQuerySchema = paginationQuerySchema.extend({
    search: z.string().trim().max(255).optional(),
})

export const producerIdParamSchema = z.object({ id: identifierParamSchema })
export const updateProducerSchema = createProducerSchema.partial().refine(input => Object.keys(input).length > 0, "Ingresa los datos del productor")

export type CreateProducerInput = z.infer<typeof createProducerSchema>
export type UpdateProducerInput = z.infer<typeof updateProducerSchema>
export type ProducerQuery = z.infer<typeof producerQuerySchema>
