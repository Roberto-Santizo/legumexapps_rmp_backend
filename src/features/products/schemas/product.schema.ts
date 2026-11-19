import { identifierParamSchema } from "../../../shared/schemas/identifier.schema"
import z from "zod"
import { paginationQuerySchema } from "../../../shared/schemas/pagination.schema"

export const productDefectsSchema = z.array(z.object({
    id: z.number().int().positive().optional(),
    name: z.string().trim().min(1).max(255).transform(value => value.toUpperCase()),
    tolerancePercentage: z.number().min(0).max(100),
    activo: z.boolean(),
})).max(200).superRefine((defects, ctx) => {
    const names = new Set<string>()
    const ids = new Set<number>()
    defects.forEach((defect, index) => {
        if (names.has(defect.name)) ctx.addIssue({ code: "custom", path: [index, "name"], message: "No repitas un defecto en el mismo producto" })
        if (defect.id && ids.has(defect.id)) ctx.addIssue({ code: "custom", path: [index, "id"], message: "Defecto repetido" })
        names.add(defect.name)
        if (defect.id) ids.add(defect.id)
    })
})

export const createProductSchema = z.object({
    name: z.string().trim().min(1).max(255),
    varietyProductId: z.coerce.number().int().positive(),
    acceptedPercentage: z.coerce.number().positive("Debe ser mayor que 0").max(100, "No puede ser mayor que 100"),
    evaluatePests: z.boolean().optional(),
    defects: productDefectsSchema.optional(),
})

export const productIdParamSchema = z.object({
    id: identifierParamSchema
})

export const updateProductSchema = createProductSchema.partial()

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
