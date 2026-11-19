import { withSignatureUploads } from "../../../shared/servicios/signatureUploads"
import sequelize from "../../../basedatos/conexion"
import { ErrorApp, ErrorNoEncontrado, ErrorNoAutorizado } from "../../../shared/errores/ErrorApp"
import { uploadImage, deleteImage } from "../../../shared/servicios/s3.service"
import { rmReceptionService } from "../../raw-material-receptions/services/rmReception.service"
import RmReception from "../../raw-material-receptions/models/RmReception.model"
import FieldDataReception from "../../raw-material-receptions/models/FieldDataReception.model"
import ProdDataReception from "../../raw-material-receptions/models/ProdDataReception.model"
import Product from "../../products/models/Product.model"
import ProductDefect from "../../products/models/ProductDefect.model"
import User from "../../users/models/User.model"
import QualityControlDoc from "../models/QualityControlDoc.model"
import QualityControlDefect from "../models/QualityControlDefect.model"
import { calculateQuality, roundQuality } from "../utils/qualityCalculation"
import type { QualityEvaluationInput } from "../schemas/qualityEvaluation.schema"
import type { EditQualityInput } from "../schemas/qualityEvaluation.schema"
import { assertEditAllowed } from "../../raw-material-receptions/services/editPolicy"
import { recordEdit, snapshotReceipt } from "../../raw-material-receptions/services/editAudit.service"
import { calculatePestEvaluation, getPestRule, isPestDefect, qualityConsignmentReasons } from "../utils/pestEvaluation"
import type { PestRule } from "../utils/pestEvaluation"

function inspectPests(rule: PestRule | null, input: Pick<QualityEvaluationInput, "pestInspection">, totalBaskets: number) {
    if (!rule) {
        if (input.pestInspection) throw new ErrorApp(409, "El control de gusanos y áfidos no aplica a esta evaluación. Recarga antes de guardar.")
        return null
    }
    if (totalBaskets < rule.minBaskets || (rule.maxBaskets !== null && totalBaskets > rule.maxBaskets)) throw new ErrorApp(409, "Las canastas ya no corresponden a la muestra evaluada. Revisa la recepción.")
    if (!input.pestInspection) throw new ErrorApp(400, "Registra gusanos y cabezas con áfidos, incluyendo cero cuando no encuentres presencia.")
    return calculatePestEvaluation(rule, input.pestInspection)
}

function requireAcceptedPercentage(value: number | null, historical = false): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 100) {
        throw new ErrorApp(409, historical
            ? "La evaluación no tiene un porcentaje mínimo histórico válido. No se puede corregir sin ese dato."
            : "El producto no tiene un porcentaje mínimo de calidad válido.")
    }
    return value
}

function configurationVersion(product: Product, defects: ProductDefect[], totalBaskets: number) {
    // The same configuration must have the same version regardless of read order.
    const orderedDefects = [...defects].sort((left, right) => left.id - right.id)
    return JSON.stringify([product.id, product.acceptedPercentage, product.evaluatePests === true, getPestRule(product.evaluatePests === true, totalBaskets), orderedDefects.map(defect => [defect.id, defect.name, defect.tolerancePercentage])])
}

async function getContext(id: number) {
    const boleta = await rmReceptionService.getRmReceptionById(id)
    if (boleta.status !== "pendiente_evaluacion_calidad") throw new ErrorApp(409, "Esta boleta no está pendiente de evaluación de calidad")
    const field = boleta.fieldDataReceptions[0]
    if (!field || !boleta.prodDataReceptions[0]) throw new ErrorApp(409, "Primero debe completarse la recepción en planta")
    const product = await Product.findByPk(field.productId)
    if (!product) throw new ErrorNoEncontrado("Producto", field.productId)
    const rule = getPestRule(product.evaluatePests === true, boleta.prodDataReceptions[0].totalBaskets)
    const allDefects = await ProductDefect.findAll({ where: { productId: product.id, activo: true }, order: [["id", "ASC"]] })
    const defects = rule ? allDefects.filter(defect => !isPestDefect(defect.name)) : allDefects
    return { boleta, defects, acceptedPercentage: product.acceptedPercentage,
        pestControl: { enabled: product.evaluatePests === true, rule },
        configurationVersion: configurationVersion(product, defects, boleta.prodDataReceptions[0].totalBaskets) }
}

