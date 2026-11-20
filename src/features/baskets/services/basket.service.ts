import { protectCatalogHistory } from "../../raw-material-receptions/services/catalogHistory.service"
import { Op, WhereOptions } from "sequelize"
import { ErrorNoEncontrado } from "../../../shared/errores/ErrorApp"
import { paginateOrAll, PaginatedResult, PaginationParams } from "../../../shared/utils/pagination.util"
import { CreateBasketInput, UpdateBasketInput } from "../schemas/basket.schema"
import Basket from "../models/Basket.model"

async function listBaskets(
    pagination?: PaginationParams,
    search?: string,
    all?: boolean
): Promise<PaginatedResult<Basket> | { data: Basket[] }> {
    const where: WhereOptions = { activo: true, ...(search ? { name: { [Op.iLike]: `%${search}%` } } : {}) }
    return paginateOrAll(Basket, { where, order: [["name", "ASC"]] }, pagination, all)
}

async function getBasketById(id: number): Promise<Basket> {
    const basket = await Basket.findOne({ where: { id, activo: true } })
    if (!basket) throw new ErrorNoEncontrado("Canasta", id)
    return basket
}

async function createBasket(input: CreateBasketInput): Promise<Basket> {
    return Basket.create(input)
}

async function updateBasket(id: number, input: UpdateBasketInput): Promise<Basket> {
    return Basket.sequelize!.transaction(async transaction => {
        const record = await Basket.findOne({ where: { id, activo: true }, transaction, lock: transaction.LOCK.UPDATE })
        if (!record) throw new ErrorNoEncontrado("Canasta", id)
        await protectCatalogHistory("basket", id, record, input, transaction)
        return record.update(input, { transaction })
    })
}

async function deleteBasket(id: number): Promise<void> {
    const basket = await getBasketById(id)
    await basket.update({ activo: false })
}

export const basketService = {
    listBaskets,
    getBasketById,
    createBasket,
    updateBasket,
    deleteBasket
}
