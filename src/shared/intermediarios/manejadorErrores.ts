import { Request, Response, NextFunction } from "express"
import { ValidationError as ErrorValidacionSequelize, UniqueConstraintError, ForeignKeyConstraintError, DatabaseError } from "sequelize"
import { ZodError } from "zod"
import { ErrorApp } from "../errores/ErrorApp"

export function manejadorErrores(error: unknown, _req: Request, res: Response, next: NextFunction): void {
    if (res.headersSent) { next(error); return }
    const parserError = error as { type?: string }
    if (parserError?.type === "entity.parse.failed") {
        res.status(400).json({ message: "El cuerpo de la solicitud no contiene JSON válido" })
        return
    }
    if (parserError?.type === "entity.too.large") {
        res.status(413).json({ message: "La solicitud supera el tamaño permitido" })
        return
    }
    if (error instanceof ErrorApp) {
        res.status(error.codigoEstado).json({ message: error.message })
        return
    }

    if (error instanceof ZodError) {
        res.status(400).json({
            message: "Error de validación",
            details: error.issues.map(issue => ({
                path: issue.path.join("."),
                message: issue.message
            }))
        })
        return
    }

    if (error instanceof UniqueConstraintError) {
        res.status(409).json({
            message: "El recurso ya existe",
            details: error.errors.map(itemValidacion => itemValidacion.message)
        })
        return
    }

    if (error instanceof ErrorValidacionSequelize) {
        res.status(400).json({
            message: "Error de validación",
            details: error.errors.map(itemValidacion => itemValidacion.message)
        })
        return
    }

    if (error instanceof ForeignKeyConstraintError) {
        res.status(400).json({ message: "Uno de los registros relacionados no existe o todavía está en uso" })
        return
    }
    if (error instanceof DatabaseError) {
        const code = (error.parent as Error & { code?: string }).code
        if (code === "23514") {
            res.status(409).json({ message: "Los datos no cumplen las reglas de integridad del registro" })
            return
        }
        if (code === "22003" || code === "22P02") {
            res.status(400).json({ message: "Un valor numérico o identificador está fuera del rango permitido" })
            return
        }
    }
    // Do not log SQL, request bodies, credentials or database parameters.
    console.error("Error interno no controlado:", error instanceof Error ? error.name : "UnknownError")
    res.status(500).json({ message: "Error interno del servidor" })
}
