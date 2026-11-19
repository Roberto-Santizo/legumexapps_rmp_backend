import z from "zod"

export const fieldReportQuerySchema = z.object({
    startDate: z.iso.date("Fecha inicial inválida"),
    endDate: z.iso.date("Fecha final inválida"),
}).refine(value => value.startDate <= value.endDate, {
    message: "La fecha inicial debe ser anterior o igual a la fecha final",
    path: ["endDate"],
})

export type FieldReportQuery = z.infer<typeof fieldReportQuerySchema>

const dashboardId = z.string().regex(/^[1-9]\d*$/, "Selecciona un identificador válido")
    .transform(Number).pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)).optional()

export const dashboardQuerySchema = fieldReportQuerySchema.safeExtend({
    producerId: dashboardId,
    productId: dashboardId,
})
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>

export function fieldReportDateRange({ startDate, endDate }: FieldReportQuery) {
    const start = new Date(`${startDate}T00:00:00-06:00`)
    const endExclusive = new Date(new Date(`${endDate}T00:00:00-06:00`).getTime() + 86400000)
    return { start, endExclusive }
}
