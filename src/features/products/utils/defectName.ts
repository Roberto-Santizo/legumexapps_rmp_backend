export function displayDefectName(value: string): string {
    return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleUpperCase("es")
}

export function normalizeDefectName(value: string): string {
    return displayDefectName(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}
