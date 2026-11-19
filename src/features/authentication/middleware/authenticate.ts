import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { entorno } from "../../../config/env"
import { ErrorNoAutorizado } from "../../../shared/errores/ErrorApp"
import User from "../../users/models/User.model"
import Role from "../../roles/models/Role.model"
import Permission from "../../permissions/models/Permission.model"
import { SYSTEM_PERMISSION_NAMES, isSystemPermission } from "../../permissions/catalog/systemPermissions"
import { matchesCredentialVersion } from "../services/credentialVersion"

export type TokenPayload = {
    sub: number
    username: string
    roleId: number
    roleName: string
    permissions: string[]
    credentialVersion: string
    representedCarrierId?: number | null
    plantId?: number | null
}

declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload
        }
    }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith("Bearer ")) {
        next(new ErrorNoAutorizado("Debes iniciar sesión para acceder a este recurso"))
        return
    }

    const token = authHeader.slice("Bearer ".length)

    try {
        const claims = jwt.verify(token, entorno.secretoJwt, { algorithms: ["HS256"] })
        if (typeof claims === "string" || !Number.isSafeInteger(claims.sub) || Number(claims.sub) <= 0) throw new Error("Invalid subject")
        req.user = claims as unknown as TokenPayload
    } catch {
        next(new ErrorNoAutorizado("Debes iniciar sesión para acceder a este recurso"))
        return
    }

    try {
        const user = await User.findOne({
            where: { id: req.user.sub, activo: true }, attributes: ["id", "roleId", "passwordHash", "representedCarrierId", "plantId"],
            include: [{ model: Role, required: true, where: { activo: true },
                include: [{ model: Permission, required: false, where: { activo: true, name: SYSTEM_PERMISSION_NAMES }, attributes: ["name"] }] }],
        })
        if (!user) {
            next(new ErrorNoAutorizado("Tu cuenta está desactivada o ya no está disponible"))
            return
        }
        if (!matchesCredentialVersion(req.user.credentialVersion, user.passwordHash, entorno.secretoJwt)) {
            next(new ErrorNoAutorizado("La sesión ya no es válida. Inicia sesión nuevamente."))
            return
        }
        // Los cambios de rol/permisos se aplican incluso a tokens emitidos anteriormente.
        req.user.roleId = user.roleId
        req.user.roleName = user.role.name
        req.user.representedCarrierId = user.representedCarrierId ?? null
        req.user.plantId = user.plantId ?? null
        req.user.permissions = user.role.permissions.map(permission => permission.name).filter(isSystemPermission)
        next()
    } catch (error) {
        next(error)
    }
}
