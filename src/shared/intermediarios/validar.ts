import { Request, Response, NextFunction, RequestHandler } from "express"
import { ZodType } from "zod"

type UbicacionPeticion = "body" | "params" | "query"

export function validar(esquema: ZodType, ubicacion: UbicacionPeticion = "body"): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const resultado = esquema.safeParse(req[ubicacion])
        if (!resultado.success) {
            next(resultado.error)
            return
        }
        if (ubicacion === "query") {
            Object.defineProperty(req, "query", {
                value: resultado.data,
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
