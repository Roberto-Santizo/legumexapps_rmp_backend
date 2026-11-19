export type DashboardReceipt = {
    id: number; status: string; createdAt: Date | string; consignment: boolean
    fieldDataReceptions: { producerId: number; productId: number; producer?: { name: string } | null; product?: { name: string; varietyProduct?: { name: string } | null } | null }[]
    qualityControlDocs: { id: number; percentage: number; acceptedPercentage: number | null; netWeight: number; validPounds: number; qualityControlDefects: { defectName: string | null; input: number; result: number }[] }[]
}
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
type Group = { id: number; name: string; evaluations: number; comparable: number; approved: number; qualitySum: number; netWeight: number; payablePounds: number }
const newGroup = (id: number, name: string): Group => ({ id, name, evaluations: 0, comparable: 0, approved: 0, qualitySum: 0, netWeight: 0, payablePounds: 0 })
const result = (group: Group) => ({
    id: group.id, name: group.name, evaluations: group.evaluations, comparable: group.comparable, approved: group.approved,
    approvalRate: group.comparable ? round(group.approved / group.comparable * 100) : null,
    averageQuality: group.evaluations ? round(group.qualitySum / group.evaluations) : null,
    netWeight: round(group.netWeight), payablePounds: round(group.payablePounds),
})

