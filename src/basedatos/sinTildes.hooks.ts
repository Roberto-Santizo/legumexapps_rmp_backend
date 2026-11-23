import type { Sequelize } from "sequelize-typescript"
import { DataTypes, type Model, type ModelStatic } from "sequelize"
import { quitarTildes } from "../shared/utils/sinTildes"

// Contraseñas y firmas (URLs/claves de S3) se guardan tal cual.
const EXCLUIDOS = /password|signature/i

function columnasDeTexto(model: ModelStatic<Model>): string[] {
    return Object.entries(model.getAttributes())
        .filter(([name, attribute]) => !EXCLUIDOS.test(name)
            && (attribute.type instanceof DataTypes.STRING || attribute.type instanceof DataTypes.TEXT))
        .map(([name]) => name)
}

function limpiar(instance: Model) {
    const model = instance.constructor as ModelStatic<Model>
    for (const name of columnasDeTexto(model)) {
        const value = instance.getDataValue(name)
        if (typeof value === "string") instance.setDataValue(name, quitarTildes(value))
    }
}

// Aplica la regla "sin tildes" a todos los modelos al crear o actualizar,
// incluso en bulkCreate sin validación.
export function registrarTextoSinTildes(db: Sequelize): void {
    db.addHook("beforeValidate", instance => limpiar(instance as Model))
    db.addHook("beforeSave", instance => limpiar(instance as Model))
    db.addHook("beforeBulkCreate", instances => { for (const instance of instances as Model[]) limpiar(instance) })
    db.addHook("beforeBulkUpdate", options => {
        const { attributes, model } = options as unknown as { attributes?: Record<string, unknown>; model: ModelStatic<Model> }
        if (!attributes) return
        for (const name of columnasDeTexto(model)) {
            if (typeof attributes[name] === "string") attributes[name] = quitarTildes(attributes[name] as string)
        }
    })
}
