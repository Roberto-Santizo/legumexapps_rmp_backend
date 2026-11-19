import { Table, Column, DataType, Default, ForeignKey, BelongsTo } from "sequelize-typescript";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import RmReception from "./RmReception.model";
import Basket from "../../baskets/models/Basket.model";
import User from "../../users/models/User.model";

@Table({
    tableName: "prod_data_receptions"
})
class ProdDataReception extends ModeloBaseCatalogo {
    @ForeignKey(() => RmReception)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "rm_reception_id"
    })
    declare rmReceptionId: number

    // La canasta de planta puede diferir de la usada en campo.
    @ForeignKey(() => Basket)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "basket_id"
    })
    declare basketId: number

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        field: "total_baskets"
    })
    declare totalBaskets: number

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        field: "weight_baskets"
    })
    declare weightBaskets: number

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        field: "gross_weight"
    })
    declare grossWeight: number

    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        field: "net_weight"
    })
    declare netWeight: number

    @Default(null)
    @Column({
        type: DataType.DOUBLE,
        allowNull: true,
        field: "quality_percentage"
    })
    declare qualityPercentage: number | null

    @Default(null)
    @Column({
        type: DataType.DOUBLE,
        allowNull: true,
        field: "valid_pounds"
    })
    declare validPounds: number | null

    @Column({
        type: DataType.TEXT,
        allowNull: false,
        field: "receptor_signature"
    })
    declare receptorSignature: string

    @ForeignKey(() => User)
    @Column({ type: DataType.BIGINT, allowNull: true, field: "receptor_user_id" })
    declare receptorUserId: number | null

    @Column({ type: DataType.STRING(255), allowNull: true, field: "receptor_name" })
    declare receptorName: string | null

    @BelongsTo(() => RmReception)
    declare rmReception: RmReception

    @BelongsTo(() => Basket)
    declare basket: Basket

    @BelongsTo(() => User, { foreignKey: "receptorUserId", onDelete: "SET NULL", onUpdate: "CASCADE" })
    declare receptor: User
}

export default ProdDataReception;
