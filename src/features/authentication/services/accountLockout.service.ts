import User from "../../users/models/User.model"
import { ErrorCuentaBloqueada, ErrorNoAutorizado } from "../../../shared/errores/ErrorApp"

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15

export function isAccountLocked(user: User): boolean {
    return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now()
}

export async function registerFailedAttempt(user: User): Promise<void> {
    await User.sequelize!.transaction(async transaction => {
        const current = await User.findByPk(user.id, { transaction, lock: transaction.LOCK.UPDATE })
        if (!current || isAccountLocked(current)) return
        const failedAttempts = current.failedAttempts + 1
        const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS
        await current.update({
            failedAttempts: shouldLock ? 0 : failedAttempts,
            lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000) : null,
        }, { transaction })
    })
}

export async function clearFailedAttempts(user: User): Promise<void> {
    await User.sequelize!.transaction(async transaction => {
        const current = await User.findByPk(user.id, { transaction, lock: transaction.LOCK.UPDATE })
        // A successful login must not undo a lock created by concurrent attempts.
        if (!current || !current.activo || current.passwordHash !== user.passwordHash) throw new ErrorNoAutorizado()
        if (isAccountLocked(current)) throw new ErrorCuentaBloqueada()
        if (current.failedAttempts !== 0 || current.lockedUntil) await current.update({ failedAttempts: 0, lockedUntil: null }, { transaction })
    })
}
