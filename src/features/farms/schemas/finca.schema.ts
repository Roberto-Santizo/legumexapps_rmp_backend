import z from "zod"
import { paginationQuerySchema } from "../../../shared/schemas/pagination.schema"
import { identifierParamSchema } from "../../../shared/schemas/identifier.schema"

export const createFincaSchema = z.object({
    name: z.string().trim().min(1, "El nombre de la finca es obligatorio").max(255),
})

export const fincaQuerySchema = paginationQuerySchema.extend({
    search: z.string().trim().max(255).optional(),
})

export const fincaIdParamSchema = z.object({ id: identifierParamSchema })
export const updateFincaSchema = createFincaSchema.partial().refine(input => Object.keys(input).length > 0, "Ingresa el nombre de la finca")

export type CreateFincaInput = z.infer<typeof createFincaSchema>
export type UpdateFincaInput = z.infer<typeof updateFincaSchema>
export type FincaQuery = z.infer<typeof fincaQuerySchema>
