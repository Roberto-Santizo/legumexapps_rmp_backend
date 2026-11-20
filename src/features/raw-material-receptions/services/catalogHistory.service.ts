import type { Transaction } from "sequelize"
import FieldDataReception from "../models/FieldDataReception.model"
import ProdDataReception from "../models/ProdDataReception.model"
import Product from "../../products/models/Product.model"
import RmReception from "../models/RmReception.model"
import QualityControlDoc from "../../quality-control/models/QualityControlDoc.model"
import { ErrorApp } from "../../../shared/errores/ErrorApp"

const identities = {
    product: ["name", "varietyProductId"], basket: ["name"], carrier: ["name", "code"],
    plate: ["name", "carrierId"], cdp: ["name", "fincaId"], variety: ["name"],
    finca: ["name"], producer: ["name", "code"],
} as const

// Calculated weights and quality tolerances already have saved historical values.
// Names/links are still read from catalogs: prevent rewriting those identities once used.
export async function protectCatalogHistory(kind: keyof typeof identities, id: number, current: object, input: object, transaction?: Transaction) {
    const before = current as Record<string, unknown>, after = input as Record<string, unknown>
    if (!identities[kind].some(key => after[key] !== undefined && after[key] !== before[key])) return
    const fieldKey = { product: "productId", basket: "basketId", carrier: "carrierId", plate: "plateId", cdp: "cdpId", producer: "producerId" }
    const usedInField = kind === "finca"
        ? await RmReception.findOne({ attributes: ["id"], where: { fincaId: id }, transaction })
        : await FieldDataReception.findOne(kind === "variety"
        ? { attributes: ["id"], include: [{ model: Product, required: true, attributes: [], where: { varietyProductId: id } }], transaction }
        : { attributes: ["id"], where: { [fieldKey[kind]]: id }, transaction })
    const usedInPlant = kind === "basket" && !usedInField ? await ProdDataReception.findOne({ attributes: ["id"], where: { basketId: id }, transaction }) : null
    const usedInQuality = kind === "producer" && !usedInField ? await QualityControlDoc.findOne({ attributes: ["id"], where: { producerId: id }, transaction }) : null
    if (usedInField || usedInPlant || usedInQuality) throw new ErrorApp(409, "Este registro ya se utiliza en boletas. Conserva su nombre y asociación para proteger el historial; puedes desactivarlo y crear un registro nuevo.")
}
