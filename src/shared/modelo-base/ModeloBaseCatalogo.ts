import { Column, DataType, Model, PrimaryKey, AutoIncrement, Default } from "sequelize-typescript"

class ModeloBaseCatalogo extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.BIGINT
    })
    declare id: number

    @Default(true)
    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true
    })
    declare activo: boolean
}

export default ModeloBaseCatalogo
