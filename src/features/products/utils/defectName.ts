export function displayDefectName(value: string): string {
    return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleUpperCase("es")
}

export function normalizeDefectName(value: string): string {
    return displayDefectName(value).normalize("NFD").replace(/N\u0303/g, "Ñ").replace(/[\u0300-\u036f]/g, "")
}

// Equivalencias explícitas aprobadas. No sustituir fragmentos ni quitar límites,
// unidades, signos o calificadores de criterios compuestos.
export const DEFECT_SPELLINGS: Record<string, string> = {
    "DAÑO MECANICO": "DAÑO MECÁNICO", "DAÑOI MECANICO": "DAÑO MECÁNICO",
    PUDRICION: "PUDRICIÓN",
    MALLUGADO: "MAGULLADURAS", MALLUGADAS: "MAGULLADURAS", MAGULLADAS: "MAGULLADURAS",
    DESIDRATACION: "DESHIDRATACIÓN", DESHIDRATACION: "DESHIDRATACIÓN",
    SOBREMADURES: "SOBREMADUREZ", SOBREMADURO: "SOBREMADUREZ",
}

export function standardizeDefectName(value: string): string {
    return DEFECT_SPELLINGS[normalizeDefectName(value)] ?? displayDefectName(value)
}

// Tipos conservados únicamente para interpretar la migración histórica v2.
// El control de plagas vigente pertenece a products.evaluate_pests.
export const EVALUATION_KINDS = ["percentage", "pest_count"] as const
export type EvaluationKind = typeof EVALUATION_KINDS[number]
