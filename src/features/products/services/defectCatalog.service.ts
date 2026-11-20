import type { Transaction } from "sequelize"
import { ErrorApp, ErrorNoEncontrado } from "../../../shared/errores/ErrorApp"
import DefectCatalog from "../models/DefectCatalog.model"
import DefectAlias from "../models/DefectAlias.model"
import { normalizeDefectName, standardizeDefectName, DEFECT_SPELLINGS, type EvaluationKind } from "../utils/defectName"

export async function listDefectCatalog(includeInactive = false): Promise<DefectCatalog[]> {
    return DefectCatalog.findAll({ where: includeInactive ? {} : { activo: true }, include: [{ model: DefectAlias, separate: true }], order: [["name", "ASC"]] })
}

async function reserveAlias(name: string, id: number, transaction: Transaction) {
    const [alias] = await DefectAlias.findOrCreate({
        where: { normalizedName: normalizeDefectName(name) },
        defaults: { name, normalizedName: normalizeDefectName(name), defectCatalogId: id, activo: true }, transaction,
    })
    if (alias.defectCatalogId !== id) throw new ErrorApp(409, "Este nombre ya pertenece a otro defecto del catálogo. Selecciona el registrado.")
}

export async function findOrCreateDefect(name: string, evaluationKind: EvaluationKind = "percentage"): Promise<[DefectCatalog, boolean]> {
    return DefectCatalog.sequelize!.transaction(async transaction => {
        await DefectCatalog.sequelize!.query("SELECT pg_advisory_xact_lock(742019, 2)", { transaction })
        const canonicalName = standardizeDefectName(name)
        const alias = await DefectAlias.findOne({ where: { normalizedName: normalizeDefectName(canonicalName) }, include: [DefectCatalog], transaction })
        const [record, created] = alias ? [alias.defectCatalog, false] as const : await DefectCatalog.findOrCreate({
            where: { normalizedName: normalizeDefectName(canonicalName) },
            defaults: { name: canonicalName, normalizedName: normalizeDefectName(canonicalName), evaluationKind, activo: true }, transaction,
        })
        if (!record.activo) throw new ErrorApp(409, "Este defecto está inactivo en el catálogo. Solicita su reactivación.")
        await reserveAlias(name, record.id, transaction)
        await reserveAlias(canonicalName, record.id, transaction)
        for (const [spelling, official] of Object.entries(DEFECT_SPELLINGS)) {
            if (normalizeDefectName(official) === record.normalizedName) await reserveAlias(spelling, record.id, transaction)
        }
        return [record, created]
    })
}

export async function updateCatalogDefect(id: number, input: { name?: string; evaluationKind?: EvaluationKind; activo?: boolean }) {
    return DefectCatalog.sequelize!.transaction(async transaction => {
        await DefectCatalog.sequelize!.query("SELECT pg_advisory_xact_lock(742019, 2)", { transaction })
        const record = await DefectCatalog.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
        if (!record) throw new ErrorNoEncontrado("Defecto", id)
        const name = input.name === undefined ? record.name : standardizeDefectName(input.name)
        // El alias anterior permite seguir encontrando el defecto después de corregirlo.
        await reserveAlias(record.name, id, transaction)
        await reserveAlias(name, id, transaction)
        const duplicate = await DefectCatalog.findOne({ where: { normalizedName: normalizeDefectName(name) }, transaction })
        if (duplicate && duplicate.id !== id) throw new ErrorApp(409, "Ya existe este defecto. Selecciona el registrado en lugar de duplicarlo.")
        await record.update({ ...input, name, normalizedName: normalizeDefectName(name) }, { transaction })
        return record
    })
}

export async function defectNamesForReports(): Promise<Map<string, string>> {
    const aliases = await DefectAlias.findAll({ include: [DefectCatalog] })
    return new Map(aliases.map(alias => [alias.normalizedName, alias.defectCatalog.name]))
}

export async function resolveProductDefects<T extends { id?: number; defectCatalogId: number; tolerancePercentage: number; activo: boolean }>(
    defects: T[], transaction: Transaction, existing = new Map<number, { defectCatalogId: number }>(),
) {
    const resolved = []
    const ids = new Set<number>()
    for (const defect of defects) {
        const catalog = await DefectCatalog.findByPk(defect.defectCatalogId, { transaction })
        const retained = defect.id !== undefined && existing.get(defect.id)?.defectCatalogId === defect.defectCatalogId
        if (!catalog || (!catalog.activo && !retained)) throw new ErrorApp(400, "El defecto seleccionado no está disponible. Recarga el catálogo.")
        if (ids.has(catalog.id)) throw new ErrorApp(400, "No repitas un defecto en el mismo producto")
        ids.add(catalog.id)
        resolved.push({ id: defect.id, defectCatalogId: catalog.id, tolerancePercentage: defect.tolerancePercentage, activo: defect.activo })
    }
    return resolved
}
