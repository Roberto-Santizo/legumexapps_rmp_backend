import { Table, Column, DataType, ForeignKey, BelongsTo } from "sequelize-typescript"
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo"
import Product from "./Product.model"

// Configuración propia de un producto/variedad; no es un resultado de evaluación.
@Table({ tableName: "product_defects", indexes: [{ unique: true, fields: ["product_id", "name"] }] })
export default class ProductDefect extends ModeloBaseCatalogo {
    @ForeignKey(() => Product)
    @Column({ type: DataType.BIGINT, allowNull: false, field: "product_id" })
    declare productId: number

    @Column({ type: DataType.STRING(255), allowNull: false })
    declare name: string

    @Column({ type: DataType.DOUBLE, allowNull: false, field: "tolerance_percentage", validate: { min: 0, max: 100 } })
    declare tolerancePercentage: number

    @BelongsTo(() => Product)
    declare product: Product
}
