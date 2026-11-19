import { ErrorApp } from "../../../shared/errores/ErrorApp"
import { Op } from "sequelize"
import FieldDataReception from "../../raw-material-receptions/models/FieldDataReception.model"
import RmReception from "../../raw-material-receptions/models/RmReception.model"
import ProdDataReception from "../../raw-material-receptions/models/ProdDataReception.model"
import QualityControlDoc from "../../quality-control/models/QualityControlDoc.model"
import { roundQuality } from "../../quality-control/utils/qualityCalculation"
import Finca from "../../farms/models/Finca.model"
import Producer from "../../producers/models/Producer.model"
import Product from "../../products/models/Product.model"
import VarietyProduct from "../../products/models/VarietyProduct.model"
import Plate from "../../transport/models/Plate.model"
import Cdp from "../../cdps/models/Cdp.model"
import { fieldReportDateRange } from "../schemas/report.schema"
import type { FieldReportQuery } from "../schemas/report.schema"
import { buildFieldReportWorkbook } from "./fieldReport.workbook"

const MAX_REPORT_ROWS = 10000

export async function createFieldReport(query: FieldReportQuery) {
    const { start, endExclusive } = fieldReportDateRange(query)
    const details = await FieldDataReception.findAll({
        attributes: { exclude: ["inspectorSignature", "driverSignature", "prodSignature"] },
        include: [
            { model: RmReception, required: true,
                where: { status: "cerrado", createdAt: { [Op.gte]: start, [Op.lt]: endExclusive } },
                include: [
                    { model: Finca, required: false },
                    { model: ProdDataReception, required: false, separate: true,
                        attributes: { exclude: ["receptorSignature"] }, order: [["id", "ASC"]] },
                    { model: QualityControlDoc, required: false, separate: true, limit: 1,
                        attributes: ["id", "rmReceptionId"], order: [["id", "DESC"]] },
                ] },
            { model: Producer, required: false },
            { model: Product, required: false, include: [{ model: VarietyProduct, required: false }] },
            { model: Plate, required: false }, { model: Cdp, required: false },
        ],
        order: [["rmReceptionId", "ASC"], ["id", "ASC"]],
        limit: MAX_REPORT_ROWS + 1,
    })
    if (details.length > MAX_REPORT_ROWS) throw new ErrorApp(413, "El reporte supera las 10,000 boletas. Selecciona un rango de fechas menor para descargarlo completo.")
    const formatter = new Intl.DateTimeFormat("es-GT", { timeZone: "America/Guatemala", day: "2-digit", month: "2-digit", year: "numeric" })
    return buildFieldReportWorkbook(details.map(detail => {
        const receipt = detail.rmReception
        const plant = receipt.prodDataReceptions?.[0]
        const evaluation = receipt.qualityControlDocs?.[0]
        const fieldQuality = detail.qualityPercentage
        const plantQuality = plant?.qualityPercentage ?? null
        return {
            grn: receipt.grn ?? "",
            product: detail.product?.name ?? "", variety: detail.product?.varietyProduct?.name ?? "",
            producerCode: detail.producer?.code ?? "", producer: detail.producer?.name ?? "",
            finca: receipt.finca?.name ?? "", cdp: detail.cdp?.name ?? "",
            number: `LX2-${detail.rmReceptionId}`,
            plantDate: plant ? formatter.format(new Date(plant.createdAt)) : "",
            baskets: detail.totalBaskets, grossWeight: detail.weight, netWeight: detail.netWeight,
            quality: fieldQuality, pounds: detail.validPounds,
            plantGrossWeight: plant?.grossWeight ?? null, plantNetWeight: plant?.netWeight ?? null,
            plantQuality, plantPounds: plant?.validPounds ?? null,
            qualityVariation: plantQuality != null && fieldQuality != null ? roundQuality(plantQuality - fieldQuality) : null,
            date: formatter.format(new Date(receipt.createdAt)),
            qualityNumber: evaluation ? `LXC-${evaluation.id}` : "",
            inspector: detail.inspectorName,
            plate: detail.plate?.name ?? "",
            pilot: detail.pilotName,
            status: receipt.consignment ? "CONSIGNADO" : "APROBADO",
            qualityReasons: receipt.qualityReasons ?? [],
        }
    }))
}
