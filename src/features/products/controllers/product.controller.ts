import { Request, Response, NextFunction } from "express"
import { productService } from "../services/product.service"
import { ProductQuery } from "../schemas/product.schema"

// Nombres ya usados en otros productos, para sugerirlos y evitar variantes.
async function defectNames(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ data: await productService.listDefectNames() }) }
    catch (error) { next(error) }
}

async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { page, limit, search, all, includeInactive } = req.query as unknown as ProductQuery
        const result = await productService.listProducts({ page, limit }, search, all, includeInactive)
        res.json(result)
    } catch (error) {
        next(error)
    }
}

async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        const product = await productService.getProductById(id)
        res.json({ data: product })
    } catch (error) {
        next(error)
    }
}

async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const product = await productService.createProduct(req.body)
        res.status(201).json({
            message: "Producto creado correctamente",
            data: product
        })
    } catch (error) {
        next(error)
    }
}

async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        const product = await productService.updateProduct(id, req.body)
        res.json({
            message: "Producto actualizado correctamente",
            data: product
        })
    } catch (error) {
        next(error)
    }
}

async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        await productService.deleteProduct(id)
        res.json({ message: "Producto eliminado correctamente" })
    } catch (error) {
        next(error)
    }
}

async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const product = await productService.setProductStatus(Number(req.params.id), req.body.activo)
        res.json({ message: product.activo ? "Producto activado correctamente" : "Producto desactivado correctamente", data: product })
    } catch (error) {
        next(error)
    }
}

export const productController = {
    defectNames,
    updateStatus,
    index,
    show,
    store,
    update,
    destroy
}
