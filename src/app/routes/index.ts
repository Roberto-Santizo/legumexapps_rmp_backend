import { Router } from "express"
import qualityEvaluationRoutes from "../../features/quality-control/routes/qualityEvaluation.routes"
import reportRoutes from "../../features/reports/routes/report.routes"
import authenticationRoutes from "../../features/authentication/routes/authentication.routes"
import userRoutes from "../../features/users/routes/user.routes"
import plantRoutes from "../../features/plants/routes/plant.routes"
import roleRoutes from "../../features/roles/routes/role.routes"
import producerRoutes from "../../features/producers/routes/producer.routes"
import fincaRoutes from "../../features/farms/routes/finca.routes"
import { carrierRoutes, plateRoutes } from "../../features/transport/routes/transport.routes"
import productRoutes from "../../features/products/routes/product.routes"
import varietyProductRoutes from "../../features/products/routes/varietyProduct.routes"
import basketRoutes from "../../features/baskets/routes/basket.routes"
import cdpRoutes from "../../features/cdps/routes/cdp.routes"
import rmReceptionRoutes from "../../features/raw-material-receptions/routes/rmReception.routes"

const enrutadorPrincipal = Router()

enrutadorPrincipal.use("/auth", authenticationRoutes)
enrutadorPrincipal.use("/users", userRoutes)
enrutadorPrincipal.use("/plants", plantRoutes)
enrutadorPrincipal.use("/roles", roleRoutes)
enrutadorPrincipal.use("/producers", producerRoutes)
enrutadorPrincipal.use("/farms", fincaRoutes)
enrutadorPrincipal.use("/carriers", carrierRoutes)
enrutadorPrincipal.use("/plates", plateRoutes)
enrutadorPrincipal.use("/products", productRoutes)
enrutadorPrincipal.use("/variety-products", varietyProductRoutes)
enrutadorPrincipal.use("/baskets", basketRoutes)
enrutadorPrincipal.use("/cdps", cdpRoutes)
enrutadorPrincipal.use("/rm-receptions", rmReceptionRoutes)
enrutadorPrincipal.use("/reports", reportRoutes)
enrutadorPrincipal.use("/quality-evaluations", qualityEvaluationRoutes)

export default enrutadorPrincipal
