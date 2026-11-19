import { protectCatalogHistory } from "../../raw-material-receptions/services/catalogHistory.service"
import { Op, WhereOptions } from "sequelize"
import { ErrorNoEncontrado } from "../../../shared/errores/ErrorApp"
import { paginateOrAll, PaginatedResult, PaginationParams } from "../../../shared/utils/pagination.util"
import { CreateCdpInput, UpdateCdpInput } from "../schemas/cdp.schema"
import Cdp from "../models/Cdp.model"
import Finca from "../../farms/models/Finca.model"

async function listCdps(
    pagination?: PaginationParams,
    search?: string,
    all?: boolean
): Promise<PaginatedResult<Cdp> | { data: Cdp[] }> {
    const where: WhereOptions = { activo: true, ...(search ? { name: { [Op.iLike]: `%${search}%` } } : {}) }
    return paginateOrAll(Cdp, { where, include: [Finca], order: [["name", "ASC"]] }, pagination, all)
}

async function getCdpById(id: number): Promise<Cdp> {
    const cdp = await Cdp.findOne({ where: { id, activo: true }, include: [Finca] })
    if (!cdp) throw new ErrorNoEncontrado("CDP", id)
    return cdp
}

async function createCdp(input: CreateCdpInput): Promise<Cdp> {
    const cdp = await Cdp.create(input)
    return getCdpById(cdp.id)
}

async function updateCdp(id: number, input: UpdateCdpInput): Promise<Cdp> {
    await Cdp.sequelize!.transaction(async transaction => {
        const record = await Cdp.findOne({ where: { id, activo: true }, transaction, lock: transaction.LOCK.UPDATE })
        if (!record) throw new ErrorNoEncontrado("CDP", id)
        await protectCatalogHistory("cdp", id, record, input, transaction)
        return record.update(input, { transaction })
    })
    return getCdpById(id)
}

async function deleteCdp(id: number): Promise<void> {
    const cdp = await getCdpById(id)
    await cdp.update({ activo: false })
}

export const cdpService = {
    listCdps,
    getCdpById,
    createCdp,
    updateCdp,
    deleteCdp
}
