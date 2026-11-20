import { ErrorApp } from "../../shared/errores/ErrorApp"
import { DEFECT_SPELLINGS, normalizeDefectName, standardizeDefectName, type EvaluationKind } from "../../features/products/utils/defectName"

export type CatalogRow = { id: number; name: string; activo: boolean }
export type AssociationRow = { id: number; product_id: number; defect_catalog_id: number; tolerance_percentage: number; activo: boolean }

export function planDefectNormalization(catalog: CatalogRow[], associations: AssociationRow[]) {
    const groups = new Map<string, CatalogRow[]>()
    for (const row of catalog) {
        const key = normalizeDefectName(standardizeDefectName(row.name))
        if (!key) throw new ErrorApp(409, `El defecto ${row.id} no tiene un nombre válido.`)
        groups.set(key, [...(groups.get(key) ?? []), row])
    }
    const targets = new Map<number, number>()
    const entries: { id: number; name: string; normalizedName: string; activo: boolean; evaluationKind: EvaluationKind }[] = []
    const aliases = new Map<string, { name: string; normalizedName: string; defectCatalogId: number }>()
    const addAlias = (name: string, id: number) => {
        const key = normalizeDefectName(name)
        if (aliases.has(key) && aliases.get(key)!.defectCatalogId !== id) throw new ErrorApp(409, `El alias ${name} tiene más de un significado. Requiere revisión.`)
        aliases.set(key, { name, normalizedName: key, defectCatalogId: id })
    }
    for (const [key, rows] of groups) {
        const name = standardizeDefectName(rows[0].name)
        if (name.length > 255 || key.length > 255) throw new ErrorApp(409, `El nombre normalizado del defecto ${rows[0].id} supera los 255 caracteres.`)
        const winner = [...rows].sort((a, b) => Number(b.name === name) - Number(a.name === name) || a.id - b.id)[0]
        // Solo en la migración se reconoce la antigua clasificación por texto.
        const pest = rows.some(row => /\b(gusanos?|afidos?)\b/.test(normalizeDefectName(row.name).toLowerCase()))
        entries.push({ id: winner.id, name, normalizedName: key, activo: rows.some(row => row.activo), evaluationKind: pest ? "pest_count" : "percentage" })
        for (const row of rows) { targets.set(row.id, winner.id); addAlias(row.name, winner.id) }
        addAlias(name, winner.id)
        for (const [spelling, official] of Object.entries(DEFECT_SPELLINGS)) if (normalizeDefectName(official) === key) addAlias(spelling, winner.id)
    }
    const byProduct = new Map<string, AssociationRow[]>()
    for (const row of associations) {
        const target = targets.get(row.defect_catalog_id)
        if (target === undefined) throw new ErrorApp(409, `La asociación ${row.id} no tiene un defecto válido.`)
        if (!Number.isFinite(row.tolerance_percentage) || row.tolerance_percentage < 0 || row.tolerance_percentage > 100) throw new ErrorApp(409, `La asociación ${row.id} tiene una tolerancia inválida.`)
        const key = `${row.product_id}:${target}`
        byProduct.set(key, [...(byProduct.get(key) ?? []), row])
    }
    const merges: { sourceId: number; targetId: number }[] = []
    const links: { id: number; defectCatalogId: number; activo: boolean }[] = []
    for (const rows of byProduct.values()) {
        if (new Set(rows.map(row => row.tolerance_percentage)).size > 1) {
            throw new ErrorApp(409, `Producto ${rows[0].product_id}: las asociaciones ${rows.map(row => `${row.id} (${row.tolerance_percentage} %)`).join(", ")} corresponden al mismo defecto con tolerancias distintas. No se modificaron datos; corrige este conflicto antes de continuar.`)
        }
        const winner = [...rows].sort((a, b) => Number(b.activo) - Number(a.activo) || a.id - b.id)[0]
        links.push({ id: winner.id, defectCatalogId: targets.get(winner.defect_catalog_id)!, activo: rows.some(row => row.activo) })
        for (const row of rows) if (row.id !== winner.id) merges.push({ sourceId: row.id, targetId: winner.id })
    }
    return { entries, aliases: [...aliases.values()], targets, links, merges }
}
