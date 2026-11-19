import { Table, Column, DataType, HasMany } from "sequelize-typescript";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import FieldDataReception from "../../raw-material-receptions/models/FieldDataReception.model";
import QualityControlDoc from "../../quality-control/models/QualityControlDoc.model";

@Table({
    tableName: "producers"
})
class Producer extends ModeloBaseCatalogo {
    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    declare name: string

    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    declare code: string

    @HasMany(() => FieldDataReception, { foreignKey: "producerId" })
    declare fieldDataReceptions: FieldDataReception[]

    @HasMany(() => QualityControlDoc)
    declare qualityControlDocs: QualityControlDoc[]
}

export default Producer;
