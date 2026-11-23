import { protectCatalogHistory } from "../../raw-material-receptions/services/catalogHistory.service"
import { Op, WhereOptions } from "sequelize"
import { ErrorApp, ErrorNoEncontrado } from "../../../shared/errores/ErrorApp"
import { paginateOrAll, PaginatedResult, PaginationParams } from "../../../shared/utils/pagination.util"
import { CreateProductInput, UpdateProductInput } from "../schemas/product.schema"
import Product from "../models/Product.model"
import VarietyProduct from "../models/VarietyProduct.model"
import ProductDefect from "../models/ProductDefect.model"

async function listProducts(
    pagination?: PaginationParams,
    search?: string,
    all?: boolean,
    includeInactive = false
): Promise<PaginatedResult<Product> | { data: Product[] }> {
    const where: WhereOptions = { ...(!includeInactive ? { activo: true } : {}), ...(search ? { name: { [Op.iLike]: `%${search}%` } } : {}) }
    return paginateOrAll(
        Product,
        {
            where,
            include: [{ model: VarietyProduct, ...(!includeInactive ? { where: { activo: true }, required: true } : { required: false }) }],
            order: [["activo", "DESC"], ["name", "ASC"]],
            // El include filtrado (VarietyProduct activo) rompe la subquery de
            // paginación de Sequelize si no se desactiva -> ver rmReception.service.ts.
            subQuery: false
        },
        pagination,
        all
    )
}

async function getProductById(id: number): Promise<Product> {
    const product = await Product.findOne({
        where: { id },
        include: [{ model: VarietyProduct, required: false }, { model: ProductDefect, separate: true, order: [["id", "ASC"]] }]
    })
    if (!product) throw new ErrorNoEncontrado("Producto", id)
    return product
}

async function createProduct(input: CreateProductInput): Promise<Product> {
    const { defects = [], ...attributes } = input
    if (defects.some(defect => defect.id !== undefined)) throw new ErrorApp(400, "Los defectos nuevos no deben incluir un identificador")
    const id = await Product.sequelize!.transaction(async transaction => {
        const product = await Product.create(attributes, { transaction })
        await ProductDefect.bulkCreate(defects.map(defect => ({ ...defect, productId: product.id })), { transaction })
        return product.id
    })
    return getProductById(id)
}

async function updateProduct(id: number, input: UpdateProductInput): Promise<Product> {
    const { defects, ...attributes } = input
    await Product.sequelize!.transaction(async transaction => {
        const product = await Product.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
        if (!product) throw new ErrorNoEncontrado("Producto", id)
        const requiresQualityEvaluation = attributes.requiresQualityEvaluation ?? product.requiresQualityEvaluation
        // Keep the previous configuration available for older receipts that still require quality.
        if (!requiresQualityEvaluation && attributes.acceptedPercentage === null && product.acceptedPercentage !== null) {
            attributes.acceptedPercentage = product.acceptedPercentage
        }
        const acceptedPercentage = attributes.acceptedPercentage === undefined ? product.acceptedPercentage : attributes.acceptedPercentage
        if (requiresQualityEvaluation && acceptedPercentage == null) {
            throw new ErrorApp(400, "Ingresa el porcentaje aceptado para los productos que requieren evaluación de calidad")
        }
        if (defects !== undefined) {
            const existing = await ProductDefect.findAll({ where: { productId: id }, transaction })
            const byId = new Map(existing.map(defect => [defect.id, defect]))
            if (defects.some(defect => defect.id !== undefined && !byId.has(defect.id))) {
                throw new ErrorApp(400, "Uno de los defectos no pertenece a este producto")
            }
            if (existing.some(defect => !defects.some(item => item.id === defect.id))) {
                throw new ErrorApp(400, "Conserva los defectos registrados; puedes desactivarlos si ya no se utilizan. Recarga el producto e intenta nuevamente")
            }
            for (const defect of defects) {
                const { id: defectId, ...values } = defect
                if (defectId !== undefined) await byId.get(defectId)!.update(values, { transaction })
                else await ProductDefect.create({ ...values, productId: id }, { transaction })
            }
        }
        await protectCatalogHistory("product", id, product, attributes, transaction)
        await product.update(attributes, { transaction })
    })
    return getProductById(id)
}

async function listDefectNames(): Promise<string[]> {
    const rows = await ProductDefect.findAll({ attributes: ["defectName"], group: ["defectName"], order: [["defectName", "ASC"]], raw: true })
    return rows.map(row => row.defectName)
}

async function deleteProduct(id: number): Promise<void> {
    const product = await getProductById(id)
    await product.update({ activo: false })
}

async function setProductStatus(id: number, activo: boolean): Promise<Product> {
    const product = await Product.findOne({ where: { id }, include: [{ model: VarietyProduct, required: false }] })
    if (!product) throw new ErrorNoEncontrado("Producto", id)
    await product.update({ activo })
    return getProductById(id)
}

export const productService = {
    listDefectNames,
    setProductStatus,
    listProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
}
