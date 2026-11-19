import { identifierParamSchema } from "../../../shared/schemas/identifier.schema"
import z from "zod"
import { paginationQuerySchema } from "../../../shared/schemas/pagination.schema"

export const listCarriersQuerySchema = paginationQuerySchema.extend({
    includeInactive: z.enum(["true", "false"]).transform(value => value === "true").optional(),
    search: z.string().trim().optional()
})

export const listPlatesQuerySchema = paginationQuerySchema.extend({
    carrierId: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional()
})

export const createCarrierSchema = z.object({
    code: z.string().trim().min(1).max(255),
    name: z.string().trim().min(1).max(255)
})

export const carrierIdParamSchema = z.object({
    id: identifierParamSchema
})

export const updateCarrierSchema = createCarrierSchema.partial()

export const updateCarrierStatusSchema = z.object({ activo: z.boolean() })

export const createPlateSchema = z.object({
    name: z.string().trim().min(1).max(255),
    carrierId: z.coerce.number().int().positive(),
    maxGrossWeight: z.number({ error: "Ingresa el peso bruto máximo del camión" }).positive("El peso bruto máximo debe ser mayor a cero"),
})

export const plateIdParamSchema = z.object({
    id: identifierParamSchema
})

export const updatePlateSchema = createPlateSchema.partial()

export type ListCarriersQuery = z.infer<typeof listCarriersQuerySchema>
export type ListPlatesQuery = z.infer<typeof listPlatesQuerySchema>
export type CreateCarrierInput = z.infer<typeof createCarrierSchema>
export type UpdateCarrierInput = z.infer<typeof updateCarrierSchema>
export type CreatePlateInput = z.infer<typeof createPlateSchema>
export type UpdatePlateInput = z.infer<typeof updatePlateSchema>
