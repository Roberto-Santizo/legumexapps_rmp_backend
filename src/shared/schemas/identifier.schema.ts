import { z } from "zod"

export const identifierParamSchema = z.string()
    .regex(/^\d+$/, "Ingresa un identificador positivo válido")
    .refine(value => Number.isSafeInteger(Number(value)) && Number(value) > 0, "El identificador está fuera del rango permitido")
