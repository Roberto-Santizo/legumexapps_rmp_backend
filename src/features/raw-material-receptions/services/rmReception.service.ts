import { withSignatureUploads } from "../../../shared/servicios/signatureUploads"
import { Op, WhereOptions, Includeable } from "sequelize"
import type { IncludeOptions, Transaction } from "sequelize"
import { assertTruckGrossWeight } from "./truckWeight"
import sequelize from "../../../basedatos/conexion"
import { ErrorApp, ErrorNoEncontrado, ErrorNoAutorizado } from "../../../shared/errores/ErrorApp"
import { paginate, PaginatedResult, PaginationParams } from "../../../shared/utils/pagination.util"
import { CreateRmReceptionInput, CompleteReceptionInput, RmReceptionQuery } from "../schemas/rmReception.schema"
import RmReception from "../models/RmReception.model"
import FieldDataReception from "../models/FieldDataReception.model"
import ProdDataReception from "../models/ProdDataReception.model"
import Finca from "../../farms/models/Finca.model"
import Producer from "../../producers/models/Producer.model"
import Product from "../../products/models/Product.model"
import VarietyProduct from "../../products/models/VarietyProduct.model"
import Carrier from "../../transport/models/Carrier.model"
import Plate from "../../transport/models/Plate.model"
import Basket from "../../baskets/models/Basket.model"
import Cdp from "../../cdps/models/Cdp.model"
import User from "../../users/models/User.model"
import Plant from "../../plants/models/Plant.model"
import { requireActivePlant } from "../../plants/services/plant.service"
import { buildGrn } from "../schemas/grn"
import QualityControlDoc from "../../quality-control/models/QualityControlDoc.model"
import QualityControlDefect from "../../quality-control/models/QualityControlDefect.model"
import { uploadImage, deleteImage } from "../../../shared/servicios/s3.service"
import type { EditFieldInput, EditReceptionInput } from "../schemas/rmReception.schema"
import { assertEditAllowed } from "./editPolicy"
import { snapshotReceipt, recordEdit } from "./editAudit.service"
import ReceptionEdit from "../models/ReceptionEdit.model"
import { guatemalaDate, isAllowedDocumentDate } from "../../../shared/utils/documentDate"
import { roundQuality } from "../../quality-control/utils/qualityCalculation"

const includeDetalle: Includeable[] = [
    { model: Plant },
    { model: QualityControlDoc, separate: true, order: [["id", "DESC"]], include: [{ model: QualityControlDefect, separate: true, order: [["id", "ASC"]] }] },
    { model: Finca },
    {
        model: FieldDataReception,
        include: [{ model: Product, include: [{ model: VarietyProduct, required: false }] }, Plate, Carrier, Producer, Basket, Cdp]
    },
    {
        model: ProdDataReception,
        include: [Basket]
    }
]

export type RmReceptionFilters = Pick<RmReceptionQuery, "receiptNumber" | "grn" | "date" | "startDate" | "endDate" | "producer" | "inspector" | "plate" | "carrier" | "status">

