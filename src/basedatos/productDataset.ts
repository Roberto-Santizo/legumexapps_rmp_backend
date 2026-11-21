import z from "zod"
import { normalizeDefectName, standardizeDefectName } from "../features/products/utils/defectName"

const named = z.object({ id: z.number().int().positive(), name: z.string().trim().min(1).max(255), activo: z.boolean() })
const percentage = z.number().min(0).max(100)
export const productDatasetSchema = z.object({
    version: z.literal(1),
    varieties: z.array(named).min(1),
    defects: z.array(named).min(1),
    products: z.array(named.extend({
        varietyProductId: z.number().int().positive(), acceptedPercentage: percentage.positive(), evaluatePests: z.boolean(),
    })).min(1),
    productDefects: z.array(z.object({
        id: z.number().int().positive(), productId: z.number().int().positive(), defectCatalogId: z.number().int().positive(),
        tolerancePercentage: percentage, activo: z.boolean(),
    })),
})
export type ProductDataset = z.infer<typeof productDatasetSchema>

export function validateProductDataset(input: unknown): ProductDataset {
    const data = productDatasetSchema.parse(input)
    for (const [kind, rows] of Object.entries({ varieties: data.varieties, defects: data.defects, products: data.products, productDefects: data.productDefects })) {
        if (rows.some((row, index) => row.id !== index + 1)) throw new Error(`IDs fuera de orden en ${kind}. Genera de nuevo los archivos depurados.`)
    }
    const unique = (values: string[], label: string) => {
        if (new Set(values).size !== values.length) throw new Error(`Hay duplicados en ${label}. Revisa los archivos antes de cargar.`)
    }
    unique(data.varieties.map(row => normalizeDefectName(row.name)), "variedades")
    unique(data.defects.map(row => normalizeDefectName(standardizeDefectName(row.name))), "defectos")
    unique(data.products.map(row => `${normalizeDefectName(row.name)}:${row.varietyProductId}`), "productos y variedades")
    unique(data.productDefects.map(row => `${row.productId}:${row.defectCatalogId}`), "asociaciones de defectos")
    const exists = (id: number, rows: { id: number }[]) => rows[id - 1]?.id === id
    if (data.products.some(row => !exists(row.varietyProductId, data.varieties))
        || data.productDefects.some(row => !exists(row.productId, data.products) || !exists(row.defectCatalogId, data.defects))) {
        throw new Error("Los archivos contienen referencias inexistentes. Corrige los datos antes de cargarlos.")
    }
    return data
}
