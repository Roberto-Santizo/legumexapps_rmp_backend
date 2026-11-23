import { Table, Column, DataType, ForeignKey, BelongsTo, HasMany, BeforeUpdate } from "sequelize-typescript";
import { ErrorApp } from "../../../shared/errores/ErrorApp";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import Finca from "../../farms/models/Finca.model";
import FieldDataReception from "./FieldDataReception.model";
import ProdDataReception from "./ProdDataReception.model";
import QualityControlDoc from "../../quality-control/models/QualityControlDoc.model";
import Plant from "../../plants/models/Plant.model";

export const ESTADOS_BOLETA = [
    "pendiente_recepcion",
    "pendiente_evaluacion_calidad",
    "pendiente_asignacion_grn",
    "cerrado"
] as const

@Table({
    tableName: "rm_receptions",
    indexes: [{ name: "rm_receptions_plant_id_idx", fields: ["plant_id"] }]
})
class RmReception extends ModeloBaseCatalogo {
    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false, field: "delivered_to_plant" })
    declare deliveredToPlant: boolean

    // Snapshot of the product rule; later catalog changes must not rewrite receipts.
    @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true, field: "requires_quality_evaluation" })
    declare requiresQualityEvaluation: boolean

    @BeforeUpdate
    static preserveAssignedIdentifiers(record: RmReception) {
        if (record.changed("grn") && record.previous("grn") != null) throw new ErrorApp(409, "El GRN ya asignado no puede modificarse")
        if (record.changed("plantId") && record.previous("plantId") != null) throw new ErrorApp(409, "La planta de recepción ya asignada no puede modificarse")
    }

    @ForeignKey(() => Plant)
    @Column({ type: DataType.BIGINT, allowNull: true, field: "plant_id" })
    declare plantId: number | null

    @BelongsTo(() => Plant, { onDelete: "RESTRICT" })
    declare plant: Plant | null

    @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [], field: "quality_reasons" })
    declare qualityReasons: string[]

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: "field_edit_count", validate: { min: 0 } })
    declare fieldEditCount: number

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: "reception_edit_count", validate: { min: 0 } })
    declare receptionEditCount: number

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: "quality_edit_count", validate: { min: 0 } })
    declare qualityEditCount: number

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0, field: "edit_version" })
    declare editVersion: number

    @Column({
        type: DataType.STRING(255),
        allowNull: true
    })
    declare grn: string | null

    @Column({
        type: DataType.STRING(40),
        allowNull: false,
        defaultValue: "pendiente_recepcion"
    })
    declare status: (typeof ESTADOS_BOLETA)[number]

    @Column({
        type: DataType.DATE,
        allowNull: false,
        field: "doc_date"
    })
    declare docDate: Date

    @ForeignKey(() => Finca)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "finca_id"
    })
    declare fincaId: number

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        field: "consignacion"
    })
    declare consignment: boolean

    @Column({
        type: DataType.BIGINT,
        allowNull: true,
        field: "quality_status_id"
    })
    declare qualityStatusId: number

    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "user_id"
    })
    declare userId: number

    @BelongsTo(() => Finca)
    declare finca: Finca

    @HasMany(() => FieldDataReception, { foreignKey: "rmReceptionId" })
    declare fieldDataReceptions: FieldDataReception[]

    @HasMany(() => ProdDataReception)
    declare prodDataReceptions: ProdDataReception[]

    @HasMany(() => QualityControlDoc, { foreignKey: "rmReceptionId" })
    declare qualityControlDocs: QualityControlDoc[]
}

export default RmReception;