function receptionListOptions(
    filters?: RmReceptionFilters,
    ownerId?: number,
    representedCarrierId?: number,
) {
    const where: WhereOptions = {}
    if (ownerId !== undefined) where.userId = ownerId
    if (filters?.receiptNumber !== undefined) where.id = filters.receiptNumber
    if (filters?.grn) where.grn = { [Op.iLike]: `%${filters.grn.replace(/[\\%_]/g, "\\$&")}%` }

    if (filters?.status) {
        where.status = filters.status
    }

    if (filters?.date) {
        const inicioDia = new Date(`${filters.date}T00:00:00.000-06:00`)
        const siguienteDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000)
        where.docDate = { [Op.gte]: inicioDia, [Op.lt]: siguienteDia }
    } else if (filters?.startDate || filters?.endDate) {
        where.docDate = {
            ...(filters.startDate ? { [Op.gte]: new Date(`${filters.startDate}T00:00:00.000-06:00`) } : {}),
            ...(filters.endDate ? { [Op.lt]: new Date(new Date(`${filters.endDate}T00:00:00.000-06:00`).getTime() + 86400000) } : {}),
        }
    }

    const include = [
        { model: Plant },
        { model: Finca },
        {
            model: FieldDataReception,
            required: true,
            where: representedCarrierId !== undefined || filters?.inspector ? {
                ...(representedCarrierId !== undefined ? { carrierId: representedCarrierId } : {}),
                ...(filters?.inspector ? { inspectorName: { [Op.iLike]: `%${filters.inspector}%` } } : {}),
            } : undefined,
            include: [
                { model: Product, include: [{ model: VarietyProduct, required: false }] },
                {
                    model: Plate,
                    required: !!filters?.plate,
                    where: filters?.plate ? { name: { [Op.iLike]: `%${filters.plate}%` } } : undefined
                },
                {
                    model: Carrier,
                    required: !!filters?.carrier,
                    where: filters?.carrier ? { name: { [Op.iLike]: `%${filters.carrier}%` } } : undefined
                },
                {
                    model: Producer,
                    required: !!filters?.producer,
                    where: filters?.producer ? { name: { [Op.iLike]: `%${filters.producer}%` } } : undefined
                },
                Basket,
                Cdp
            ]
        },
        {
            model: ProdDataReception,
            include: [Basket]
        }
    ]

    return { where, include }
}

async function listRmReceptions(
    pagination?: PaginationParams,
    filters?: RmReceptionFilters,
    ownerId?: number,
    representedCarrierId?: number,
): Promise<PaginatedResult<RmReception>> {
    return paginate(RmReception, { ...receptionListOptions(filters, ownerId, representedCarrierId), distinct: true, order: [["id", "DESC"]], subQuery: false }, pagination)
}

async function listDocumentIds(filters: RmReceptionFilters, ownerId?: number, representedCarrierId?: number) {
    const options = receptionListOptions(filters, ownerId, representedCarrierId)
    // Select unique receipt IDs without loading signatures or multiplying legacy details.
    const selectIdsOnly = (item: Includeable): IncludeOptions => {
        const option: IncludeOptions = typeof item === "function" ? { model: item } : item as IncludeOptions
        return { ...option, attributes: [], include: option.include?.map(selectIdsOnly) }
    }
    const include = options.include.map(selectIdsOnly)
    const receipts = await RmReception.findAll({
        where: options.where, include, attributes: ["id"], group: ["RmReception.id"],
        order: [["id", "DESC"]], subQuery: false, limit: 201,
    })
    if (receipts.length > 200) throw new ErrorApp(413, "La descarga supera las 200 boletas. Reduce el rango de fechas o agrega filtros para descargarlas por grupos.")
    return receipts.map(receipt => Number(receipt.id))
}

async function getRmReceptionById(id: number): Promise<RmReception> {
    const rmReception = await RmReception.findOne({ where: { id }, include: includeDetalle })
    if (!rmReception) throw new ErrorNoEncontrado("Boleta", id)
    return rmReception
}

