import { Op } from "sequelize"
import RmReception from "../../raw-material-receptions/models/RmReception.model"
import FieldDataReception from "../../raw-material-receptions/models/FieldDataReception.model"
import QualityControlDoc from "../../quality-control/models/QualityControlDoc.model"
import QualityControlDefect from "../../quality-control/models/QualityControlDefect.model"
import Product from "../../products/models/Product.model"
import VarietyProduct from "../../products/models/VarietyProduct.model"
import Producer from "../../producers/models/Producer.model"
import { fieldReportDateRange } from "../schemas/report.schema"
import type { DashboardQuery } from "../schemas/report.schema"
import { createDashboardAggregation } from "./dashboard.aggregate"

export async function getDashboard(query: DashboardQuery) {
    const { start, endExclusive } = fieldReportDateRange(query)
    const aggregation = createDashboardAggregation(query)
    const batchSize = 500
    let lastId = 0
    while (true) {
        const receipts = await RmReception.findAll({
            attributes: ["id", "status", "createdAt", "consignment"], where: { id: { [Op.gt]: lastId }, createdAt: { [Op.gte]: start, [Op.lt]: endExclusive } },
            include: [
                { model: FieldDataReception, separate: true, attributes: ["id", "rmReceptionId", "productId", "producerId"], order: [["id", "ASC"]], include: [
                    { model: Product, required: false, attributes: ["id", "name"], include: [{ model: VarietyProduct, required: false, attributes: ["id", "name"] }] },
                    { model: Producer, required: false, attributes: ["id", "name"] },
                ] },
                { model: QualityControlDoc, separate: true, limit: 1, order: [["id", "DESC"]], attributes: ["id", "rmReceptionId", "percentage", "acceptedPercentage", "netWeight", "validPounds"], include: [
                    { model: QualityControlDefect, separate: true, attributes: ["id", "qualityControlId", "defectName", "input", "result"] },
                ] },
            ], order: [["id", "ASC"]], limit: batchSize,
        })
        for (const receipt of receipts) aggregation.add({ id: receipt.id, status: receipt.status, createdAt: receipt.createdAt!, consignment: receipt.consignment, fieldDataReceptions: receipt.fieldDataReceptions, qualityControlDocs: receipt.qualityControlDocs })
        if (receipts.length < batchSize) break
        lastId = receipts[receipts.length - 1].id
    }
    return { ...aggregation.result(), period: query, generatedAt: new Date().toISOString() }
}
