import { Table, Column, DataType, BelongsToMany } from "sequelize-typescript"
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo"
import Role from "../../roles/models/Role.model"
import RolePermission from "../../rolePermissions/models/RolePermission.model"

@Table({
    tableName: "permissions"
})
class Permission extends ModeloBaseCatalogo {
    @Column({
        type: DataType.STRING(100),
        allowNull: false,
        unique: true
    })
    declare name: string

    @Column({
        type: DataType.STRING(200),
        allowNull: true
    })
    declare description: string | null

    @BelongsToMany(() => Role, () => RolePermission)
    declare roles: Role[]
}

export default Permission