async function createRmReception(input: CreateRmReceptionInput, userId: number): Promise<RmReception> {
    if (input.docDate && !isAllowedDocumentDate(input.docDate)) throw new ErrorApp(400, "La fecha de la boleta solo puede ser hoy o ayer (Guatemala).")
    const carrier = await Carrier.findOne({ where: { id: input.carrierId, activo: true } })
    if (!carrier) throw new ErrorNoEncontrado("Transportista activo", input.carrierId)
    const product = await Product.findOne({ where: { id: input.productId, activo: true } })
    if (!product) throw new ErrorNoEncontrado("Producto activo", input.productId)
    // Las firmas llegan en base64 desde el formulario; se suben a S3 antes de
    // abrir la transacción (es una llamada externa lenta, no debe mantener
    // la transacción de base de datos abierta) y solo se guarda la URL
    // pública resultante (nunca el base64).
    const images = [
        { image: input.inspectorSignature, folder: "signatures/field" },
        { image: input.prodSignature, folder: "signatures/field" },
        { image: input.driverSignature, folder: "signatures/field" },
    ]
    const rmReceptionId = await withSignatureUploads(images, { upload: uploadImage, remove: deleteImage }, async ([inspectorSignature, prodSignature, driverSignature]) => {
        return sequelize.transaction(async transaction => {
            const activeCarrier = await Carrier.findOne({ where: { id: input.carrierId, activo: true }, transaction, lock: transaction.LOCK.UPDATE })
            if (!activeCarrier) throw new ErrorNoEncontrado("Transportista activo", input.carrierId)
            const plate = await Plate.findOne({ where: { id: input.plateId, carrierId: input.carrierId, activo: true }, transaction, lock: transaction.LOCK.UPDATE })
            if (!plate) throw new ErrorApp(400, "La placa no pertenece al transportista seleccionado.")
            assertTruckGrossWeight(plate, input.weight)
            const activeProduct = await Product.findOne({ where: { id: input.productId, activo: true }, transaction, lock: transaction.LOCK.UPDATE })
            if (!activeProduct) throw new ErrorNoEncontrado("Producto activo", input.productId)
            if (input.cdpId) await Cdp.findOne({ where: { id: input.cdpId }, transaction, lock: transaction.LOCK.UPDATE })
            const basket = await Basket.findOne({ where: { id: input.basketId, activo: true }, transaction, lock: transaction.LOCK.UPDATE })
            if (!basket) throw new ErrorNoEncontrado("Tipo de canasta", input.basketId)

            const rmReception = await RmReception.create(
                {
                    fincaId: input.fincaId,
                    // Calendar date in Guatemala; noon avoids a previous-day shift
                    // when the timestamp is formatted in UTC or local time.
                    docDate: input.docDate ? new Date(`${input.docDate}T12:00:00-06:00`) : new Date(),
                    consignment: false,
                    status: "pendiente_recepcion",
                    userId
                },
                { transaction }
            )

            const weightBaskets = basket.weight * input.totalBaskets
            const netWeight = input.weight - weightBaskets
            if (!Number.isFinite(netWeight) || netWeight < 0) throw new ErrorApp(400, "El peso bruto no puede ser menor que la tara.")
            const validPounds = input.qualityPercentage !== undefined ? netWeight * (input.qualityPercentage / 100) : null

            await FieldDataReception.create(
                {
                    rmReceptionId: rmReception.id,
                    producerId: input.producerId,
                    productId: input.productId,
                    carrierId: input.carrierId,
                    plateId: input.plateId,
                    basketId: input.basketId,
                    cdpId: input.cdpId ?? null,
                    inspectorName: input.inspectorName,
                    pilotName: input.pilotName,
                    weight: input.weight,
                    totalBaskets: input.totalBaskets,
                    weightBaskets,
                    netWeight,
                    qualityPercentage: input.qualityPercentage ?? null,
                    validPounds,
                    inspectorSignature,
                    driverSignature,
                    prodSignature
                },
                { transaction }
            )

            return rmReception.id
        })
    })

    return getRmReceptionById(rmReceptionId)
}

async function validateReceptionTruck(field: FieldDataReception, grossWeight: number, transaction: Transaction): Promise<void> {
    const plate = field.plateId ? await Plate.findOne({ where: { id: field.plateId }, transaction, lock: transaction.LOCK.UPDATE }) : null
    if (!plate) throw new ErrorApp(409, "La recepción no tiene una placa válida para comprobar el peso bruto.")
    assertTruckGrossWeight(plate, grossWeight)
}

