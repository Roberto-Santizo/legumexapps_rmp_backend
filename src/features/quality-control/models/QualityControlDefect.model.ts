import { Table, Column, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import QualityControlDoc from "./QualityControlDoc.model";
import ProductDefect from "../../products/models/ProductDefect.model";

@Table({
    tableName: "quality_control_defects"
})
class QualityControlDefect extends ModeloBaseCatalogo {
    @ForeignKey(() => ProductDefect)
    @Column({ type: DataType.BIGINT, allowNull: false, field: "product_defect_id" })
    declare productDefectId: number

    @Column({ type: DataType.STRING(255), allowNull: false, field: "defect_name" })
    declare defectName: string

    @BelongsTo(() => ProductDefect, { onDelete: "RESTRICT" })
    declare productDefect: ProductDefect

    @ForeignKey(() => QualityControlDoc)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "quality_control_id"
    })
    declare qualityControlId: number

    @Column({
        type: DataType.DOUBLE,
        allowNull: false
    })
    declare input: number

    @Column({
        type: DataType.DOUBLE,
        allowNull: false
    })
    declare result: number

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        field: "tolerance_percentage"
    })
    declare tolerancePercentage: number

    @BelongsTo(() => QualityControlDoc)
    declare qualityControlDoc: QualityControlDoc
}

export default QualityControlDefect;
