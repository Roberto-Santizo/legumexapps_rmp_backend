import Product from "../models/Product.model"
import { protectCatalogHistory } from "../../raw-material-receptions/services/catalogHistory.service"
import { Op, WhereOptions } from "sequelize"
import { ErrorNoEncontrado } from "../../../shared/errores/ErrorApp"
import { paginateOrAll, PaginatedResult, PaginationParams } from "../../../shared/utils/pagination.util"
import { CreateVarietyProductInput, UpdateVarietyProductInput } from "../schemas/varietyProduct.schema"
import VarietyProduct from "../models/VarietyProduct.model"

async function listVarietyProducts(
    pagination?: PaginationParams,
    search?: string,
    all?: boolean
): Promise<PaginatedResult<VarietyProduct> | { data: VarietyProduct[] }> {
    const where: WhereOptions = { activo: true, ...(search ? { name: { [Op.iLike]: `%${search}%` } } : {}) }
    return paginateOrAll(VarietyProduct, { where, order: [["name", "ASC"]] }, pagination, all)
}

async function getVarietyProductById(id: number): Promise<VarietyProduct> {
    const varietyProduct = await VarietyProduct.findOne({ where: { id, activo: true } })
    if (!varietyProduct) throw new ErrorNoEncontrado("Variedad", id)
    return varietyProduct
}

async function createVarietyProduct(input: CreateVarietyProductInput): Promise<VarietyProduct> {
    return VarietyProduct.create(input)
}

async function updateVarietyProduct(id: number, input: UpdateVarietyProductInput): Promise<VarietyProduct> {
    return VarietyProduct.sequelize!.transaction(async transaction => {
        const record = await VarietyProduct.findOne({ where: { id, activo: true }, transaction, lock: transaction.LOCK.UPDATE })
        if (!record) throw new ErrorNoEncontrado("Variedad", id)
        await Product.findAll({ where: { varietyProductId: id }, attributes: ["id"], transaction, lock: transaction.LOCK.UPDATE, order: [["id", "ASC"]] })
        await protectCatalogHistory("variety", id, record, input, transaction)
        return record.update(input, { transaction })
    })
}

async function deleteVarietyProduct(id: number): Promise<void> {
    const varietyProduct = await getVarietyProductById(id)
    await varietyProduct.update({ activo: false })
}

export const varietyProductService = {
    listVarietyProducts,
    getVarietyProductById,
    createVarietyProduct,
    updateVarietyProduct,
    deleteVarietyProduct
}