async function completeReception(id: number, input: CompleteReceptionInput, userId: number): Promise<RmReception> {
    await withSignatureUploads([{ image: input.receptorSignature, folder: "signatures/plant" }],
        { upload: uploadImage, remove: deleteImage }, async ([receptorSignature]) => sequelize.transaction(async transaction => {
        const rmReception = await RmReception.findOne({ where: { id }, transaction, lock: transaction.LOCK.UPDATE })
        if (!rmReception) throw new ErrorNoEncontrado("Boleta", id)

        if (rmReception.status !== "pendiente_recepcion") {
            throw new ErrorApp(400, "Esta boleta no está pendiente de recepción.")
        }

        const fieldDataReception = await FieldDataReception.findOne({ where: { rmReceptionId: id }, transaction })
        if (!fieldDataReception) throw new ErrorNoEncontrado("Datos de campo de la boleta", id)

        if (fieldDataReception.productId !== input.productId) {
            throw new ErrorApp(
                400,
                "El producto no coincide con el registrado en campo. Verifica bien el producto y corrígelo antes de continuar."
            )
        }

        await validateReceptionTruck(fieldDataReception, input.grossWeight, transaction)

        const basket = await Basket.findOne({ where: { id: input.basketId, activo: true }, transaction, lock: transaction.LOCK.UPDATE })
        if (!basket) throw new ErrorNoEncontrado("Tipo de canasta", input.basketId)

        const receptor = await User.findOne({ where: { id: userId, activo: true }, attributes: ["id", "name", "plantId"], transaction, lock: transaction.LOCK.SHARE })
        if (!receptor) throw new ErrorNoAutorizado("No se pudo identificar al usuario que realiza la recepción")
        const plant = await requireActivePlant(receptor.plantId, transaction)

        const weightBaskets = basket.weight * input.totalBaskets
        const netWeight = input.grossWeight - weightBaskets
        if (!Number.isFinite(netWeight) || netWeight < 0) throw new ErrorApp(400, "El peso bruto no puede ser menor que la tara.")

        await ProdDataReception.create(
            {
                rmReceptionId: id,
                basketId: input.basketId,
                totalBaskets: input.totalBaskets,
                weightBaskets,
                grossWeight: input.grossWeight,
                netWeight,
                // Quality is evaluated in a later stage, not by reception.
                qualityPercentage: null,
                validPounds: null,
                receptorUserId: receptor.id,
                receptorName: receptor.name,
                receptorSignature,
            },
            { transaction }
        )

        await rmReception.update({ plantId: plant.id, status: "pendiente_evaluacion_calidad", editVersion: rmReception.editVersion + 1 }, { transaction })
    }))

    return getRmReceptionById(id)
}

async function assignGrn(id: number, grnNumber: string): Promise<RmReception> {
    await sequelize.transaction(async transaction => {
        const boleta = await RmReception.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
        if (!boleta) throw new ErrorNoEncontrado("Boleta", id)
        if (boleta.status !== "pendiente_asignacion_grn" || boleta.grn) throw new ErrorApp(409, "Solo puedes asignar el GRN a una boleta pendiente de asignación. Las boletas cerradas no se pueden modificar")
        const quality = await QualityControlDoc.findOne({ where: { rmReceptionId: id }, attributes: ["id"], transaction })
        if (!quality) throw new ErrorApp(409, "Primero debe completarse la evaluación de calidad")
        if (!boleta.plantId) throw new ErrorApp(409, "La recepción no tiene planta registrada. La planta debe guardarse al completar la recepción.")
        const plant = await Plant.findByPk(boleta.plantId, { transaction })
        if (!plant || !["LP", "LT"].includes(plant.code)) throw new ErrorApp(409, "La planta de la recepción no tiene un prefijo GRN válido.")
        const grn = buildGrn(plant.code, grnNumber)
        await boleta.update({ grn, status: "cerrado", editVersion: boleta.editVersion + 1 }, { transaction })
    })
    return getRmReceptionById(id)
}

