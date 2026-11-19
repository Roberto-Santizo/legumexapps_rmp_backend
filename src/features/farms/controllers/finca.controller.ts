import { Request, Response, NextFunction } from "express"
import { fincaService } from "../services/finca.service"
import type { FincaQuery } from "../schemas/finca.schema"

async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { page, limit, search, all } = req.query as unknown as FincaQuery
        const result = await fincaService.listFincas({ page, limit }, search, all ?? page === undefined)
        res.json(result)
    } catch (error) {
        next(error)
    }
}

async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const finca = await fincaService.createFinca(req.body)
        res.status(201).json({ message: "Finca registrada correctamente", data: finca })
    } catch (error) {
        next(error)
    }
}

async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        res.json({ data: await fincaService.getFincaById(Number(req.params.id)) })
    } catch (error) { next(error) }
}

async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const finca = await fincaService.updateFinca(Number(req.params.id), req.body)
        res.json({ message: "Finca actualizada correctamente", data: finca })
    } catch (error) { next(error) }
}

async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await fincaService.deleteFinca(Number(req.params.id))
        res.json({ message: "Finca eliminada correctamente" })
    } catch (error) { next(error) }
}

export const fincaController = {
    index,
    store,
    show,
    update,
    destroy,
}