async function evaluate(id: number, input: QualityEvaluationInput, userId: number) {
    // Preflight avoids uploading a signature for a receipt in the wrong stage.
    await getContext(id)
    return withSignatureUploads([{ image: input.inspectorSignature, folder: "signatures/quality" }],
        { upload: uploadImage, remove: deleteImage }, async ([inspectorSignature]) => sequelize.transaction(async transaction => {
        const boleta = await RmReception.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
        if (!boleta) throw new ErrorNoEncontrado("Boleta", id)
        if (input.expectedVersion !== undefined && input.expectedVersion !== boleta.editVersion) throw new ErrorApp(409, "La boleta cambió. Recarga y revisa los datos antes de evaluar.")
        if (boleta.status !== "pendiente_evaluacion_calidad") throw new ErrorApp(409, "Esta boleta ya fue evaluada o no está pendiente de evaluación")
        const field = await FieldDataReception.findOne({ where: { rmReceptionId: id }, transaction, lock: transaction.LOCK.UPDATE })
        const plant = await ProdDataReception.findOne({ where: { rmReceptionId: id }, transaction, lock: transaction.LOCK.UPDATE })
        if (!field || !plant) throw new ErrorApp(409, "Faltan los datos de campo o de recepción en planta")
        if (!Number.isFinite(plant.netWeight) || plant.netWeight < 0) throw new ErrorApp(409, "El peso neto de planta no es válido. Revisa la recepción antes de evaluar")
        const product = await Product.findByPk(field.productId, { transaction, lock: transaction.LOCK.UPDATE })
        if (!product) throw new ErrorNoEncontrado("Producto", field.productId)
        const rule = getPestRule(product.evaluatePests === true, plant.totalBaskets)
        const allDefects = await ProductDefect.findAll({ where: { productId: product.id, activo: true }, order: [["id", "ASC"]], transaction })
        const defects = rule ? allDefects.filter(defect => !isPestDefect(defect.name)) : allDefects
        if (!defects.length && !rule) throw new ErrorApp(409, "Configura al menos un defecto activo en el producto antes de evaluarlo")
        if (configurationVersion(product, defects, plant.totalBaskets) !== input.configurationVersion) throw new ErrorApp(409, "La configuración de calidad cambió. Recarga la evaluación y revisa los datos antes de guardar")
        const pestEvaluation = inspectPests(rule, input, plant.totalBaskets)
        const inputs = new Map(input.defects.map(defect => [defect.defectId, defect.input]))
        if (inputs.size !== input.defects.length || inputs.size !== defects.length || defects.some(defect => !inputs.has(defect.id))) {
            throw new ErrorApp(400, "Debes evaluar exactamente los defectos activos de este producto")
        }
        const evaluator = await User.findOne({ where: { id: userId, activo: true }, attributes: ["id", "name"], transaction })
        if (!evaluator) throw new ErrorNoAutorizado("No se pudo identificar al evaluador")
        const acceptedPercentage = requireAcceptedPercentage(product.acceptedPercentage)
        const calculations = calculateQuality(plant.netWeight, defects.map(defect => ({ input: inputs.get(defect.id)!, tolerancePercentage: defect.tolerancePercentage })))
        const qualityReasons = qualityConsignmentReasons(calculations.percentage, acceptedPercentage, pestEvaluation)
        const doc = await QualityControlDoc.create({
            rmReceptionId: id, producerId: field.producerId,
            netWeight: plant.netWeight, totalBaskets: plant.totalBaskets,
            harvestDocNumber: input.harvestDocNumber, sampleUnits: String(input.sampleUnits),
            ph: input.ph, brix: input.brix, observations: input.observations,
            percentage: calculations.percentage, validPounds: calculations.validPounds,
            userId: evaluator.id, evaluatorName: evaluator.name, acceptedPercentage: product.acceptedPercentage,
            docDate: new Date(), inspectorSignature,
            pestEvaluation,
        }, { transaction })
        await QualityControlDefect.bulkCreate(defects.map((defect, index) => ({
            qualityControlId: doc.id, defectId: null, productDefectId: defect.id,
            defectName: defect.name, tolerancePercentage: defect.tolerancePercentage,
            input: inputs.get(defect.id)!, result: calculations.results[index],
        })), { transaction })
        await plant.update({ qualityPercentage: calculations.percentage, validPounds: calculations.validPounds }, { transaction })
        // NULL is how the field creation checkbox is persisted. Never replace
        // a percentage already supplied in the field (including numeric zero).
        if (field.qualityPercentage === null) {
            const netWeight = field.weight - field.weightBaskets
            if (!Number.isFinite(netWeight) || netWeight < 0) throw new ErrorApp(409, "El peso neto de campo no es válido. Revisa la boleta antes de evaluar")
            await field.update({
                qualityPercentage: calculations.percentage, qualityDefinedInPlant: true,
                netWeight, validPounds: roundQuality(netWeight * calculations.percentage / 100),
            }, { transaction })
        }
        await boleta.update({ consignment: qualityReasons.length > 0, qualityReasons, status: "pendiente_asignacion_grn", editVersion: boleta.editVersion + 1 }, { transaction })
        return { id: doc.id, ...calculations }
    }))
}