async function editField(id: number, input: EditFieldInput, userId: number, permissions: string[], roleName?: string) {
    const preflight = await getRmReceptionById(id)
    assertEditAllowed(preflight, "field", permissions, input.expectedVersion, roleName)
    await sequelize.transaction(async transaction => {
        const receipt = await RmReception.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
        if (!receipt) throw new ErrorNoEncontrado("Boleta", id)
        const override = assertEditAllowed(receipt, "field", permissions, input.expectedVersion, roleName)
        if (input.docDate && input.docDate !== guatemalaDate(receipt.docDate) && !isAllowedDocumentDate(input.docDate)) {
            throw new ErrorApp(400, "La fecha de la boleta solo puede cambiarse a hoy o ayer (Guatemala).")
        }
        const field = await FieldDataReception.findOne({ where: { rmReceptionId: id }, transaction })
        if (!field) throw new ErrorNoEncontrado("Datos de campo", id)
        if (!override && await ProdDataReception.findOne({ where: { rmReceptionId: id }, transaction })) {
            throw new ErrorApp(409, "La recepción ya fue registrada. Tu equipo ya no puede corregir los datos de campo.")
        }
        const quality = await QualityControlDoc.findOne({ where: { rmReceptionId: id }, order: [["id", "DESC"]], transaction })
        // Una evaluación está vinculada a los defectos de su producto; cambiarlo
        // después de evaluar reinterpretaría resultados firmados de otro producto.
        if (quality && input.productId !== field.productId) throw new ErrorApp(409, "No se puede cambiar el producto de una boleta ya evaluada. Sus defectos pertenecen al producto original.")
        const before = await snapshotReceipt(id, transaction)
        const carrier = await Carrier.findOne({ where: { id: input.carrierId, ...(input.carrierId === field.carrierId ? {} : { activo: true }) }, transaction, lock: transaction.LOCK.UPDATE })
        if (!carrier) throw new ErrorNoEncontrado("Transportista activo", input.carrierId)
        const plate = await Plate.findOne({ where: { id: input.plateId,
            ...(input.plateId === field.plateId && input.carrierId === field.carrierId ? {} : { carrierId: input.carrierId, activo: true }) }, transaction, lock: transaction.LOCK.UPDATE })
        if (!plate) throw new ErrorApp(400, "La placa no pertenece al transportista seleccionado.")
        if (input.plateId !== field.plateId || input.weight !== field.weight) assertTruckGrossWeight(plate, input.weight)
        if (input.plateId !== field.plateId) {
            const reception = await ProdDataReception.findOne({ where: { rmReceptionId: id }, transaction })
            if (reception) assertTruckGrossWeight(plate, reception.grossWeight)
        }
        const product = await Product.findOne({ where: { id: input.productId, ...(input.productId === field.productId ? {} : { activo: true }) }, transaction, lock: transaction.LOCK.UPDATE })
        if (!product) throw new ErrorNoEncontrado("Producto activo", input.productId)
        if (!await Finca.findOne({ where: { id: input.fincaId, ...(input.fincaId === receipt.fincaId ? {} : { activo: true }) }, transaction })) throw new ErrorNoEncontrado("Finca", input.fincaId)
        if (!await Producer.findOne({ where: { id: input.producerId, ...(input.producerId === field.producerId ? {} : { activo: true }) }, transaction })) throw new ErrorNoEncontrado("Productor", input.producerId)
        if (input.cdpId && !await Cdp.findOne({ where: { id: input.cdpId, ...(input.cdpId === field.cdpId ? {} : { activo: true }) }, transaction, lock: transaction.LOCK.UPDATE })) throw new ErrorNoEncontrado("CDP", input.cdpId)
        const basket = await Basket.findOne({ where: { id: input.basketId, ...(input.basketId === field.basketId ? {} : { activo: true }) }, transaction, lock: transaction.LOCK.UPDATE })
        if (!basket) throw new ErrorNoEncontrado("Canasta", input.basketId)
        // Conserva la tara histórica si el tipo y la cantidad no cambiaron.
        const weightBaskets = input.basketId === field.basketId && input.totalBaskets === field.totalBaskets ? field.weightBaskets : basket.weight * input.totalBaskets
        const netWeight = input.weight - weightBaskets
        if (!Number.isFinite(netWeight) || netWeight < 0) throw new ErrorApp(400, "El peso bruto no puede ser menor que la tara.")
        const qualityDefinedInPlant = input.qualityPercentage === null && !!quality
        const qualityPercentage = input.qualityPercentage ?? quality?.percentage ?? null
        await field.update({ producerId: input.producerId, productId: input.productId,
            carrierId: input.carrierId, plateId: input.plateId,
            basketId: input.basketId, cdpId: input.cdpId, inspectorName: input.inspectorName, pilotName: input.pilotName,
            weight: input.weight, totalBaskets: input.totalBaskets, weightBaskets, netWeight, qualityPercentage, qualityDefinedInPlant,
            validPounds: qualityPercentage === null ? null : roundQuality(netWeight * qualityPercentage / 100) }, { transaction })
        await receipt.update({ fincaId: input.fincaId,
            ...(input.docDate && input.docDate !== guatemalaDate(receipt.docDate)
                ? { docDate: new Date(`${input.docDate}T12:00:00-06:00`) } : {}) }, { transaction })
        if (quality && quality.producerId !== input.producerId) await quality.update({ producerId: input.producerId }, { transaction })
        await recordEdit(receipt, "field", userId, input.reason, override, before, transaction)
    })
    return getRmReceptionById(id)
}

