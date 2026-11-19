import { signatureImageSchema } from "../../../shared/validacion/signatureImage"
import { identifierParamSchema } from "../../../shared/schemas/identifier.schema"
import z from "zod"
import { paginationQuerySchema } from "../../../shared/schemas/pagination.schema"
import { ESTADOS_BOLETA } from "../models/RmReception.model"
import { editReasonSchema } from "../../../shared/validacion/editReason"
import { isAllowedDocumentDate } from "../../../shared/utils/documentDate"
import { grnNumberSchema } from "./grn"

export const assignGrnSchema = z.object({
    grnNumber: grnNumberSchema,
}).strict()

const fieldInputSchema = z.object({
    docDate: z.iso.date("Fecha de creación de documento inválida").optional(),
    fincaId: z.coerce.number().int().positive(),
    producerId: z.coerce.number().int().positive(),
    productId: z.coerce.number().int().positive(),
    carrierId: z.coerce.number().int().positive(),
    plateId: z.coerce.number().int().positive(),
    basketId: z.coerce.number().int().positive(),
    cdpId: z.coerce.number().int().positive().optional(),
    inspectorName: z.string().trim().min(1).max(255),
    pilotName: z.string().trim().min(1, "Ingresa el nombre del piloto").max(255),
    weight: z.coerce.number().positive("El peso bruto debe ser mayor que cero"),
    totalBaskets: z.coerce.number().int("La cantidad de canastas debe ser un número entero").positive("La cantidad de canastas debe ser mayor que cero").max(2147483647, "La cantidad de canastas supera el rango permitido"),
    qualityPercentage: z.coerce
        .number()
        .min(1, "Debe ser mayor a 0")
        .max(99.99, "No puede ser 100 ni mayor")
        .optional(),
    inspectorSignature: signatureImageSchema,
    driverSignature: signatureImageSchema,
    prodSignature: signatureImageSchema
}).strict()

export const createRmReceptionSchema = fieldInputSchema.superRefine((input, ctx) => {
    if (input.docDate && !isAllowedDocumentDate(input.docDate)) ctx.addIssue({ code: "custom", path: ["docDate"], message: "La fecha de la boleta solo puede ser hoy o ayer (Guatemala)." })
})

export const rmReceptionQuerySchema = paginationQuerySchema.extend({
    grn: z.string().trim().toUpperCase().max(255, "El GRN no puede superar 255 caracteres").optional(),
    receiptNumber: z.string().trim().regex(/^\d+$/, "Ingresa un número de boleta válido")
        .transform(Number).pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)).optional(),
    date: z.iso.date("Fecha inválida, usa AAAA-MM-DD").optional(),
    startDate: z.iso.date("Fecha inicial inválida").optional(),
    endDate: z.iso.date("Fecha final inválida").optional(),
    producer: z.string().trim().optional(),
    inspector: z.string().trim().optional(),
    plate: z.string().trim().optional(),
    carrier: z.string().trim().optional(),
    status: z.enum(ESTADOS_BOLETA).optional()
}).superRefine((query, ctx) => {
    if (query.startDate && query.endDate && query.startDate > query.endDate) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: "La fecha inicial debe ser anterior o igual a la fecha final" })
    }
    if (query.date && (query.startDate || query.endDate)) {
        ctx.addIssue({ code: "custom", path: ["date"], message: "Usa una fecha exacta o un rango de fechas" })
    }
})

export const receptionDocumentsQuerySchema = rmReceptionQuerySchema.safeExtend({
    startDate: z.iso.date("Fecha inicial inválida"),
    endDate: z.iso.date("Fecha final inválida"),
})

export const rmReceptionIdParamSchema = z.object({
    id: identifierParamSchema
})

export const completeReceptionSchema = z.object({
    productId: z.coerce.number().int().positive(),
    basketId: z.coerce.number().int().positive(),
    totalBaskets: z.coerce.number().int("La cantidad de canastas debe ser un número entero").positive("La cantidad de canastas debe ser mayor que cero").max(2147483647, "La cantidad de canastas supera el rango permitido"),
    grossWeight: z.coerce.number().positive("El peso bruto debe ser mayor que cero"),
    receptorSignature: signatureImageSchema,
})

export type CreateRmReceptionInput = z.infer<typeof createRmReceptionSchema>
export type RmReceptionQuery = z.infer<typeof rmReceptionQuerySchema>
export type CompleteReceptionInput = z.infer<typeof completeReceptionSchema>

export const editMetadataSchema = z.object({
    reason: editReasonSchema,
    expectedVersion: z.number().int().nonnegative(),
})

export const editFieldSchema = fieldInputSchema.omit({ inspectorSignature: true, driverSignature: true, prodSignature: true }).extend({
    cdpId: z.coerce.number().int().positive().nullable(),
    qualityPercentage: z.number().min(1).max(99.99).nullable(),
    ...editMetadataSchema.shape,
}).strict()

export const editReceptionSchema = completeReceptionSchema.omit({ receptorSignature: true }).extend({
    ...editMetadataSchema.shape,
}).strict()

export type EditFieldInput = z.infer<typeof editFieldSchema>
export type EditReceptionInput = z.infer<typeof editReceptionSchema>
