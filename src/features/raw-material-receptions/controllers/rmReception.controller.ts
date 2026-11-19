import { Request, Response, NextFunction } from "express"
import { rmReceptionService } from "../services/rmReception.service"
import { RmReceptionQuery } from "../schemas/rmReception.schema"
import { getReceptionDocument } from "../services/receptionDocument.service"
import { fieldReceiptOwner, representedCarrierScope } from "../services/receptionVisibility"

async function index(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { page, limit, receiptNumber, grn, date, startDate, endDate, producer, inspector, plate, carrier, status } = req.query as unknown as RmReceptionQuery
        const result = await rmReceptionService.listRmReceptions(
            { page, limit },
            { receiptNumber, grn, date, startDate, endDate, producer, inspector, plate, carrier, status },
            representedCarrierScope(req.user!) === undefined ? fieldReceiptOwner(req.user!) : undefined,
            representedCarrierScope(req.user!)
        )
        res.json(result)
    } catch (error) {
        next(error)
    }
}

async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        const rmReception = await rmReceptionService.getRmReceptionById(id)
        res.json({ data: rmReception })
    } catch (error) {
        next(error)
    }
}

async function store(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = req.user!.sub
        const rmReception = await rmReceptionService.createRmReception(req.body, userId)
        res.status(201).json({
            message: "Boleta creada correctamente",
            data: rmReception
        })
    } catch (error) {
        next(error)
    }
}

async function completeReception(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = Number(req.params.id)
        const rmReception = await rmReceptionService.completeReception(id, req.body, req.user!.sub)
        res.json({
            message: "Recepción registrada correctamente",
            data: rmReception
        })
    } catch (error) {
        next(error)
    }
}

async function assignGrn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await rmReceptionService.assignGrn(Number(req.params.id), req.body.grnNumber)
        res.json({ message: "GRN asignado correctamente. La boleta está cerrada", data })
    } catch (error) { next(error) }
}

async function editField(req: Request, res: Response, next: NextFunction) {
    try {
        const data = await rmReceptionService.editField(Number(req.params.id), req.body, req.user!.sub, req.user!.permissions, req.user!.roleName)
        res.json({ message: "Datos de campo corregidos correctamente", data })
    } catch (error) { next(error) }
}

async function editReception(req: Request, res: Response, next: NextFunction) {
    try {
        const data = await rmReceptionService.editReception(Number(req.params.id), req.body, req.user!.sub, req.user!.permissions)
        res.json({ message: "Recepción corregida correctamente", data })
    } catch (error) { next(error) }
}

async function history(req: Request, res: Response, next: NextFunction) {
    try { res.json({ data: await rmReceptionService.editHistory(Number(req.params.id)) }) }
    catch (error) { next(error) }
}

export const rmReceptionController = {
    async searchDocuments(req: Request, res: Response, next: NextFunction) {
        res.setHeader("Cache-Control", "no-store")
        await index(req, res, next)
    },
    async documents(req: Request, res: Response, next: NextFunction) {
        try {
            res.setHeader("Cache-Control", "no-store")
            const carrierId = representedCarrierScope(req.user!)
            const data = await rmReceptionService.listDocumentIds(
                req.query as unknown as RmReceptionQuery,
                carrierId === undefined ? fieldReceiptOwner(req.user!) : undefined,
                carrierId,
            )
            res.json({ data })
        } catch (error) { next(error) }
    },
    async document(req: Request, res: Response, next: NextFunction) {
        try {
            res.setHeader("Cache-Control", "no-store")
            res.json({ data: await getReceptionDocument(Number(req.params.id)) })
        } catch (error) { next(error) }
    },
    editField,
    editReception,
    history,
    assignGrn,
    index,
    show,
    store,
    completeReception
}
