export function roundQuality(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateQuality(netWeight: number, defects: { input: number; tolerancePercentage: number }[]) {
    const results = defects.map(defect => roundQuality(Math.max(0, defect.input - defect.tolerancePercentage)))
    const totalDefects = roundQuality(results.reduce((sum, result) => sum + result, 0))
    const percentage = roundQuality(Math.max(0, 100 - totalDefects))
    return { results, totalDefects, percentage, validPounds: roundQuality(netWeight * percentage / 100) }
}
