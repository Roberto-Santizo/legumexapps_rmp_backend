import { Request, Response, NextFunction } from "express"
import { productService } from "../services/product.service"
import { ProductQuery } from "../schemas/product.schema"
import { listDefectCatalog, findOrCreateDefect, updateCatalogDefect } from "../services/defectCatalog.service"

async function defectCatalog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ data: await listDefectCatalog(req.query.includeInactive === "true") }) }
    catch (error) { next(error) }
}

async function createDefect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const [defect, created] = await findOrCreateDefect(req.body.name)
        res.status(created ? 201 : 200).json({
            message: created ? "Defecto creado en el catálogo" : "Este defecto ya existe; se seleccionó el registrado",
            data: defect,
        })
    } catch (error) { next(error) }
}

async function updateDefect(req: Request, res: Response, next: NextFunction): Promise<void> {
    try { res.json({ message: "Defecto del catálogo actualizado", data: await updateCatalogDefect(Number(req.params.id), req.body) }) }
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
    defectCatalog,
    createDefect,
    updateDefect,
    updateStatus,
    index,
    show,
    store,
    update,
    destroy
}
