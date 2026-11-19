import { Table, Column, DataType, ForeignKey, BelongsTo } from "sequelize-typescript"
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo"
import Role from "../../roles/models/Role.model"
import Carrier from "../../transport/models/Carrier.model"
import Plant from "../../plants/models/Plant.model"

@Table({
    tableName: "users",
    indexes: [{ name: "users_represented_carrier_id_unique", unique: true, fields: ["represented_carrier_id"] }]
})
class User extends ModeloBaseCatalogo {
    @ForeignKey(() => Plant)
    @Column({ type: DataType.BIGINT, allowNull: true, field: "plant_id" })
    declare plantId: number | null

    @BelongsTo(() => Plant, { onDelete: "RESTRICT" })
    declare plant: Plant | null

    @ForeignKey(() => Carrier)
    @Column({ type: DataType.BIGINT, allowNull: true, field: "represented_carrier_id" })
    declare representedCarrierId: number | null

    @BelongsTo(() => Carrier)
    declare representedCarrier: Carrier | null

    @Column({
        type: DataType.STRING(100),
        allowNull: false
    })
    declare name: string

    @Column({
        type: DataType.STRING(40),
        allowNull: false,
        unique: true
    })
    declare username: string

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
        field: "password_hash"
    })
    declare passwordHash: string

    @ForeignKey(() => Role)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "role_id"
    })
    declare roleId: number

    @BelongsTo(() => Role)
    declare role: Role

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "failed_attempts"
    })
    declare failedAttempts: number

    @Column({
        type: DataType.DATE,
        allowNull: true,
        defaultValue: null,
        field: "locked_until"
    })
    declare lockedUntil: Date | null

    toJSON(): object {
        const values = { ...this.get() }
        delete values.passwordHash
        return values
    }
}

export default User
