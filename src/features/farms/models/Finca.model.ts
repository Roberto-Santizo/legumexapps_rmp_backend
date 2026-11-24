import { Table, Column, DataType, HasMany } from "sequelize-typescript";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import Cdp from "../../cdps/models/Cdp.model";
import RmReception from "../../raw-material-receptions/models/RmReception.model";

@Table({
    tableName: "fincas"
})
class Finca extends ModeloBaseCatalogo {
    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    declare name: string

    @HasMany(() => Cdp)
    declare cdps: Cdp[]

    @HasMany(() => RmReception)
    declare rmReceptions: RmReception[]
}

export default Finca;
