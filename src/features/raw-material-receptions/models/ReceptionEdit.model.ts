import { Table, Model, Column, DataType, PrimaryKey, AutoIncrement, ForeignKey } from "sequelize-typescript"
import RmReception from "./RmReception.model"
import type { EditStage } from "../services/editPolicy"

// Historial sin endpoints de actualización ni eliminación.
@Table({ tableName: "reception_edits", timestamps: true, updatedAt: false, createdAt: "created_at" })
export default class ReceptionEdit extends Model {
    @PrimaryKey @AutoIncrement @Column(DataType.BIGINT)
    declare id: number

    @ForeignKey(() => RmReception)
    @Column({ type: DataType.BIGINT, allowNull: false, field: "rm_reception_id" })
    declare rmReceptionId: number

    @Column({ type: DataType.BIGINT, allowNull: false, field: "user_id" })
    declare userId: number

    @Column({ type: DataType.STRING(100), allowNull: false, field: "actor_name" })
    declare actorName: string

    @Column({ type: DataType.STRING(20), allowNull: false })
    declare stage: EditStage

    @Column({ type: DataType.STRING(1000), allowNull: false })
    declare reason: string

    @Column({ type: DataType.BOOLEAN, allowNull: false })
    declare override: boolean

    @Column({ type: DataType.JSONB, allowNull: false })
    declare before: object

    @Column({ type: DataType.JSONB, allowNull: false })
    declare after: object
}
