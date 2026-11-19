import type { Transaction } from "sequelize"
import sequelize from "../../../basedatos/conexion"
import { ErrorNoEncontrado } from "../../../shared/errores/ErrorApp"
import Permission from "../../permissions/models/Permission.model"
import { systemPermissionWhere, validatePermissionIds } from "../../permissions/services/permissionCatalog.service"
import Role from "../../roles/models/Role.model"
import RolePermission from "../models/RolePermission.model"

async function getPermissionsByRole(roleId: number): Promise<Permission[]> {
    const role = await Role.findOne({ where: { id: roleId, activo: true } })
    if (!role) throw new ErrorNoEncontrado("Rol", roleId)
    return Permission.findAll({ where: systemPermissionWhere,
        include: [{ association: "roles", attributes: [], where: { id: roleId }, required: true }],
        order: [["name", "ASC"]] })
}

// Utilizado también al crear/editar el rol para guardar nombre y asignaciones
// en una sola transacción, sin dejar roles incompletos si la selección falla.
export async function replaceRolePermissions(roleId: number, permissionIds: number[], transaction: Transaction): Promise<void> {
    const uniqueIds = await validatePermissionIds(permissionIds, transaction)
    await RolePermission.destroy({ where: { roleId }, transaction })
    if (uniqueIds.length) await RolePermission.bulkCreate(uniqueIds.map(permissionId => ({ roleId, permissionId })), { transaction })
}

async function syncRolePermissions(roleId: number, permissionIds: number[]): Promise<Permission[]> {
    await sequelize.transaction(async transaction => {
        const role = await Role.findOne({ where: { id: roleId, activo: true }, transaction, lock: transaction.LOCK.UPDATE })
        if (!role) throw new ErrorNoEncontrado("Rol", roleId)
        await replaceRolePermissions(roleId, permissionIds, transaction)
    })
    return getPermissionsByRole(roleId)
}

export const rolePermissionService = { getPermissionsByRole, syncRolePermissions }