import Finca from "../models/Finca.model"
import { Op, WhereOptions } from "sequelize"
import { ErrorApp, ErrorNoEncontrado } from "../../../shared/errores/ErrorApp"
import { paginateOrAll, PaginationParams } from "../../../shared/utils/pagination.util"
import type { CreateFincaInput, UpdateFincaInput } from "../schemas/finca.schema"
import { protectCatalogHistory } from "../../raw-material-receptions/services/catalogHistory.service"

async function listFincas(pagination?: PaginationParams, search?: string, all = true) {
    const where: WhereOptions = {
        activo: true,
        ...(search ? { name: { [Op.iLike]: `%${search}%` } } : {}),
    }
    return paginateOrAll(Finca, { where, order: [["name", "ASC"], ["id", "ASC"]] }, pagination, all)
}

async function createFinca(input: CreateFincaInput): Promise<Finca> {
    const existing = await Finca.findOne({ where: { name: input.name } })
    if (existing) throw new ErrorApp(409, "Ya existe una finca con este nombre.")
    return Finca.create(input)
}

async function getFincaById(id: number): Promise<Finca> {
    const finca = await Finca.findOne({ where: { id, activo: true } })
    if (!finca) throw new ErrorNoEncontrado("Finca", id)
    return finca
}

async function updateFinca(id: number, input: UpdateFincaInput): Promise<Finca> {
    return Finca.sequelize!.transaction(async transaction => {
        const finca = await Finca.findOne({ where: { id, activo: true }, transaction, lock: transaction.LOCK.UPDATE })
        if (!finca) throw new ErrorNoEncontrado("Finca", id)
        await protectCatalogHistory("finca", id, finca, input, transaction)
        if (input.name !== undefined && input.name !== finca.name) {
            const duplicate = await Finca.findOne({ where: { name: input.name, id: { [Op.ne]: id } }, transaction })
            if (duplicate) throw new ErrorApp(409, "Ya existe una finca con este nombre.")
        }
        return finca.update(input, { transaction })
    })
}

async function deleteFinca(id: number): Promise<void> {
    const finca = await getFincaById(id)
    await finca.update({ activo: false })
}

export const fincaService = {
    listFincas,
    createFinca,
    getFincaById,
    updateFinca,
    deleteFinca,
}
