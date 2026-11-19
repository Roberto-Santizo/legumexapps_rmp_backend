import type { Request, Response, NextFunction } from "express"
import type { FieldReportQuery, DashboardQuery } from "../schemas/report.schema"
import { createFieldReport } from "../services/report.service"
import { getDashboard } from "../services/dashboard.service"

export async function dashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        res.setHeader("Cache-Control", "no-store")
        res.json({ data: await getDashboard(req.query as unknown as DashboardQuery) })
    } catch (error) { next(error) }
}

export async function downloadFieldReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const query = req.query as unknown as FieldReportQuery
        const workbook = await createFieldReport(query)
        const buffer = await workbook.xlsx.writeBuffer()
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        res.setHeader("Content-Disposition", `attachment; filename="materia-prima_${query.startDate}_${query.endDate}.xlsx"`)
        res.setHeader("Cache-Control", "no-store")
        res.send(Buffer.from(buffer))
    } catch (error) {
        next(error)
    }
}
