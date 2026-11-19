import { Request, Response, NextFunction } from "express"
import { varietyProductService } from "../services/varietyProduct.service"
import { VarietyProductQuery } from "../schemas/varietyProduct.schema"

async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { page, limit, search, all } = req.query as unknown as VarietyProductQuery
        const result = await varietyProductService.listVarietyProducts({ page, limit }, search, all)
        res.json(result)
    } catch (error) {
        next(error)
    }
}

async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        const varietyProduct = await varietyProductService.getVarietyProductById(id)
        res.json({ data: varietyProduct })
    } catch (error) {
        next(error)
    }
}

async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const varietyProduct = await varietyProductService.createVarietyProduct(req.body)
        res.status(201).json({
            message: "Variedad creada correctamente",
            data: varietyProduct
        })
    } catch (error) {
        next(error)
    }
}

async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        const varietyProduct = await varietyProductService.updateVarietyProduct(id, req.body)
        res.json({
            message: "Variedad actualizada correctamente",
            data: varietyProduct
        })
    } catch (error) {
        next(error)
    }
}

async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        await varietyProductService.deleteVarietyProduct(id)
        res.json({ message: "Variedad eliminada correctamente" })
    } catch (error) {
        next(error)
    }
}

export const varietyProductController = {
    index,
    show,
    store,
    update,
    destroy
}
