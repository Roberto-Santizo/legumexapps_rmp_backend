import z from "zod"

export const MIN_EDIT_REASON_WORDS = 7
export const MAX_EDIT_REASON_LENGTH = 1000

export function countReasonWords(reason: string): number {
    return reason.normalize("NFC").match(/\p{L}[\p{L}\p{M}\p{N}]*(?:[-'’][\p{L}\p{M}\p{N}]+)*/gu)?.length ?? 0
}

export const editReasonSchema = z.string().trim().max(MAX_EDIT_REASON_LENGTH, "El motivo admite hasta 1000 caracteres")
    .refine(value => countReasonWords(value) >= MIN_EDIT_REASON_WORDS, "Explica el motivo de la actualización con al menos 7 palabras. Los signos y números solos no cuentan.")
