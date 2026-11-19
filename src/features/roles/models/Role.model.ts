import { Table, Column, DataType, HasMany, BelongsToMany } from "sequelize-typescript"
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo"
import User from "../../users/models/User.model"
import Permission from "../../permissions/models/Permission.model"
import RolePermission from "../../rolePermissions/models/RolePermission.model"

@Table({
    tableName: "roles"
})
class Role extends ModeloBaseCatalogo {
    @Column({
        type: DataType.STRING(100),
        allowNull: false,
        unique: true
    })
    declare name: string

    @HasMany(() => User)
    declare users: User[]

    @BelongsToMany(() => Permission, () => RolePermission)
    declare permissions: Permission[]
}

export default Role
