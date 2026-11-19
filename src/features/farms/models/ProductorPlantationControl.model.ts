import { Table, Column, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import Finca from "./Finca.model";

@Table({
    tableName: "productor_plantation_controls"
})
class ProductorPlantationControl extends ModeloBaseCatalogo {
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

export default ProductorPlantationControl;
