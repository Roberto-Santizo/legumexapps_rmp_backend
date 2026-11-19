import type { Transaction } from "sequelize"
import { ErrorApp } from "../../../shared/errores/ErrorApp"
import Plant from "../models/Plant.model"

export async function requireActivePlant(plantId: number | null | undefined, transaction: Transaction): Promise<Plant> {
    if (!plantId) throw new ErrorApp(409, "Asigna una planta al usuario antes de registrar la recepción.")
    const plant = await Plant.findOne({ where: { id: plantId, activo: true }, transaction, lock: transaction.LOCK.SHARE })
    if (!plant) throw new ErrorApp(400, "La planta seleccionada no está disponible.")
    return plant
}
