import { quitarTildes } from "../../../shared/utils/sinTildes"

// Nombres de productos y variedades: mayúsculas, sin tildes y espacios simples.
export function formatCatalogName(value: string): string {
    return quitarTildes(value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleUpperCase("es"))
}

// Nombre de defecto tal como se guarda en product_defects.defect_name:
// mayúsculas, sin tildes (se conserva la Ñ) y espacios uniformes en signos y unidades.
export function normalizeDefectName(value: string): string {
    return formatCatalogName(value).normalize("NFD").replace(/Ñ/g, "Ñ").replace(/[̀-ͯ]/g, "")
        .replace(/\s*([<>]=?)\s*/g, " $1 ").replace(/(\d)\s*(MM|CM|CMS|LBS)\b/g, "$1 $2")
        .replace(/\s*\/\s*/g, " / ").replace(/\s+/g, " ").trim()
}

// Defecto que alimenta la columna "% Peso de desecho" del reporte Excel.
// Debe escribirse exactamente así en los productos que lo evalúan.
export const WASTE_WEIGHT_DEFECT_NAME = "PESO DE DESECHO"
