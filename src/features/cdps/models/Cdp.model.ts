import { Table, Column, DataType, ForeignKey, BelongsTo } from "sequelize-typescript"
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo"
import Finca from "../../farms/models/Finca.model"

@Table({
    tableName: "cdps"
})
class Cdp extends ModeloBaseCatalogo {
    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    declare name: string

    @ForeignKey(() => Finca)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "finca_id"
    })
    declare fincaId: number

    @BelongsTo(() => Finca)
    declare finca: Finca
}

export default Cdp
