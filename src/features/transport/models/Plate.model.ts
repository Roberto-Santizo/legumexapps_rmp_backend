import { Table, Column, DataType, ForeignKey, BelongsTo, HasMany } from "sequelize-typescript";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import Carrier from "./Carrier.model";
import FieldDataReception from "../../raw-material-receptions/models/FieldDataReception.model";

@Table({
    tableName: "plates"
})
class Plate extends ModeloBaseCatalogo {
    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    declare name: string

    @Column({ type: DataType.DOUBLE, allowNull: true, field: "max_gross_weight" })
    declare maxGrossWeight: number | null

    @ForeignKey(() => Carrier)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "carrier_id"
    })
    declare carrierId: number

    @BelongsTo(() => Carrier)
    declare carrier: Carrier

    @HasMany(() => FieldDataReception, { foreignKey: "plateId" })
    declare fieldDataReceptions: FieldDataReception[]
}

export default Plate;
