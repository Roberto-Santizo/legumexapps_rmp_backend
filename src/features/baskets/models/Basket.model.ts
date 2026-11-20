import { Table, Column, DataType, HasMany } from "sequelize-typescript";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import FieldDataReception from "../../raw-material-receptions/models/FieldDataReception.model";

@Table({
    tableName: "baskets"
})
class Basket extends ModeloBaseCatalogo {
    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    declare name: string

    @Column({
        type: DataType.DOUBLE,
        allowNull: false
    })
    declare weight: number

    @HasMany(() => FieldDataReception, { foreignKey: "basketId" })
    declare fieldDataReceptions: FieldDataReception[]
}

export default Basket;
