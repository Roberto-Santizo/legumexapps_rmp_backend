import { identifierParamSchema } from "../../../shared/schemas/identifier.schema"
import z from "zod"
import { paginationQuerySchema } from "../../../shared/schemas/pagination.schema"
import { normalizeDefectName } from "../utils/defectName"

export const productDefectsSchema = z.array(z.object({
    id: z.number().int().positive().optional(),
    defectName: z.string().trim().max(255).transform(normalizeDefectName).pipe(z.string().min(1, "Ingresa el nombre del defecto")),
    tolerancePercentage: z.number().min(0).max(100),
    activo: z.boolean(),
})).max(200).superRefine((defects, ctx) => {
    const ids = new Set<number>()
    const names = new Set<string>()
    defects.forEach((defect, index) => {
        if (names.has(defect.defectName)) ctx.addIssue({ code: "custom", path: [index, "defectName"], message: "No repitas un defecto en el mismo producto" })
        if (defect.id && ids.has(defect.id)) ctx.addIssue({ code: "custom", path: [index, "id"], message: "Defecto repetido" })
        names.add(defect.defectName)
        if (defect.id) ids.add(defect.id)
    })
})

const productAttributesSchema = z.object({
    name: z.string().trim().min(1).max(255),
    varietyProductId: z.coerce.number().int().positive(),
    requiresQualityEvaluation: z.boolean().optional(),
    acceptedPercentage: z.coerce.number().positive("Debe ser mayor que 0").max(100, "No puede ser mayor que 100").nullable().optional(),
    evaluatePests: z.boolean().optional(),
    defects: productDefectsSchema.optional(),
})

export const createProductSchema = productAttributesSchema.refine(value => value.requiresQualityEvaluation === false || value.acceptedPercentage != null, {
    path: ["acceptedPercentage"], message: "Ingresa el porcentaje aceptado para los productos que requieren evaluación de calidad",
})

export const productIdParamSchema = z.object({
    id: identifierParamSchema
})

// The service validates partial updates against the saved product configuration.
export const updateProductSchema = productAttributesSchema.partial()

export const productQuerySchema = paginationQuerySchema.extend({
    includeInactive: z.enum(["true", "false"]).transform(value => value === "true").optional(),
    search: z.string().trim().optional()
})

export const updateProductStatusSchema = z.object({
    activo: z.boolean()
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type ProductQuery = z.infer<typeof productQuerySchema>
