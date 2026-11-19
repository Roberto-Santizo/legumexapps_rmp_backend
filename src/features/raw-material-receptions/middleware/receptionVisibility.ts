import type { RequestHandler } from "express"
import RmReception from "../models/RmReception.model"
import { fieldReceiptOwner, representedCarrierScope } from "../services/receptionVisibility"
import FieldDataReception from "../models/FieldDataReception.model"
import { ErrorNoEncontrado, ErrorProhibido } from "../../../shared/errores/ErrorApp"

export const restrictFieldReceipt: RequestHandler = async (req, _res, next) => {
    try {
        const ownerId = fieldReceiptOwner(req.user!)
        const carrierId = representedCarrierScope(req.user!)
        // The carrier scope applies to reads and writes; stage permissions remain independent.
        if (carrierId !== undefined) {
            const field = await FieldDataReception.findOne({ where: { rmReceptionId: Number(req.params.id), carrierId }, attributes: ["id"] })
            if (!field) throw new ErrorNoEncontrado("Boleta", Number(req.params.id))
        }
        if (ownerId !== undefined && carrierId === undefined) {
            const receipt = await RmReception.findOne({
                where: { id: Number(req.params.id), userId: ownerId }, attributes: ["id"],
            })
            if (!receipt) throw new ErrorNoEncontrado("Boleta", Number(req.params.id))
        }
        next()
    } catch (error) { next(error) }
}

export const restrictCarrierPayload: RequestHandler = (req, _res, next) => {
    const carrierId = representedCarrierScope(req.user!)
    if (carrierId !== undefined && req.body.carrierId !== carrierId) {
        next(new ErrorProhibido("Solo puedes registrar o corregir boletas del transportista que representas."))
        return
    }
    next()
}

export const denyFieldReports: RequestHandler = (req, _res, next) => {
    if (fieldReceiptOwner(req.user!) !== undefined) return next(new ErrorProhibido())
    next()
}
