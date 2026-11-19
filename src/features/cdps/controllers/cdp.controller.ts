import { Request, Response, NextFunction } from "express"
import { cdpService } from "../services/cdp.service"
import { CdpQuery } from "../schemas/cdp.schema"

async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { page, limit, search, all } = req.query as unknown as CdpQuery
        const result = await cdpService.listCdps({ page, limit }, search, all)
        res.json(result)
    } catch (error) {
        next(error)
    }
}

async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        const cdp = await cdpService.getCdpById(id)
        res.json({ data: cdp })
    } catch (error) {
        next(error)
    }
}

async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const cdp = await cdpService.createCdp(req.body)
        res.status(201).json({
            message: "CDP creado correctamente",
            data: cdp
        })
    } catch (error) {
        next(error)
    }
}

async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        const cdp = await cdpService.updateCdp(id, req.body)
        res.json({
            message: "CDP actualizado correctamente",
            data: cdp
        })
    } catch (error) {
        next(error)
    }
}

async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        await cdpService.deleteCdp(id)
        res.json({ message: "CDP eliminado correctamente" })
    } catch (error) {
        next(error)
    }
}

export const cdpController = {
    index,
    show,
    store,
    update,
    destroy
}
