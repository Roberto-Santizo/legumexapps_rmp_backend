import "reflect-metadata"
import sequelize from "./conexion"
import { entorno } from "../config/env"
import { ErrorApp } from "../shared/errores/ErrorApp"
import { seedAccessControl } from "./seeders/accessControl.seeder"
import { prepararBaseDatos } from "./prepararBaseDatos"

async function principal() {
    try {
        await prepararBaseDatos(sequelize, seedAccessControl, entorno)
    } catch (error) {
        console.error("No se pudo preparar la aplicación:", error instanceof ErrorApp ? error.message : error instanceof Error ? error.name : "UnknownError")
        process.exitCode = 1
    } finally {
        await sequelize.close()
    }
}

void principal()
