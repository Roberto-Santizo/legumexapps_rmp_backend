import { entorno } from "../config/env"
import { crearConexion } from "./crearConexion"
import { prepararBaseDatos } from "./prepararBaseDatos"
import { seedAccessControl } from "./seeders/accessControl.seeder"

export const sequelize = crearConexion(entorno)

let inicializacion: Promise<void> | undefined

export function conectarBaseDatos(): Promise<void> {
    if (!inicializacion) inicializacion = (async () => {
        await sequelize.authenticate()
        if (entorno.entornoNodo === "development") {
            await prepararBaseDatos(sequelize, seedAccessControl, entorno)
        }
    })().catch(error => {
        // Permitir otro intento en la siguiente petición tras un fallo temporal.
        inicializacion = undefined
        throw error
    })
    return inicializacion
}

export default sequelize
