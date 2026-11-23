import { Table, Column, DataType, ForeignKey, BelongsTo, BeforeValidate } from "sequelize-typescript"
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo"
import Product from "./Product.model"
import { normalizeDefectName } from "../utils/defectName"

// Defecto configurado para un producto/variedad con su tolerancia; no es un resultado de evaluación.
@Table({ tableName: "product_defects", indexes: [
    { name: "product_defects_product_name_unique", unique: true, fields: ["product_id", "defect_name"] },
] })
export default class ProductDefect extends ModeloBaseCatalogo {
    @ForeignKey(() => Product)
    @Column({ type: DataType.BIGINT, allowNull: false, field: "product_id" })
    declare productId: number

    @Column({ type: DataType.STRING(255), allowNull: false, field: "defect_name" })
    declare defectName: string

    @Column({ type: DataType.DOUBLE, allowNull: false, field: "tolerance_percentage", validate: { min: 0, max: 100 } })
    declare tolerancePercentage: number

    @BelongsTo(() => Product)
    declare product: Product

    @BeforeValidate
    static normalizeName(record: ProductDefect) {
        if (typeof record.defectName === "string") record.defectName = normalizeDefectName(record.defectName)
    }
}
