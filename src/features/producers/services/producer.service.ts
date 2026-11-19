import Producer from "../models/Producer.model"
import { Op, WhereOptions } from "sequelize"
import { ErrorApp, ErrorNoEncontrado } from "../../../shared/errores/ErrorApp"
import { paginateOrAll, PaginationParams } from "../../../shared/utils/pagination.util"
import type { CreateProducerInput, UpdateProducerInput } from "../schemas/producer.schema"
import { protectCatalogHistory } from "../../raw-material-receptions/services/catalogHistory.service"

async function listProducers(pagination?: PaginationParams, search?: string, all = true) {
    const where: WhereOptions = {
        activo: true,
        ...(search ? { [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, { code: { [Op.iLike]: `%${search}%` } }] } : {}),
    }
    return paginateOrAll(Producer, { where, order: [["name", "ASC"], ["id", "ASC"]] }, pagination, all)
}

async function createProducer(input: CreateProducerInput): Promise<Producer> {
    const existing = await Producer.findOne({ where: { code: input.code } })
    if (existing) throw new ErrorApp(409, "Ya existe un productor con este código.")
    return Producer.create(input)
}

async function getProducerById(id: number): Promise<Producer> {
    const producer = await Producer.findOne({ where: { id, activo: true } })
    if (!producer) throw new ErrorNoEncontrado("Productor", id)
    return producer
}

async function updateProducer(id: number, input: UpdateProducerInput): Promise<Producer> {
    return Producer.sequelize!.transaction(async transaction => {
        const producer = await Producer.findOne({ where: { id, activo: true }, transaction, lock: transaction.LOCK.UPDATE })
        if (!producer) throw new ErrorNoEncontrado("Productor", id)
        await protectCatalogHistory("producer", id, producer, input, transaction)
        if (input.code !== undefined && input.code !== producer.code) {
            const duplicate = await Producer.findOne({ where: { code: input.code, id: { [Op.ne]: id } }, transaction })
            if (duplicate) throw new ErrorApp(409, "Ya existe un productor con este código.")
        }
        return producer.update(input, { transaction })
    })
}

async function deleteProducer(id: number): Promise<void> {
    const producer = await getProducerById(id)
    await producer.update({ activo: false })
}

export const producerService = {
    listProducers,
    createProducer,
    getProducerById,
    updateProducer,
    deleteProducer,
}
