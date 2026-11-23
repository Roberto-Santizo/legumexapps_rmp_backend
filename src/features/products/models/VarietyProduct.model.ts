import { Table, Column, DataType, HasMany, BeforeValidate } from "sequelize-typescript";
import { formatCatalogName } from "../utils/defectName";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import Product from "./Product.model";

@Table({
    tableName: "variety_products"
})
class VarietyProduct extends ModeloBaseCatalogo {
    @BeforeValidate
    static normalizeName(record: VarietyProduct) {
        if (typeof record.name === "string") record.name = formatCatalogName(record.name)
    }

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
        unique: true
    })
    declare name: string

    @HasMany(() => Product)
    declare products: Product[]
}

export default VarietyProduct;
