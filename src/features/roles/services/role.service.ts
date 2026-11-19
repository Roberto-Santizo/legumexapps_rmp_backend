import { Op, WhereOptions } from "sequelize"
import { CreateRoleInput, UpdateRoleInput } from "../schemas/role.schema"
import { ErrorApp, ErrorNoEncontrado } from "../../../shared/errores/ErrorApp"
import { paginateOrAll, PaginatedResult, PaginationParams } from "../../../shared/utils/pagination.util"
import Role from "../models/Role.model"
import sequelize from "../../../basedatos/conexion"
import { replaceRolePermissions } from "../../rolePermissions/services/rolePermission.service"

async function listRoles(
    pagination?: PaginationParams,
    search?: string,
    all?: boolean
): Promise<PaginatedResult<Role> | { data: Role[] }> {
    const where: WhereOptions = { activo: true, ...(search ? { name: { [Op.iLike]: `%${search}%` } } : {}) }
    return paginateOrAll(Role, { where, order: [["name", "ASC"]] }, pagination, all)
}

async function getRoleById(id: number): Promise<Role> {
    const role = await Role.findOne({ where: { id, activo: true } })
    if (!role) throw new ErrorNoEncontrado("Rol", id)
    return role
}

async function createRole(input: CreateRoleInput): Promise<Role> {
    return sequelize.transaction(async transaction => {
        const role = await Role.create({ name: input.name }, { transaction })
        if (input.permissionIds !== undefined) await replaceRolePermissions(role.id, input.permissionIds, transaction)
        return role
    })
}

async function updateRole(id: number, input: UpdateRoleInput): Promise<Role> {
    return sequelize.transaction(async transaction => {
        const role = await Role.findOne({ where: { id, activo: true }, transaction, lock: transaction.LOCK.UPDATE })
        if (!role) throw new ErrorNoEncontrado("Rol", id)
        if (role.name.trim().toLocaleLowerCase("es") === "campo" && input.name !== undefined && input.name.trim().toLocaleLowerCase("es") !== "campo") {
            throw new ErrorApp(409, "El nombre del rol Campo identifica su alcance de consulta y no se puede cambiar.")
        }
        if (input.name !== undefined) await role.update({ name: input.name }, { transaction })
        if (input.permissionIds !== undefined) await replaceRolePermissions(role.id, input.permissionIds, transaction)
        return role
    })
}

async function deleteRole(id: number): Promise<void> {
    const role = await getRoleById(id)
    await role.update({ activo: false })
}

export const roleService = {
    listRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
}
