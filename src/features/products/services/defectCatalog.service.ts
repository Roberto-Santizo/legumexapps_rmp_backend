import { UniqueConstraintError, type Transaction } from "sequelize"
import { ErrorApp, ErrorNoEncontrado } from "../../../shared/errores/ErrorApp"
import DefectCatalog from "../models/DefectCatalog.model"
import { normalizeDefectName, standardizeDefectName } from "../utils/defectName"

export async function listDefectCatalog(includeInactive = false): Promise<DefectCatalog[]> {
    return DefectCatalog.findAll({ where: includeInactive ? {} : { activo: true }, order: [["name", "ASC"]] })
}

export async function findOrCreateDefect(name: string): Promise<[DefectCatalog, boolean]> {
    const canonicalName = standardizeDefectName(name)
    const [record, created] = await DefectCatalog.findOrCreate({
        where: { normalizedName: normalizeDefectName(canonicalName) },
        defaults: { name: canonicalName, normalizedName: normalizeDefectName(canonicalName), activo: true },
    })
    if (!record.activo) throw new ErrorApp(409, "Este defecto está inactivo en el catálogo. Solicita su reactivación.")
    return [record, created]
}

export async function updateCatalogDefect(id: number, input: { name?: string; activo?: boolean }) {
    try {
        return await DefectCatalog.sequelize!.transaction(async transaction => {
            const record = await DefectCatalog.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
            if (!record) throw new ErrorNoEncontrado("Defecto", id)
            const name = input.name === undefined ? record.name : standardizeDefectName(input.name)
            const normalizedName = normalizeDefectName(name)
            const duplicate = await DefectCatalog.findOne({ where: { normalizedName }, transaction })
            if (duplicate && duplicate.id !== id) throw new ErrorApp(409, "Ya existe este defecto. Selecciona el registrado en lugar de duplicarlo.")
            await record.update({ ...input, name, normalizedName }, { transaction })
            return record
        })
    } catch (error) {
        if (error instanceof UniqueConstraintError) throw new ErrorApp(409, "Ya existe este defecto. Selecciona el registrado en lugar de duplicarlo.")
        throw error
    }
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
