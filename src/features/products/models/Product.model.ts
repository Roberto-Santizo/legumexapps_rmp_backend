import { Table, Column, DataType, ForeignKey, BelongsTo, HasMany } from "sequelize-typescript";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import VarietyProduct from "./VarietyProduct.model";
import ProductDefect from "./ProductDefect.model";
import FieldDataReception from "../../raw-material-receptions/models/FieldDataReception.model";

@Table({
    tableName: "products"
})
class Product extends ModeloBaseCatalogo {
    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false, field: "evaluate_pests" })
    declare evaluatePests: boolean

    @HasMany(() => ProductDefect)
    declare defects: ProductDefect[]

    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    declare name: string

    @ForeignKey(() => VarietyProduct)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "variety_product_id"
    })
    declare varietyProductId: number

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        field: "accepted_percentage"
    })
    declare acceptedPercentage: number

    @BelongsTo(() => VarietyProduct)
    declare varietyProduct: VarietyProduct

    @HasMany(() => FieldDataReception, { foreignKey: "productId" })
    declare fieldDataReceptions: FieldDataReception[]
}

export default Product;
