import { Request, Response, NextFunction } from "express"
import { basketService } from "../services/basket.service"
import { BasketQuery } from "../schemas/basket.schema"

async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { page, limit, search, all } = req.query as unknown as BasketQuery
        const result = await basketService.listBaskets({ page, limit }, search, all)
        res.json(result)
    } catch (error) {
        next(error)
    }
}

async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        const basket = await basketService.getBasketById(id)
        res.json({ data: basket })
    } catch (error) {
        next(error)
    }
}

async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const basket = await basketService.createBasket(req.body)
        res.status(201).json({
            message: "Canasta creada correctamente",
            data: basket
        })
    } catch (error) {
        next(error)
    }
}

async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        const basket = await basketService.updateBasket(id, req.body)
        res.json({
            message: "Canasta actualizada correctamente",
            data: basket
        })
    } catch (error) {
        next(error)
    }
}

async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        await basketService.deleteBasket(id)
        res.json({ message: "Canasta eliminada correctamente" })
    } catch (error) {
        next(error)
    }
}

export const basketController = {
    index,
    show,
    store,
    update,
    destroy
}
