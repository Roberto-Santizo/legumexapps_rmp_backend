import { Table, Column, DataType, HasMany } from "sequelize-typescript";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import Plate from "./Plate.model";
import FieldDataReception from "../../raw-material-receptions/models/FieldDataReception.model";

@Table({
    tableName: "carriers"
})
class Carrier extends ModeloBaseCatalogo {
    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    declare code: string

    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    declare name: string

    @HasMany(() => Plate)
    declare plates: Plate[]

    @HasMany(() => FieldDataReception, { foreignKey: "carrierId" })
    declare fieldDataReceptions: FieldDataReception[]
}

export default Carrier;
