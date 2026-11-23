import { Table, Column, DataType, Default, ForeignKey, BelongsTo } from "sequelize-typescript";
import ModeloBaseCatalogo from "../../../shared/modelo-base/ModeloBaseCatalogo";
import RmReception from "./RmReception.model";
import Product from "../../products/models/Product.model";
import Basket from "../../baskets/models/Basket.model";
import Producer from "../../producers/models/Producer.model";
import Cdp from "../../cdps/models/Cdp.model";
import Plate from "../../transport/models/Plate.model";
import Carrier from "../../transport/models/Carrier.model";

@Table({
    tableName: "field_data_receptions"
})
class FieldDataReception extends ModeloBaseCatalogo {
    @Default(false)
    @Column({ type: DataType.BOOLEAN, allowNull: false, field: "quality_defined_in_plant" })
    declare qualityDefinedInPlant: boolean

    @ForeignKey(() => RmReception)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "rm_reception_id"
    })
    declare rmReceptionId: number

    @ForeignKey(() => Product)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "product_id"
    })
    declare productId: number

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
        field: "inspector_name"
    })
    declare inspectorName: string

    @Column({
        type: DataType.DOUBLE,
        allowNull: false
    })
    declare weight: number

    @ForeignKey(() => Basket)
    @Column({
        type: DataType.BIGINT,
        allowNull: true,
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

    @Default(0)
    @Column({
        type: DataType.DOUBLE,
        allowNull: false,
        field: "net_weight"
    })
    declare netWeight: number

    @Column({
        type: DataType.DOUBLE,
        allowNull: true,
        field: "quality_percentage"
    })
    declare qualityPercentage: number | null

    @Column({
        type: DataType.DOUBLE,
        allowNull: true,
        field: "valid_pounds"
    })
    declare validPounds: number | null

    @Column({
        type: DataType.TEXT,
        allowNull: false,
        field: "inspector_signature"
    })
    declare inspectorSignature: string

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        field: "prod_signature"
    })
    declare prodSignature: string | null

    @ForeignKey(() => Producer)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "producer_id"
    })
    declare producerId: number

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        field: "driver_signature"
    })
    declare driverSignature: string | null

    @ForeignKey(() => Cdp)
    @Column({
        type: DataType.BIGINT,
        allowNull: true,
        field: "cdp_id"
    })
    declare cdpId: number | null

    @ForeignKey(() => Plate)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "plate_id"
    })
    declare plateId: number

    @ForeignKey(() => Carrier)
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
        field: "carrier_id"
    })
    declare carrierId: number

    @Column({
        type: DataType.STRING(255),
        allowNull: false,
        field: "pilot_name"
    })
    declare pilotName: string

    @BelongsTo(() => RmReception)
    declare rmReception: RmReception

    @BelongsTo(() => Product)
    declare product: Product

    @BelongsTo(() => Basket)
    declare basket: Basket

    @BelongsTo(() => Producer)
    declare producer: Producer

    @BelongsTo(() => Cdp)
    declare cdp: Cdp

    @BelongsTo(() => Plate)
    declare plate: Plate

    @BelongsTo(() => Carrier)
    declare carrier: Carrier
}

export default FieldDataReception;
