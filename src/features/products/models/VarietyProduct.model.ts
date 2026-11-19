import { Table, Column, DataType, HasMany } from "sequelize-typescript";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import Product from "./Product.model";

@Table({
    tableName: "variety_products"
})
class VarietyProduct extends ModeloBaseCatalogo {
    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    declare name: string

    @HasMany(() => Product)
    declare products: Product[]
}

export default VarietyProduct;
