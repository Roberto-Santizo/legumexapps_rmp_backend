import { Request, Response, NextFunction, RequestHandler } from "express"
import { ErrorProhibido } from "../errores/ErrorApp"

export function authorize(permission: string): RequestHandler {
    return authorizeAny(permission)
}

export function authorizeAny(...allowed: string[]): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const permissions = req.user?.permissions ?? []
        if (!allowed.some(permission => permissions.includes(permission))) {
            next(new ErrorProhibido())
            return
        }
        next()
    }
}
