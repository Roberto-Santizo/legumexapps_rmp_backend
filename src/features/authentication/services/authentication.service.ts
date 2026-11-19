import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { entorno } from "../../../config/env"
import { ErrorNoAutorizado, ErrorCuentaBloqueada } from "../../../shared/errores/ErrorApp"
import { clearFailedAttempts, isAccountLocked, registerFailedAttempt } from "./accountLockout.service"
import User from "../../users/models/User.model"
import Plant from "../../plants/models/Plant.model"
import type { Includeable } from "sequelize"
import Role from "../../roles/models/Role.model"
import Permission from "../../permissions/models/Permission.model"
import { LoginInput } from "../schemas/authentication.schema"
import { SYSTEM_PERMISSION_NAMES, isSystemPermission } from "../../permissions/catalog/systemPermissions"
import { credentialVersion } from "./credentialVersion"

const sessionInclude: Includeable[] = [{
    model: Role, required: true, where: { activo: true },
    include: [{ model: Permission, required: false, where: { activo: true, name: SYSTEM_PERMISSION_NAMES }, attributes: ["name"] }],
}, { model: Plant, required: false }]

type LoginResult = {
    token: string
    user: {
        id: number
        name: string
        username: string
        role: string
        permissions: string[]
        representedCarrierId: number | null
        plantId: number | null
        plant: { id: number; name: string; code: "LP" | "LT" } | null
    }
}

async function login(data: LoginInput): Promise<LoginResult> {
    const user = await User.findOne({
        where: { username: data.username, activo: true },
        include: sessionInclude
    })

    if (!user) throw new ErrorNoAutorizado()

    if (isAccountLocked(user)) {
        throw new ErrorCuentaBloqueada()
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash)

    if (!validPassword) {
        await registerFailedAttempt(user)
        throw new ErrorNoAutorizado()
    }

    await clearFailedAttempts(user)

    return createSession(user)
}

function createSession(user: User): LoginResult {
    const permissions = user.role.permissions.map(permission => permission.name).filter(isSystemPermission)

    const token = jwt.sign(
        { sub: user.id, username: user.username, roleId: user.roleId, roleName: user.role.name, permissions,
            credentialVersion: credentialVersion(user.passwordHash, entorno.secretoJwt) },
        entorno.secretoJwt,
        { expiresIn: entorno.expiracionJwt } as jwt.SignOptions
    )

    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role.name,
            permissions,
            representedCarrierId: user.representedCarrierId ?? null,
            plantId: user.plantId ?? null,
            plant: user.plant ? { id: user.plant.id, name: user.plant.name, code: user.plant.code } : null,
        }
    }
}

async function refresh(userId: number): Promise<LoginResult> {
    const user = await User.findOne({ where: { id: userId, activo: true }, include: sessionInclude })
    if (!user) throw new ErrorNoAutorizado("Tu usuario o rol ya no está disponible")
    if (isAccountLocked(user)) throw new ErrorCuentaBloqueada()
    return createSession(user)
}

export const authenticationService = {
    login,
    refresh,
}
