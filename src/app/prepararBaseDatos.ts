import type { RequestHandler } from "express"
import { conectarBaseDatos } from "../basedatos/conexion"
import { ErrorApp } from "../shared/errores/ErrorApp"

export const prepararBaseDatos: RequestHandler = async (_req, _res, next) => {
    try {
        await conectarBaseDatos()
        next()
    } catch (error) {
        console.error("Base de datos no disponible:", error instanceof Error ? error.name : "UnknownError")
        next(new ErrorApp(503, "El servicio de datos no está disponible. Intenta nuevamente en unos momentos."))
    }
}
