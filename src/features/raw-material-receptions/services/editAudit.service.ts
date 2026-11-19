import type { Transaction, Model } from "sequelize"
import { ErrorApp, ErrorNoAutorizado } from "../../../shared/errores/ErrorApp"
import RmReception from "../models/RmReception.model"
import FieldDataReception from "../models/FieldDataReception.model"
import ProdDataReception from "../models/ProdDataReception.model"
import QualityControlDoc from "../../quality-control/models/QualityControlDoc.model"
import QualityControlDefect from "../../quality-control/models/QualityControlDefect.model"
import User from "../../users/models/User.model"
import ReceptionEdit from "../models/ReceptionEdit.model"
import { EDIT_RULES, type EditStage } from "./editPolicy"
import { editReasonSchema } from "../../../shared/validacion/editReason"

function values(record: Model | null): object | null {
    if (!record) return null
    const result = { ...record.get({ plain: true }) }
    delete result.createdAt
    delete result.updatedAt
    return result
}

export async function snapshotReceipt(id: number, transaction: Transaction) {
    const receipt = await RmReception.findByPk(id, { transaction })
    const field = await FieldDataReception.findOne({ where: { rmReceptionId: id }, transaction })
    const reception = await ProdDataReception.findOne({ where: { rmReceptionId: id }, transaction })
    const quality = await QualityControlDoc.findOne({ where: { rmReceptionId: id }, order: [["id", "DESC"]], transaction })
    const defects = quality ? await QualityControlDefect.findAll({ where: { qualityControlId: quality.id }, order: [["id", "ASC"]], transaction }) : []
    return { receipt: values(receipt), field: values(field), reception: values(reception), quality: values(quality), defects: defects.map(values) }
}

export async function recordEdit(receipt: RmReception, stage: EditStage, userId: number, reason: string,
    override: boolean, before: object, transaction: Transaction) {
    const validatedReason = editReasonSchema.parse(reason)
    const after = await snapshotReceipt(receipt.id, transaction)
    if (JSON.stringify(before) === JSON.stringify(after)) throw new ErrorApp(400, "No hay cambios que guardar.")
    const actor = await User.findOne({ where: { id: userId, activo: true }, attributes: ["id", "name"], transaction })
    if (!actor) throw new ErrorNoAutorizado()
    const counter = EDIT_RULES[stage].counter
    await receipt.update({ [counter]: receipt[counter] + 1, editVersion: receipt.editVersion + 1 }, { transaction })
    await ReceptionEdit.create({ rmReceptionId: receipt.id, userId, actorName: actor.name, stage, reason: validatedReason, override, before,
        after: await snapshotReceipt(receipt.id, transaction) }, { transaction })
}
