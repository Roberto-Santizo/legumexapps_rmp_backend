import { Table, Column, DataType } from "sequelize-typescript"
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo"

@Table({ tableName: "plants" })
export default class Plant extends ModeloBaseCatalogo {
    @Column({ type: DataType.STRING(2), allowNull: false, unique: true, validate: { isIn: [["LP", "LT"]] } })
    declare code: "LP" | "LT"

    @Column({ type: DataType.STRING(100), allowNull: false })
    declare name: string
}
