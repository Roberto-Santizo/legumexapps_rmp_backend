import type { Transaction } from "sequelize"
import { ErrorApp } from "../../../shared/errores/ErrorApp"
import Permission from "../models/Permission.model"
import { SYSTEM_PERMISSION_NAMES } from "../catalog/systemPermissions"

export const systemPermissionWhere = { activo: true, name: SYSTEM_PERMISSION_NAMES }

export async function listPermissionCatalog(): Promise<Permission[]> {
    return Permission.findAll({ where: systemPermissionWhere, order: [["name", "ASC"]] })
}

export async function validatePermissionIds(permissionIds: number[], transaction: Transaction): Promise<number[]> {
    const uniqueIds = [...new Set(permissionIds)]
    if (uniqueIds.length) {
        const valid = await Permission.findAll({ where: { ...systemPermissionWhere, id: uniqueIds }, transaction, lock: transaction.LOCK.SHARE })
        if (valid.length !== uniqueIds.length) throw new ErrorApp(400, "Solo puedes asignar permisos activos definidos por el sistema. Recarga el catálogo del rol.")
    }
    return uniqueIds
}
