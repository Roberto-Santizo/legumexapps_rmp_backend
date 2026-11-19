import { Table, Column, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import QualityControlDoc from "./QualityControlDoc.model";
import ProductDefect from "../../products/models/ProductDefect.model";

@Table({
    tableName: "quality_control_defects"
})
class QualityControlDefect extends ModeloBaseCatalogo {
    // Nueva referencia; defect_id se conserva para resultados históricos.
    @ForeignKey(() => ProductDefect)
    @Column({ type: DataType.BIGINT, allowNull: true, field: "product_defect_id" })
    declare productDefectId: number | null

    @Column({ type: DataType.STRING(255), allowNull: true, field: "defect_name" })
    declare defectName: string | null

    @BelongsTo(() => ProductDefect)
    declare productDefect: ProductDefect

    @ForeignKey(() => QualityControlDoc)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "quality_control_id"
    })
    declare qualityControlId: number

    // Identificador legado: se conserva para evaluaciones anteriores.
    // Las nuevas usan productDefectId y una copia del nombre y tolerancia.
    @Column({
        type: DataType.BIGINT,
        field: "defect_id",
        allowNull: true
    })
    declare defectId: number | null

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
