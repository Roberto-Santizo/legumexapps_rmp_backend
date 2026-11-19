import { Request, Response, NextFunction } from "express"
import { transportService } from "../services/transport.service"
import { ListCarriersQuery, ListPlatesQuery } from "../schemas/transport.schema"

async function indexCarriers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { page, limit, search, all, includeInactive } = req.query as unknown as ListCarriersQuery
        const result = await transportService.listCarriers({ page, limit }, search, all, includeInactive)
        res.json(result)
    } catch (error) {
        next(error)
    }
}

async function showCarrier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        const carrier = await transportService.getCarrierById(id)
        res.json({ data: carrier })
    } catch (error) {
        next(error)
    }
}

async function storeCarrier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const carrier = await transportService.createCarrier(req.body)
        res.status(201).json({
            message: "Transportista creado correctamente",
            data: carrier
        })
    } catch (error) {
        next(error)
    }
}

async function updateCarrier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        const carrier = await transportService.updateCarrier(id, req.body)
        res.json({
            message: "Transportista actualizado correctamente",
            data: carrier
        })
    } catch (error) {
        next(error)
    }
}

async function destroyCarrier(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        await transportService.deleteCarrier(id)
        res.json({ message: "Transportista eliminado correctamente" })
    } catch (error) {
        next(error)
    }
}

async function indexPlates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { carrierId, search, page, limit, all } = req.query as unknown as ListPlatesQuery
        const result = await transportService.listPlates(carrierId, search, { page, limit }, all)
        res.json(result)
    } catch (error) {
        next(error)
    }
}

async function showPlate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        const plate = await transportService.getPlateById(id)
        res.json({ data: plate })
    } catch (error) {
        next(error)
    }
}

async function storePlate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const plate = await transportService.createPlate(req.body)
        res.status(201).json({
            message: "Placa creada correctamente",
            data: plate
        })
    } catch (error) {
        next(error)
    }
}

async function updatePlate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        const plate = await transportService.updatePlate(id, req.body)
        res.json({
            message: "Placa actualizada correctamente",
            data: plate
        })
    } catch (error) {
        next(error)
    }
}

async function destroyPlate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        await transportService.deletePlate(id)
        res.json({ message: "Placa eliminada correctamente" })
    } catch (error) {
        next(error)
    }
}

async function updateCarrierStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const carrier = await transportService.setCarrierStatus(Number(req.params.id), req.body.activo)
        res.json({ message: carrier.activo ? "Transportista activado correctamente" : "Transportista desactivado correctamente", data: carrier })
    } catch (error) {
        next(error)
    }
}

export const transportController = {
    updateCarrierStatus,
    indexCarriers,
    showCarrier,
    storeCarrier,
    updateCarrier,
    destroyCarrier,
    indexPlates,
    showPlate,
    storePlate,
    updatePlate,
    destroyPlate
}
