import { protectCatalogHistory } from "../../raw-material-receptions/services/catalogHistory.service"
import { Op, WhereOptions } from "sequelize"
import { ErrorNoEncontrado } from "../../../shared/errores/ErrorApp"
import { paginateOrAll, PaginatedResult, PaginationParams } from "../../../shared/utils/pagination.util"
import { CreateCarrierInput, UpdateCarrierInput, CreatePlateInput, UpdatePlateInput } from "../schemas/transport.schema"
import Carrier from "../models/Carrier.model"
import Plate from "../models/Plate.model"

async function listCarriers(
    pagination?: PaginationParams,
    search?: string,
    all?: boolean,
    includeInactive = false
): Promise<PaginatedResult<Carrier> | { data: Carrier[] }> {
    const where: WhereOptions = {
        ...(!includeInactive ? { activo: true } : {}),
        ...(search ? { [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, { code: { [Op.iLike]: `%${search}%` } }] } : {})
    }
    return paginateOrAll(Carrier, { where, order: [["activo", "DESC"], ["name", "ASC"]] }, pagination, all)
}

async function getCarrierById(id: number): Promise<Carrier> {
    const carrier = await Carrier.findOne({ where: { id } })
    if (!carrier) throw new ErrorNoEncontrado("Transportista", id)
    return carrier
}

async function createCarrier(input: CreateCarrierInput): Promise<Carrier> {
    return Carrier.create(input)
}

async function updateCarrier(id: number, input: UpdateCarrierInput): Promise<Carrier> {
    return Carrier.sequelize!.transaction(async transaction => {
        const record = await Carrier.findOne({ where: { id }, transaction, lock: transaction.LOCK.UPDATE })
        if (!record) throw new ErrorNoEncontrado("Transportista", id)
        await protectCatalogHistory("carrier", id, record, input, transaction)
        return record.update(input, { transaction })
    })
}

async function deleteCarrier(id: number): Promise<void> {
    const carrier = await getCarrierById(id)
    await carrier.update({ activo: false })
}

async function listPlates(
    carrierId?: number,
    search?: string,
    pagination?: PaginationParams,
    all?: boolean
): Promise<PaginatedResult<Plate> | { data: Plate[] }> {
    const where: WhereOptions = {
        activo: true,
        ...(carrierId ? { carrierId } : {}),
        ...(search ? { name: { [Op.iLike]: `%${search}%` } } : {})
    }
    return paginateOrAll(Plate, { where, include: [Carrier], order: [["name", "ASC"]] }, pagination, all)
}

async function getPlateById(id: number): Promise<Plate> {
    const plate = await Plate.findOne({ where: { id, activo: true }, include: [Carrier] })
    if (!plate) throw new ErrorNoEncontrado("Placa", id)
    return plate
}

async function createPlate(input: CreatePlateInput): Promise<Plate> {
    const plate = await Plate.create(input)
    return getPlateById(plate.id)
}

async function updatePlate(id: number, input: UpdatePlateInput): Promise<Plate> {
    await Plate.sequelize!.transaction(async transaction => {
        const record = await Plate.findOne({ where: { id, activo: true }, transaction, lock: transaction.LOCK.UPDATE })
        if (!record) throw new ErrorNoEncontrado("Placa", id)
        await protectCatalogHistory("plate", id, record, input, transaction)
        return record.update(input, { transaction })
    })
    return getPlateById(id)
}

async function deletePlate(id: number): Promise<void> {
    const plate = await getPlateById(id)
    await plate.update({ activo: false })
}

async function setCarrierStatus(id: number, activo: boolean): Promise<Carrier> {
    const carrier = await getCarrierById(id)
    await carrier.update({ activo })
    return carrier
}

export const transportService = {
    setCarrierStatus,
    listCarriers,
    getCarrierById,
    createCarrier,
    updateCarrier,
    deleteCarrier,
    listPlates,
    getPlateById,
    createPlate,
    updatePlate,
    deletePlate
}
