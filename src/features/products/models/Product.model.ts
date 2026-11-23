import { Table, Column, DataType, ForeignKey, BelongsTo, HasMany, BeforeValidate } from "sequelize-typescript";
import { formatCatalogName } from "../utils/defectName";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import VarietyProduct from "./VarietyProduct.model";
import ProductDefect from "./ProductDefect.model";
import FieldDataReception from "../../raw-material-receptions/models/FieldDataReception.model";

@Table({
    tableName: "products"
})
class Product extends ModeloBaseCatalogo {
    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true, field: "requires_quality_evaluation" })
    declare requiresQualityEvaluation: boolean

    @BeforeValidate
    static normalizeName(record: Product) {
        if (typeof record.name === "string") record.name = formatCatalogName(record.name)
    }

    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false, field: "evaluate_pests" })
    declare evaluatePests: boolean

    @HasMany(() => ProductDefect)
    declare defects: ProductDefect[]

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
        unique: "products_name_variety_unique"
    })
    declare name: string

    @ForeignKey(() => VarietyProduct)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "variety_product_id",
        unique: "products_name_variety_unique"
    })
    declare varietyProductId: number

    @Column({
        type: DataType.DOUBLE,
        allowNull: true,
        field: "accepted_percentage"
    })
    declare acceptedPercentage: number | null

    @BelongsTo(() => VarietyProduct)
    declare varietyProduct: VarietyProduct

    @HasMany(() => FieldDataReception, { foreignKey: "productId" })
    declare fieldDataReceptions: FieldDataReception[]
}

export default Product;
