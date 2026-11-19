import { Request, Response, NextFunction } from "express"
import { producerService } from "../services/producer.service"
import type { ProducerQuery } from "../schemas/producer.schema"

async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { page, limit, search, all } = req.query as unknown as ProducerQuery
        const result = await producerService.listProducers({ page, limit }, search, all ?? page === undefined)
        res.json(result)
    } catch (error) {
        next(error)
    }
}

async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const producer = await producerService.createProducer(req.body)
        res.status(201).json({ message: "Productor registrado correctamente", data: producer })
    } catch (error) {
        next(error)
    }
}

async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        res.json({ data: await producerService.getProducerById(Number(req.params.id)) })
    } catch (error) { next(error) }
}

async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const producer = await producerService.updateProducer(Number(req.params.id), req.body)
        res.json({ message: "Productor actualizado correctamente", data: producer })
    } catch (error) { next(error) }
}

async function destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await producerService.deleteProducer(Number(req.params.id))
        res.json({ message: "Productor eliminado correctamente" })
    } catch (error) { next(error) }
}

export const producerController = {
    index,
    store,
    show,
    update,
    destroy,
}
