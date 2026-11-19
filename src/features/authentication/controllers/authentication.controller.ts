import { authenticationService } from "../services/authentication.service"
import { Request, Response, NextFunction } from "express"

async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await authenticationService.login(req.body)
        res.json({
            message: "Inicio de sesión exitoso",
            data: result,
        })
    } catch (error) {
        next(error)
    }
}

async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await authenticationService.refresh(req.user!.sub)
        res.json({ message: "Permisos de sesión actualizados", data: result })
    } catch (error) { next(error) }
}

export const authenticationController = {
    login,
    refresh,
}
