import { identifierParamSchema } from "../../../shared/schemas/identifier.schema"
import z from "zod"
import { paginationQuerySchema } from "../../../shared/schemas/pagination.schema"
import { standardizeDefectName, normalizeDefectName } from "../utils/defectName"

export const createDefectCatalogSchema = z.object({
    name: z.string().trim().min(1).max(255).transform(standardizeDefectName)
        .pipe(z.string().min(1).max(255))
        .refine(value => normalizeDefectName(value).length > 0, "Ingresa un nombre de defecto válido"),
})

export const updateDefectCatalogSchema = z.object({
    name: createDefectCatalogSchema.shape.name.optional(),
    activo: z.boolean().optional(),
}).refine(value => Object.keys(value).length > 0, "No hay cambios que guardar")

export const defectCatalogQuerySchema = z.object({ includeInactive: z.enum(["true", "false"]).optional() })

export const productDefectsSchema = z.array(z.object({
    id: z.number().int().positive().optional(),
    defectCatalogId: z.number().int().positive(),
    tolerancePercentage: z.number().min(0).max(100),
    activo: z.boolean(),
})).max(200).superRefine((defects, ctx) => {
    const ids = new Set<number>()
    const catalogIds = new Set<number>()
    defects.forEach((defect, index) => {
        if (catalogIds.has(defect.defectCatalogId)) ctx.addIssue({ code: "custom", path: [index, "defectCatalogId"], message: "No repitas un defecto en el mismo producto" })
        if (defect.id && ids.has(defect.id)) ctx.addIssue({ code: "custom", path: [index, "id"], message: "Defecto repetido" })
        catalogIds.add(defect.defectCatalogId)
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
