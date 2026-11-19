import { Table, Column, Model, DataType, ForeignKey } from "sequelize-typescript"
import Role from "../../roles/models/Role.model"
import Permission from "../../permissions/models/Permission.model"

@Table({
    tableName: "role_permissions",
    timestamps: false,
    indexes: [
        { unique: true, fields: ["role_id", "permission_id"] }
    ]
})
class RolePermission extends Model {
    @ForeignKey(() => Role)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "role_id"
    })
    declare roleId: number

    @ForeignKey(() => Permission)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "permission_id"
    })
    declare permissionId: number
}

export default RolePermission
