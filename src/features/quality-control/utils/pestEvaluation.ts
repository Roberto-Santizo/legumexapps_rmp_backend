export type PestRule = {
    version: string
    minBaskets: number
    maxBaskets: number | null
    samplePounds: number
    wormRejectionCount: number
    aphidRejectionCount: number
}

export type PestInspection = { wormCount: number; aphidHeadsCount: number }
export type PestEvaluation = {
    rule: PestRule
    wormCount: number
    aphidHeadsCount: number
    // Preserved when reading evaluations saved before the confirmation was removed.
    sampleConfirmed?: true
    result: "accepted" | "correction_required" | "out_of_tolerance"
    reasons: string[]
}

// Null represents the open-ended range above 500 baskets.
const rules: PestRule[] = [
    { version: "broccoli-pests-v1", minBaskets: 1, maxBaskets: 50, samplePounds: 11, wormRejectionCount: 3, aphidRejectionCount: 2 },
    { version: "broccoli-pests-v1", minBaskets: 51, maxBaskets: 150, samplePounds: 22, wormRejectionCount: 5, aphidRejectionCount: 3 },
    { version: "broccoli-pests-v1", minBaskets: 151, maxBaskets: 500, samplePounds: 44, wormRejectionCount: 8, aphidRejectionCount: 3 },
    { version: "broccoli-pests-v2", minBaskets: 501, maxBaskets: null, samplePounds: 66, wormRejectionCount: 11, aphidRejectionCount: 3 },
]

export function getPestRule(enabled: boolean, baskets: number): PestRule | null {
    if (!enabled || !Number.isInteger(baskets) || baskets > 2147483647) return null
    return rules.find(rule => baskets >= rule.minBaskets && (rule.maxBaskets === null || baskets <= rule.maxBaskets)) ?? null
}

export function isPestDefect(name: string): boolean {
    const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    return /\b(gusanos?|afidos?)\b/.test(normalized)
}

export function calculatePestEvaluation(rule: PestRule, inspection: PestInspection): PestEvaluation {
    if (![inspection.wormCount, inspection.aphidHeadsCount].every(value => Number.isInteger(value) && value >= 0 && value <= 2147483647)) {
        throw new Error("Ingresa ambos conteos como enteros desde cero")
    }
    const reasons: string[] = []
    if (inspection.wormCount >= rule.wormRejectionCount) reasons.push(`Consignado por cantidad de gusanos: ${inspection.wormCount} encontrados en muestra de ${rule.samplePounds} lb (fuera de tolerancia desde ${rule.wormRejectionCount}).`)
    if (inspection.aphidHeadsCount >= rule.aphidRejectionCount) reasons.push(`Consignado por cabezas con áfidos: ${inspection.aphidHeadsCount} encontradas en muestra de ${rule.samplePounds} lb (fuera de tolerancia desde ${rule.aphidRejectionCount}).`)
    return { rule: { ...rule }, wormCount: inspection.wormCount, aphidHeadsCount: inspection.aphidHeadsCount,
        result: reasons.length ? "out_of_tolerance" : inspection.wormCount > 0 || inspection.aphidHeadsCount > 0 ? "correction_required" : "accepted", reasons }
}

export function qualityConsignmentReasons(percentage: number, minimum: number, pests: PestEvaluation | null): string[] {
    return [
        ...(percentage < minimum ? [`Consignado por porcentaje de calidad inferior al mínimo: ${percentage} % (mínimo ${minimum} %).`] : []),
        ...(pests?.reasons ?? []),
    ]
}
