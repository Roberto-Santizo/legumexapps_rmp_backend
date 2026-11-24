import "reflect-metadata"
import { Sequelize } from "sequelize-typescript"
import { types } from "pg"
import { configuracionBaseDatos, type ParametrosBaseDatos } from "../config/database"
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
import Producer from "../features/producers/models/Producer.model"
import Basket from "../features/baskets/models/Basket.model"
import RmReception from "../features/raw-material-receptions/models/RmReception.model"
import FieldDataReception from "../features/raw-material-receptions/models/FieldDataReception.model"
import ProdDataReception from "../features/raw-material-receptions/models/ProdDataReception.model"
import QualityControlDoc from "../features/quality-control/models/QualityControlDoc.model"
import QualityControlDefect from "../features/quality-control/models/QualityControlDefect.model"
import Cdp from "../features/cdps/models/Cdp.model"
import { registrarTextoSinTildes } from "./sinTildes.hooks"
import ReceptionEdit from "../features/raw-material-receptions/models/ReceptionEdit.model"

export function crearConexion(parametros: ParametrosBaseDatos): Sequelize {
    // Mantener BIGINT como número para los contratos JSON de la aplicación.
    types.setTypeParser(20, (value: string) => parseInt(value, 10))
    const configuracion = configuracionBaseDatos(parametros)
    const db = new Sequelize(configuracion.url, {
        ...configuracion.options,
        models: [
            Plant, User, Role, Permission, RolePermission, Carrier, Plate,
            VarietyProduct, Product, ProductDefect,
            Finca, Producer, Basket,
            RmReception, FieldDataReception, ProdDataReception,
            QualityControlDoc, QualityControlDefect, Cdp, ReceptionEdit,
        ],
    })
    registrarTextoSinTildes(db)
    return db
}
