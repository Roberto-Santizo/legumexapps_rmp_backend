import { QueryTypes, type Transaction } from "sequelize"
import type { Sequelize } from "sequelize-typescript"
import { normalizeDefectName, standardizeDefectName } from "../features/products/utils/defectName"
import { validateProductDataset, type ProductDataset } from "./productDataset"

// Incluye el ciclo de recepciones de prueba que depende del catálogo de productos.
// No usa CASCADE: cualquier dependencia ajena hace fallar y revierte la transacción.
export const REBUILT_MODELS = [
    "QualityControlDefect", "QualityControlDoc", "ReceptionEdit", "FieldDataReception", "ProdDataReception",
    "RmReception", "ProductDefect", "Product", "VarietyProduct", "DefectCatalog",
] as const
export const REMOVED_TABLES = ["defect_aliases", "defect_normalization_backups"] as const

async function insertProducts(db: Sequelize, data: ProductDataset, transaction: Transaction) {
    async function insertRows<T extends { id: number }>(name: string, rows: T[]) {
        const inserted = await db.model(name).bulkCreate(rows.map(({ id: _id, ...attributes }) => attributes), { transaction, validate: true, returning: true })
        return new Map(rows.map((row, index) => [row.id, Number(inserted[index].get("id"))]))
    }
    // Las relaciones usan los IDs generados por el ORM, sin ajustar secuencias.
    const varieties = await insertRows("VarietyProduct", data.varieties)
    const defects = await insertRows("DefectCatalog", data.defects.map(row => ({
        ...row, name: standardizeDefectName(row.name), normalizedName: normalizeDefectName(standardizeDefectName(row.name)),
    })))
    const products = await insertRows("Product", data.products.map(row => ({ ...row, varietyProductId: varieties.get(row.varietyProductId)! })))
    await insertRows("ProductDefect", data.productDefects.map(row => ({
        ...row, productId: products.get(row.productId)!, defectCatalogId: defects.get(row.defectCatalogId)!,
    })))
    return { varieties: data.varieties.length, products: data.products.length, defects: data.defects.length, productDefects: data.productDefects.length }
}

export async function loadProducts(db: Sequelize, input: unknown) {
    const data = validateProductDataset(input)
    return db.transaction(async transaction => {
        for (const name of ["VarietyProduct", "DefectCatalog", "Product", "ProductDefect"]) {
            if (await db.model(name).count({ transaction })) throw new Error("Las cuatro tablas de productos deben estar vacías para esta carga inicial. No se modificaron datos.")
        }
        return insertProducts(db, data, transaction)
    })
}

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
        return insertProducts(db, data, transaction)
    })
}
