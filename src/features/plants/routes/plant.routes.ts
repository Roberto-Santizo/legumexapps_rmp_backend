import { Router } from "express"
import { authenticate } from "../../authentication/middleware/authenticate"
import Plant from "../models/Plant.model"

const plantRoutes = Router()
plantRoutes.use(authenticate)
plantRoutes.get("/current", async (req, res, next) => {
    try { res.json({ data: req.user?.plantId ? await Plant.findOne({ where: { id: req.user.plantId, activo: true } }) : null }) }
    catch (error) { next(error) }
})
plantRoutes.get("/", async (_req, res, next) => {
    try { res.json({ data: await Plant.findAll({ where: { activo: true }, order: [["name", "ASC"]] }) }) }
    catch (error) { next(error) }
})
export default plantRoutes
