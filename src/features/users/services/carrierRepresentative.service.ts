import type { Transaction } from "sequelize"
import { Op } from "sequelize"
import { ErrorApp } from "../../../shared/errores/ErrorApp"
import Role from "../../roles/models/Role.model"
import Carrier from "../../transport/models/Carrier.model"
import User from "../models/User.model"

export async function validateCarrierRepresentative(roleId: number, carrierId: number | null, userId: number | undefined, transaction: Transaction) {
    if (carrierId === null) return
    const role = await Role.findByPk(roleId, { transaction })
    if (role?.name.trim().toLocaleLowerCase("es") !== "campo") {
        throw new ErrorApp(400, "El representante del transportista debe pertenecer al rol Campo.")
    }
    // Serializes assignment for a carrier; the unique index also protects concurrent writes.
    const carrier = await Carrier.findByPk(carrierId, { transaction, lock: transaction.LOCK.UPDATE })
    if (!carrier) throw new ErrorApp(400, "El transportista seleccionado no existe.")
    const other = await User.findOne({ where: { representedCarrierId: carrierId, ...(userId ? { id: { [Op.ne]: userId } } : {}) }, transaction })
    if (other) throw new ErrorApp(409, "Este transportista ya tiene un representante. Retira su asignación antes de designar otro.")
}