async function editReception(id: number, input: EditReceptionInput, userId: number, permissions: string[]) {
    const preflight = await getRmReceptionById(id)
    assertEditAllowed(preflight, "reception", permissions, input.expectedVersion)
    await sequelize.transaction(async transaction => {
        const receipt = await RmReception.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
        if (!receipt) throw new ErrorNoEncontrado("Boleta", id)
        const override = assertEditAllowed(receipt, "reception", permissions, input.expectedVersion)
        const plant = await ProdDataReception.findOne({ where: { rmReceptionId: id }, transaction })
        if (!plant) throw new ErrorNoEncontrado("Recepción registrada", id)
        const field = await FieldDataReception.findOne({ where: { rmReceptionId: id }, transaction })
        if (!field || field.productId !== input.productId) throw new ErrorApp(400, "El producto no coincide con el registrado en campo.")
        if (input.grossWeight !== plant.grossWeight) await validateReceptionTruck(field, input.grossWeight, transaction)
        const before = await snapshotReceipt(id, transaction)
        const basket = await Basket.findOne({ where: { id: input.basketId, ...(input.basketId === plant.basketId ? {} : { activo: true }) }, transaction, lock: transaction.LOCK.UPDATE })
        if (!basket) throw new ErrorNoEncontrado("Canasta", input.basketId)
        const weightBaskets = input.basketId === plant.basketId && input.totalBaskets === plant.totalBaskets ? plant.weightBaskets : basket.weight * input.totalBaskets
        const netWeight = input.grossWeight - weightBaskets
        if (!Number.isFinite(netWeight) || netWeight < 0) throw new ErrorApp(400, "El peso bruto no puede ser menor que la tara.")
        const quality = await QualityControlDoc.findOne({ where: { rmReceptionId: id }, order: [["id", "DESC"]], transaction })
        if (!override && quality) throw new ErrorApp(409, "Calidad ya evaluó la boleta. Tu equipo ya no puede corregir la recepción.")
        const pestRule = quality?.pestEvaluation?.rule
        if (pestRule && (input.totalBaskets < pestRule.minBaskets || (pestRule.maxBaskets !== null && input.totalBaskets > pestRule.maxBaskets))) {
            throw new ErrorApp(409, "La cantidad de canastas cambia el rango de muestreo de gusanos y áfidos. No se puede conservar la evaluación con una muestra de otro rango.")
        }
        const validPounds = quality ? roundQuality(netWeight * quality.percentage / 100) : null
        await plant.update({ basketId: input.basketId, totalBaskets: input.totalBaskets, grossWeight: input.grossWeight,
            weightBaskets, netWeight, validPounds }, { transaction })
        if (quality) await quality.update({ netWeight, totalBaskets: input.totalBaskets, validPounds }, { transaction })
        await recordEdit(receipt, "reception", userId, input.reason, override, before, transaction)
    })
    return getRmReceptionById(id)
}

async function editHistory(id: number) {
    await getRmReceptionById(id)
    return ReceptionEdit.findAll({ where: { rmReceptionId: id }, order: [["id", "DESC"]] })
}

export const rmReceptionService = {
    editField,
    editReception,
    editHistory,
    assignGrn,
    listRmReceptions,
    listDocumentIds,
    getRmReceptionById,
    createRmReception,
    completeReception
}
