import { QueryTypes } from "sequelize"
import type { Sequelize } from "sequelize-typescript"
import { normalizeDefectName, standardizeDefectName } from "../features/products/utils/defectName"
import { validateProductDataset } from "./productDataset"

// Incluye el ciclo de recepciones de prueba que depende del catálogo de productos.
// No usa CASCADE: cualquier dependencia ajena hace fallar y revierte la transacción.
export const REBUILT_MODELS = [
    "QualityControlDefect", "QualityControlDoc", "ReceptionEdit", "FieldDataReception", "ProdDataReception",
    "RmReception", "ProductDefect", "Product", "VarietyProduct", "DefectCatalog",
] as const
export const REMOVED_TABLES = ["defect_aliases", "defect_normalization_backups"] as const

export async function rebuildProducts(db: Sequelize, input: unknown) {
    const data = validateProductDataset(input)
    return db.transaction(async transaction => {
        const qi = db.getQueryInterface()
        const productTable = db.model("Product").getTableName()
        const schema = typeof productTable === "string" ? "public" : productTable.schema
        for (const tableName of REMOVED_TABLES) await qi.dropTable({ tableName, schema }, { transaction, cascade: false })
        for (const name of REBUILT_MODELS) await qi.dropTable(db.model(name).getTableName(), { transaction, cascade: false })

        // Retira las dos funciones antiguas después de eliminar sus tablas/triggers.
        const functions = await db.query<{ proname: string }>(
            `SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = :schema AND p.pronargs = 0
               AND p.proname IN ('prevent_assigned_grn_change', 'prevent_reception_plant_change')`,
            { replacements: { schema }, type: QueryTypes.SELECT, transaction },
        )
        for (const fn of functions) await qi.dropFunction(`"${schema.replace(/"/g, '""')}"."${fn.proname}"`, [], { transaction })

        const options = { force: false, alter: false, transaction }
        await db.sync(options)
        const groups = [
            ["VarietyProduct", data.varieties],
            ["DefectCatalog", data.defects.map(row => ({ ...row, name: standardizeDefectName(row.name), normalizedName: normalizeDefectName(standardizeDefectName(row.name)) }))],
            ["Product", data.products],
            ["ProductDefect", data.productDefects],
        ] as const
        for (const [name, rows] of groups) {
            const model = db.model(name)
            // Los IDs los genera PostgreSQL desde 1; no hay que ajustar secuencias.
            const inserted = await model.bulkCreate(rows.map(({ id: _id, ...attributes }) => attributes), { transaction, validate: true, returning: true })
            if (inserted.some((record, index) => record.get("id") !== rows[index]?.id)) throw new Error(`Los IDs generados en ${name} no coinciden con el archivo. Se revirtió toda la reconstrucción.`)
        }
        return { varieties: data.varieties.length, products: data.products.length, defects: data.defects.length, productDefects: data.productDefects.length }
    })
}
