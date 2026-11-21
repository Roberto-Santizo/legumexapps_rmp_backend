export function displayDefectName(value: string): string {
    return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleUpperCase("es")
}

export function normalizeDefectName(value: string): string {
    return displayDefectName(value).normalize("NFD").replace(/N\u0303/g, "Ñ").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s*([<>]=?)\s*/g, " $1 ").replace(/(\d)\s*(MM|CM|CMS|LBS)\b/g, "$1 $2")
        .replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ").trim()
}

// Equivalencias explícitas aprobadas. No sustituir fragmentos ni quitar límites,
// unidades, signos o calificadores de criterios compuestos.
export const DEFECT_SPELLINGS: Record<string, string> = {
    "DAÑO MECANICO": "DAÑO MECÁNICO", "DAÑOI MECANICO": "DAÑO MECÁNICO",
    PUDRICION: "PUDRICIÓN",
    "PUDRICION / HONGOS": "PUDRICIÓN / HONGOS", "PUDRCION / HONGOS": "PUDRICIÓN / HONGOS",
    MALLUGADO: "MAGULLADURAS", MALLUGADOS: "MAGULLADURAS", MALLUGADAS: "MAGULLADURAS", MAGULLADAS: "MAGULLADURAS",
    DESIDRATACION: "DESHIDRATACIÓN", DESHIDRATACION: "DESHIDRATACIÓN",
    SOBREMADURES: "SOBREMADUREZ", SOBREMADURO: "SOBREMADUREZ", "SOBRE MADURO": "SOBREMADUREZ",
    "CALIZ/PATA (3 UNIDADES)": "CÁLIZ / PATA (3 UNIDADES)", "CALIZ / PATA (3 UNIDADES)": "CÁLIZ / PATA (3 UNIDADES)",
    DEFORME: "DEFORMES", "MANCHA NEGRA": "MANCHAS NEGRAS",
    "PESO < 2.5 LBS": "PESO < 2,5 LBS", "PESO <2,5 LBS": "PESO < 2,5 LBS",
    "AUSENCIA DE PEDUNCULO": "AUSENCIA DE PEDÚNCULO", BROTACION: "BROTACIÓN", "MANCHA CAFE": "MANCHA CAFÉ",
}

export function standardizeDefectName(value: string): string {
    return DEFECT_SPELLINGS[normalizeDefectName(value)] ?? displayDefectName(value)
}
