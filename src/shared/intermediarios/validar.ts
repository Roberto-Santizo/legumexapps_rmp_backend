import { Request, Response, NextFunction, RequestHandler } from "express"
import { ZodType } from "zod"
import { quitarTildes } from "../utils/sinTildes"

type UbicacionPeticion = "body" | "params" | "query"

export function validar(esquema: ZodType, ubicacion: UbicacionPeticion = "body"): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const resultado = esquema.safeParse(req[ubicacion])
        if (!resultado.success) {
            next(resultado.error)
            return
        }
        if (ubicacion === "query") {
            // Los datos se guardan sin tildes: "BRÓ" debe encontrar "BROCOLI".
            const query = Object.fromEntries(Object.entries(resultado.data as Record<string, unknown>)
                .map(([key, value]) => [key, typeof value === "string" ? quitarTildes(value) : value]))
            Object.defineProperty(req, "query", {
                value: query,
                writable: true,
                enumerable: true,
                configurable: true
            })
        } else {
            req[ubicacion] = resultado.data
        }

        next()
    }
}
