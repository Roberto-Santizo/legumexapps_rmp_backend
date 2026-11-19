import { Request, Response, NextFunction } from "express"
import { userService } from "../services/user.service"
import { UserQuery } from "../schemas/user.schema"
import { ErrorApp } from "../../../shared/errores/ErrorApp"

async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { page, limit, search, all } = req.query as unknown as UserQuery
        const result = await userService.listUsers({ page, limit }, search, all)
        res.json(result)
    } catch (error) {
        next(error)
    }
}

async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = Number(req.params.id)
        const user = await userService.getUserById(userId)
        res.json({ data: user })
    } catch (error) {
        next(error)
    }
}

async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await userService.createUser(req.body)
        res.status(201).json({
            message: "Usuario creado correctamente",
            data: user
        })
    } catch (error) {
        next(error)
    }
}

async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = Number(req.params.id)
        const user = await userService.updateUser(userId, req.body)
        res.json({
            message: "Usuario actualizado correctamente",
            data: user
        })
    } catch (error) {
        next(error)
    }
}

async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = Number(req.params.id)
        if (userId === Number(req.user?.sub)) throw new ErrorApp(400, "No puedes desactivar tu propia cuenta.")
        await userService.deleteUser(userId)
        res.json({ message: "Usuario eliminado correctamente" })
    } catch (error) {
        next(error)
    }
}

async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = Number(req.params.id)
        const { activo } = req.body
        if (!activo && userId === Number(req.user?.sub)) throw new ErrorApp(400, "No puedes desactivar tu propia cuenta.")
        const user = await userService.setUserStatus(userId, activo)
        res.json({
            message: activo ? "Usuario activado correctamente" : "Usuario desactivado correctamente",
            data: user
        })
    } catch (error) {
        next(error)
    }
}

export const userController = {
    index,
    show,
    store,
    update,
    destroy,
    updateStatus
}
