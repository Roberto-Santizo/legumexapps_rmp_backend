import { authenticationController } from "../controllers/authentication.controller"
import { Router } from "express"
import { validar } from "../../../shared/intermediarios/validar"
import { loginSchema } from "../schemas/authentication.schema"
import { authenticate } from "../middleware/authenticate"
import { loginRateLimit } from "../middleware/loginRateLimit"

const authenticationRoutes = Router()

authenticationRoutes.post("/login", loginRateLimit, validar(loginSchema), authenticationController.login)
authenticationRoutes.post("/refresh", authenticate, authenticationController.refresh)

export default authenticationRoutes
