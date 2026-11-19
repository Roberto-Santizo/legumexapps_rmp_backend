import bcrypt from "bcryptjs"
import { entorno } from "../../config/env"
import User from "../../features/users/models/User.model"
import Role from "../../features/roles/models/Role.model"
import Permission from "../../features/permissions/models/Permission.model"
import RolePermission from "../../features/rolePermissions/models/RolePermission.model"
import { SYSTEM_PERMISSION_NAMES } from "../../features/permissions/catalog/systemPermissions"
import { validarAdministradorInicial } from "../prepararBaseDatos"

const ADMIN_ROLE_NAME = "Administrador"
const PASSWORD_SALT_ROUNDS = 10

async function seedPermissions(): Promise<void> {
    await Permission.bulkCreate(SYSTEM_PERMISSION_NAMES.map(name => ({ name, activo: true, description: null })),
        { ignoreDuplicates: true })
}

async function seedAdminRoleWithAllPermissions(): Promise<Role> {
    const [adminRole] = await Role.findOrCreate({
        where: { name: ADMIN_ROLE_NAME },
        defaults: { name: ADMIN_ROLE_NAME }
    })

    const allPermissions = await Permission.findAll({ where: { name: SYSTEM_PERMISSION_NAMES, activo: true }, attributes: ["id"] })
    if (allPermissions.length > 0) {
        await RolePermission.bulkCreate(
            allPermissions.map(permission => ({ roleId: adminRole.id, permissionId: permission.id })),
            { ignoreDuplicates: true }
        )
    }

    return adminRole
}

async function seedAdminUser(adminRole: Role): Promise<void> {
    const { seedAdminUsername, seedAdminPassword } = entorno
    if (!seedAdminUsername || !seedAdminPassword) return

    const existingUser = await User.findOne({ where: { username: seedAdminUsername } })
    if (existingUser) return

    const passwordHash = await bcrypt.hash(seedAdminPassword, PASSWORD_SALT_ROUNDS)
    const [, created] = await User.findOrCreate({ where: { username: seedAdminUsername }, defaults: {
        name: "Administrador",
        username: seedAdminUsername,
        passwordHash,
        roleId: adminRole.id
    } })

    if (created) console.info("Administrador principal creado.")
}

export async function seedAccessControl(): Promise<void> {
    validarAdministradorInicial(entorno)
    await seedPermissions()
    const adminRole = await seedAdminRoleWithAllPermissions()
    await seedAdminUser(adminRole)
}