function editConfiguration(doc: QualityControlDoc, defects: QualityControlDefect[], version: number) {
    return JSON.stringify([doc.id, version, doc.acceptedPercentage, doc.pestEvaluation?.rule ?? null, defects.map(defect => [defect.id, defect.defectName, defect.tolerancePercentage])])
}

async function getEditContext(id: number, permissions: string[]) {
    const boleta = await rmReceptionService.getRmReceptionById(id)
    assertEditAllowed(boleta, "quality", permissions, boleta.editVersion)
    const doc = boleta.qualityControlDocs[0]
    if (!doc || !boleta.prodDataReceptions[0]) throw new ErrorApp(409, "Primero debe registrarse la evaluación de calidad.")
    const defects = doc.qualityControlDefects
    return { boleta, evaluation: doc,
        pestControl: { enabled: !!doc.pestEvaluation, rule: doc.pestEvaluation?.rule ?? null },
        defects: defects.map(defect => ({ id: defect.id, name: defect.defectName ?? `Defecto ${defect.defectId ?? defect.id}`, tolerancePercentage: defect.tolerancePercentage, activo: true })),
        acceptedPercentage: requireAcceptedPercentage(doc.acceptedPercentage, true), configurationVersion: editConfiguration(doc, defects, boleta.editVersion) }
}

async function edit(id: number, input: EditQualityInput, userId: number, permissions: string[]) {
    const context = await getEditContext(id, permissions)
    if (input.expectedVersion !== context.boleta.editVersion) throw new ErrorApp(409, "La boleta cambió. Recarga antes de corregir.")
    return sequelize.transaction(async transaction => {
        const receipt = await RmReception.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
        if (!receipt) throw new ErrorNoEncontrado("Boleta", id)
        const override = assertEditAllowed(receipt, "quality", permissions, input.expectedVersion)
        const doc = await QualityControlDoc.findOne({ where: { rmReceptionId: id }, order: [["id", "DESC"]], transaction })
        const field = await FieldDataReception.findOne({ where: { rmReceptionId: id }, transaction })
        const plant = await ProdDataReception.findOne({ where: { rmReceptionId: id }, transaction })
        if (!doc || !field || !plant) throw new ErrorApp(409, "Faltan los datos de la evaluación.")
        const defects = await QualityControlDefect.findAll({ where: { qualityControlId: doc.id }, order: [["id", "ASC"]], transaction })
        if (input.configurationVersion !== editConfiguration(doc, defects, receipt.editVersion)) throw new ErrorApp(409, "La evaluación cambió. Recarga antes de guardar.")
        const inputs = new Map(input.defects.map(defect => [defect.defectId, defect.input]))
        if (inputs.size !== defects.length || defects.some(defect => !inputs.has(defect.id))) throw new ErrorApp(400, "Debes corregir exactamente los defectos de la evaluación original.")
        if (!Number.isFinite(plant.netWeight) || plant.netWeight < 0) throw new ErrorApp(409, "El peso neto no es válido.")
        const acceptedPercentage = requireAcceptedPercentage(doc.acceptedPercentage, true)
        const pestEvaluation = inspectPests(doc.pestEvaluation?.rule ?? null, input, plant.totalBaskets)
        const before = await snapshotReceipt(id, transaction)
        const calculations = calculateQuality(plant.netWeight, defects.map(defect => ({ input: inputs.get(defect.id)!, tolerancePercentage: defect.tolerancePercentage })))
        const qualityReasons = qualityConsignmentReasons(calculations.percentage, acceptedPercentage, pestEvaluation)
        await doc.update({ harvestDocNumber: input.harvestDocNumber, sampleUnits: String(input.sampleUnits), ph: input.ph, brix: input.brix,
            observations: input.observations, netWeight: plant.netWeight, totalBaskets: plant.totalBaskets, producerId: field.producerId,
            percentage: calculations.percentage, validPounds: calculations.validPounds, pestEvaluation }, { transaction })
        for (const [index, defect] of defects.entries()) await defect.update({ input: inputs.get(defect.id)!, result: calculations.results[index] }, { transaction })
        await plant.update({ qualityPercentage: calculations.percentage, validPounds: calculations.validPounds }, { transaction })
        if (field.qualityDefinedInPlant || field.qualityPercentage === null) {
            if (!Number.isFinite(field.netWeight) || field.netWeight < 0) throw new ErrorApp(409, "El peso neto de campo no es válido. Revisa los datos de campo antes de corregir calidad.")
            await field.update({ qualityDefinedInPlant: true, qualityPercentage: calculations.percentage,
                validPounds: roundQuality(field.netWeight * calculations.percentage / 100) }, { transaction })
        }
        await receipt.update({ consignment: qualityReasons.length > 0, qualityReasons }, { transaction })
        await recordEdit(receipt, "quality", userId, input.reason, override, before, transaction)
        return { id: doc.id, ...calculations }
    })
}

export const qualityEvaluationService = { getContext, evaluate, getEditContext, edit }
