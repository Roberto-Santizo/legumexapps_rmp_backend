import { Router } from "express"
import { denyFieldReports } from "../../raw-material-receptions/middleware/receptionVisibility"
import { authenticate } from "../../authentication/middleware/authenticate"
import { authorize } from "../../../shared/intermediarios/authorize"
import { validar } from "../../../shared/intermediarios/validar"
import { fieldReportQuerySchema, dashboardQuerySchema } from "../schemas/report.schema"
import { downloadFieldReport, dashboard } from "../controllers/report.controller"

const reportRoutes = Router()
reportRoutes.get("/dashboard", authenticate, authorize("dashboard:view"), denyFieldReports, validar(dashboardQuerySchema, "query"), dashboard)
reportRoutes.get("/field.xlsx", authenticate, authorize("dashboard:view"), denyFieldReports, validar(fieldReportQuerySchema, "query"), downloadFieldReport)
export default reportRoutes
