import { Sequelize } from "sequelize-typescript"
import { types } from "pg"
import { entorno } from "../config/env"
import { configuracionBaseDatos } from "../config/database"
import { prepararBaseDatos } from "./prepararBaseDatos"
import { seedAccessControl } from "./seeders/accessControl.seeder"

// Mantener BIGINT como número para los contratos JSON de la aplicación.
types.setTypeParser(20, (value: string) => parseInt(value, 10))

import User from "../features/users/models/User.model"
import Plant from "../features/plants/models/Plant.model"
import Role from "../features/roles/models/Role.model"
import Permission from "../features/permissions/models/Permission.model"
import RolePermission from "../features/rolePermissions/models/RolePermission.model"
import Carrier from "../features/transport/models/Carrier.model"
import Plate from "../features/transport/models/Plate.model"
import VarietyProduct from "../features/products/models/VarietyProduct.model"
import Product from "../features/products/models/Product.model"
import ProductDefect from "../features/products/models/ProductDefect.model"
import Finca from "../features/farms/models/Finca.model"
import ProductorPlantationControl from "../features/farms/models/ProductorPlantationControl.model"
import Producer from "../features/producers/models/Producer.model"
import Basket from "../features/baskets/models/Basket.model"
import RmReception from "../features/raw-material-receptions/models/RmReception.model"
import FieldDataReception from "../features/raw-material-receptions/models/FieldDataReception.model"
import ProdDataReception from "../features/raw-material-receptions/models/ProdDataReception.model"
import QualityControlDoc from "../features/quality-control/models/QualityControlDoc.model"
import QualityControlDefect from "../features/quality-control/models/QualityControlDefect.model"
import Cdp from "../features/cdps/models/Cdp.model"
import ReceptionEdit from "../features/raw-material-receptions/models/ReceptionEdit.model"

const configuracion = configuracionBaseDatos(entorno)
export const sequelize = new Sequelize(configuracion.url, {
    ...configuracion.options,
    models: [
        Plant,
        User,
        Role,
        Permission,
        RolePermission,
        Carrier,
        Plate,
        VarietyProduct,
        Product,
        ProductDefect,
        Finca,
        ProductorPlantationControl,
        Producer,
        Basket,
        RmReception,
        FieldDataReception,
        ProdDataReception,
        QualityControlDoc,
        QualityControlDefect,
        Cdp,
        ReceptionEdit
    ]
})

let inicializacion: Promise<void> | undefined

export function conectarBaseDatos(): Promise<void> {
    if (!inicializacion) inicializacion = (async () => {
        await sequelize.authenticate()
        if (entorno.entornoNodo === "development") {
            await prepararBaseDatos(sequelize, seedAccessControl, entorno)
        }
    })().catch(error => {
        // Permitir otro intento en la siguiente petición tras un fallo temporal.
        inicializacion = undefined
        throw error
    })
    return inicializacion
}

export default sequelize
