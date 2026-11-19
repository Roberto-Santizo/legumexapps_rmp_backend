import { Table, Column, DataType, ForeignKey, BelongsTo, HasMany } from "sequelize-typescript";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import RmReception from "../../raw-material-receptions/models/RmReception.model";
import Producer from "../../producers/models/Producer.model";
import QualityControlDefect from "./QualityControlDefect.model";
import type { PestEvaluation } from "../utils/pestEvaluation";

@Table({
    tableName: "quality_control_docs"
})
class QualityControlDoc extends ModeloBaseCatalogo {
    @Column({ type: DataType.JSONB, allowNull: true, field: "pest_evaluation" })
    declare pestEvaluation: PestEvaluation | null

    @Column({ type: DataType.STRING(255), allowNull: true, field: "evaluator_name" })
    declare evaluatorName: string | null

    @Column({ type: DataType.DOUBLE, allowNull: true, field: "accepted_percentage" })
    declare acceptedPercentage: number | null

    @ForeignKey(() => RmReception)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "rm_reception_id"
    })
    declare rmReceptionId: number

    @ForeignKey(() => Producer)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "producer_id"
    })
    declare producerId: number

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        field: "net_weight"
    })
    declare netWeight: number

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
        field: "no_doc_cosecha"
    })
    declare harvestDocNumber: string

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
        field: "sample_units"
    })
    declare sampleUnits: string

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        field: "total_baskets"
    })
    declare totalBaskets: number

    @Column({
        type: DataType.DOUBLE,
        allowNull: true
    })
    declare ph: number | null

    @Column({
        type: DataType.DOUBLE,
        allowNull: true
    })
    declare brix: number | null

    @Column({
        type: DataType.DOUBLE,
        allowNull: false
    })
    declare percentage: number

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        field: "valid_pounds"
    })
    declare validPounds: number

    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "user_id"
    })
    declare userId: number

    @Column({
        type: DataType.DATE,
        allowNull: false,
        field: "doc_date"
    })
    declare docDate: Date

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare observations: string

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
        field: "inspector_signature"
    })
    declare inspectorSignature: string

    @BelongsTo(() => RmReception)
    declare rmReception: RmReception

    @BelongsTo(() => Producer)
    declare producer: Producer

    @HasMany(() => QualityControlDefect)
    declare qualityControlDefects: QualityControlDefect[]
}

export default QualityControlDoc;