export function createDashboardAggregation(filters: { producerId?: number; productId?: number } = {}) {
    let receiptCount = 0
    const products = new Map<number, Group>(), producers = new Map<number, Group>(), months = new Map<string, Group>()
    const defects = new Map<string, { name: string; observedLots: number; penalizedLots: number; penaltySum: number }>()
    const states = new Map<string, number>()
    const intakeProducts = new Map<number, { id: number; name: string; receipts: number }>()
    const consignedProducts = new Map<number, { id: number; name: string; receipts: number }>()
    const total = newGroup(0, "Total")
    const producerOptions = new Map<number, { id: number; name: string }>()
    const productOptions = new Map<number, { id: number; name: string }>()
    const monthFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala", year: "numeric", month: "2-digit" })
    function add(receipt: DashboardReceipt) {
        // Use the same first field detail as all receipt-level quality metrics.
        // Options cover the entire date range, so a selection never hides the others.
        const intakeField = receipt.fieldDataReceptions[0]
        if (intakeField) {
            producerOptions.set(intakeField.producerId, { id: intakeField.producerId, name: intakeField.producer?.name ?? "Productor sin identificar" })
            productOptions.set(intakeField.productId, { id: intakeField.productId, name: [intakeField.product?.name ?? "Producto sin identificar", intakeField.product?.varietyProduct?.name].filter(Boolean).join(" · ") })
        }
        if (filters.producerId !== undefined && intakeField?.producerId !== filters.producerId) return
        if (filters.productId !== undefined && intakeField?.productId !== filters.productId) return
        receiptCount++
        states.set(receipt.status, (states.get(receipt.status) ?? 0) + 1)
        // Classification comes from the receipt, not a new quality calculation.
        if (receipt.consignment === true) {
            const productId = intakeField?.productId ?? 0
            const entry = consignedProducts.get(productId) ?? {
                id: productId,
                name: [intakeField?.product?.name ?? "Producto sin identificar", intakeField?.product?.varietyProduct?.name].filter(Boolean).join(" · "),
                receipts: 0,
            }
            entry.receipts++
            consignedProducts.set(productId, entry)
        }
        if (intakeField) {
            const entry = intakeProducts.get(intakeField.productId) ?? {
                id: intakeField.productId,
                name: [intakeField.product?.name ?? "Producto sin identificar", intakeField.product?.varietyProduct?.name].filter(Boolean).join(" · "),
                receipts: 0,
            }
            entry.receipts++
            intakeProducts.set(entry.id, entry)
        }
        const evaluation = [...receipt.qualityControlDocs].sort((a, b) => b.id - a.id)[0]
        if (!evaluation) return
        const field = receipt.fieldDataReceptions[0]
        const productId = field?.productId ?? 0, producerId = field?.producerId ?? 0
        const productName = [field?.product?.name ?? "Producto sin identificar", field?.product?.varietyProduct?.name].filter(Boolean).join(" · ")
        if (!products.has(productId)) products.set(productId, newGroup(productId, productName))
        if (!producers.has(producerId)) producers.set(producerId, newGroup(producerId, field?.producer?.name ?? "Productor sin identificar"))
        const parts = monthFormatter.formatToParts(new Date(receipt.createdAt))
        const month = `${parts.find(part => part.type === "year")!.value}-${parts.find(part => part.type === "month")!.value}`
        if (!months.has(month)) months.set(month, newGroup(0, month))
        const comparable = evaluation.acceptedPercentage !== null && Number.isFinite(evaluation.acceptedPercentage)
        const approved = comparable && evaluation.percentage >= evaluation.acceptedPercentage!
        for (const group of [total, products.get(productId)!, producers.get(producerId)!, months.get(month)!]) {
            group.evaluations++; group.qualitySum += evaluation.percentage
            group.netWeight += evaluation.netWeight; group.payablePounds += evaluation.validPounds
            if (comparable) group.comparable++
            if (approved) group.approved++
        }
        // Count a defect at most once per evaluated receipt, even in legacy duplicates.
        const lotDefects = new Map<string, { name: string; observed: boolean; penalized: boolean; penalty: number }>()
        for (const defect of evaluation.qualityControlDefects) {
            const name = defect.defectName?.trim().toUpperCase() || "DEFECTO HISTÓRICO SIN NOMBRE"
            const value = lotDefects.get(name) ?? { name, observed: false, penalized: false, penalty: 0 }
            value.observed ||= defect.input > 0; value.penalized ||= defect.result > 0; value.penalty += defect.result
            lotDefects.set(name, value)
        }
        for (const value of lotDefects.values()) {
            if (!value.observed && !value.penalized) continue
            const group = defects.get(value.name) ?? { name: value.name, observedLots: 0, penalizedLots: 0, penaltySum: 0 }
            if (value.observed) group.observedLots++
            if (value.penalized) group.penalizedLots++
            group.penaltySum += value.penalty; defects.set(value.name, group)
        }
    }
    function buildResult() {
        const summary = result(total)
        const producerRows = [...producers.values()].map(result).sort((a, b) => (b.approvalRate ?? -1) - (a.approvalRate ?? -1) || b.comparable - a.comparable || (b.averageQuality ?? 0) - (a.averageQuality ?? 0))
        return {
            filterOptions: {
                producers: [...producerOptions.values()].filter(row => row.id > 0).sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id),
                products: [...productOptions.values()].filter(row => row.id > 0).sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id),
            },
            summary: { ...summary, receipts: receiptCount, pendingQuality: states.get("pendiente_evaluacion_calidad") ?? 0, notEvaluated: receiptCount - total.evaluations, missingThreshold: total.evaluations - total.comparable },
            states: [...states].map(([status, count]) => ({ status, count })),
            intakeProducts: [...intakeProducts.values()].sort((a, b) => b.receipts - a.receipts || a.name.localeCompare(b.name) || a.id - b.id),
            consignedProducts: [...consignedProducts.values()].sort((a, b) => b.receipts - a.receipts || a.name.localeCompare(b.name) || a.id - b.id),
            products: [...products.values()].map(result).sort((a, b) => b.evaluations - a.evaluations || a.name.localeCompare(b.name)),
            producers: producerRows,
            reliableProducers: producerRows.filter(group => group.id !== 0 && group.comparable >= 3),
            defects: [...defects.values()].map(group => ({ name: group.name, observedLots: group.observedLots, penalizedLots: group.penalizedLots, averagePenalty: round(group.penaltySum / total.evaluations) })).sort((a, b) => b.observedLots - a.observedLots || b.penalizedLots - a.penalizedLots || a.name.localeCompare(b.name)),
            trend: [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, group]) => ({ month, ...result(group) })),
        }
    }
    return { add, result: buildResult }
}

export function aggregateDashboard(receipts: DashboardReceipt[], filters: { producerId?: number; productId?: number } = {}) {
    const aggregation = createDashboardAggregation(filters)
    for (const receipt of receipts) aggregation.add(receipt)
    return aggregation.result()
}
