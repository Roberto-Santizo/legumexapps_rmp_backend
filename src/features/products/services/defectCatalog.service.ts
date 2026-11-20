import type { Transaction } from "sequelize"
import { ErrorApp } from "../../../shared/errores/ErrorApp"
import DefectCatalog from "../models/DefectCatalog.model"
import { displayDefectName, normalizeDefectName } from "../utils/defectName"

export async function listDefectCatalog(): Promise<DefectCatalog[]> {
    return DefectCatalog.findAll({ where: { activo: true }, order: [["name", "ASC"]] })
}

export async function findOrCreateDefect(name: string, transaction?: Transaction): Promise<[DefectCatalog, boolean]> {
    return DefectCatalog.findOrCreate({
        where: { normalizedName: normalizeDefectName(name) },
        defaults: { name: displayDefectName(name), normalizedName: normalizeDefectName(name), activo: true },
        transaction,
    })
}

export async function resolveProductDefects<T extends { name: string; defectCatalogId?: number }>(defects: T[], transaction: Transaction) {
    const resolved = []
    const ids = new Set<number>()
    for (const defect of defects) {
        // Admite también formularios de una versión anterior durante el despliegue.
        const catalog = defect.defectCatalogId === undefined
            ? (await findOrCreateDefect(defect.name, transaction))[0]
            : await DefectCatalog.findOne({ where: { id: defect.defectCatalogId, activo: true }, transaction })
        if (!catalog || !catalog.activo) throw new ErrorApp(400, "El defecto seleccionado no está disponible. Recarga el catálogo.")
        if (ids.has(catalog.id)) throw new ErrorApp(400, "No repitas un defecto en el mismo producto")
        ids.add(catalog.id)
        resolved.push({ ...defect, defectCatalogId: catalog.id, name: catalog.name })
    }
    return resolved
}
