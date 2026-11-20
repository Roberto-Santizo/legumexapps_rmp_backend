import bcrypt from "bcryptjs"
import { Op, WhereOptions } from "sequelize"
import { CreateUserInput, UpdateUserInput } from "../schemas/user.schema"
import { ErrorNoEncontrado } from "../../../shared/errores/ErrorApp"
import { paginateOrAll, PaginatedResult, PaginationParams } from "../../../shared/utils/pagination.util"
import User from "../models/User.model"
import Role from "../../roles/models/Role.model"
import Plant from "../../plants/models/Plant.model"
import { requireActivePlant } from "../../plants/services/plant.service"
import Carrier from "../../transport/models/Carrier.model"
import { validateCarrierRepresentative } from "./carrierRepresentative.service"

const PASSWORD_SALT_ROUNDS = 10

async function listUsers(
    pagination?: PaginationParams,
    search?: string,
    all?: boolean
): Promise<PaginatedResult<User> | { data: User[] }> {
    const where: WhereOptions = search
        ? { [Op.or]: [{ name: { [Op.iLike]: `%${search}%` } }, { username: { [Op.iLike]: `%${search}%` } }] }
        : {}
    return paginateOrAll(
        User,
        { where, include: [Role, Plant, { model: Carrier, as: "representedCarrier", required: false }], order: [["activo", "DESC"], ["name", "ASC"]] },
        pagination,
        all
    )
}

async function getUserById(id: number): Promise<User> {
    const user = await User.findOne({ where: { id }, include: [Role, Plant, { model: Carrier, as: "representedCarrier", required: false }] })
    if (!user) throw new ErrorNoEncontrado("Usuario", id)
    return user
}

async function createUser(input: CreateUserInput): Promise<User> {
    const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS)
    const { password, ...rest } = input
    const id = await User.sequelize!.transaction(async transaction => {
        if (input.plantId != null) await requireActivePlant(input.plantId, transaction)
        await validateCarrierRepresentative(input.roleId, input.representedCarrierId ?? null, undefined, transaction)
        const user = await User.create({ ...rest, passwordHash }, { transaction })
        return user.id
    })
    return getUserById(id)
}

async function updateUser(id: number, input: UpdateUserInput): Promise<User> {
    const { password, ...rest } = input
    const data: Record<string, unknown> = { ...rest }
    if (password) {
        data.passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS)
    }
    await User.sequelize!.transaction(async transaction => {
        const user = await User.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
        if (!user) throw new ErrorNoEncontrado("Usuario", id)
        if (input.plantId != null) await requireActivePlant(input.plantId, transaction)
        const representedCarrierId = input.representedCarrierId === undefined ? user.representedCarrierId ?? null : input.representedCarrierId
        await validateCarrierRepresentative(input.roleId ?? user.roleId, representedCarrierId, id, transaction)
        await user.update(data, { transaction })
    })
    const updated = await User.findByPk(id, { include: [Role, Plant, { model: Carrier, as: "representedCarrier", required: false }] })
    if (!updated) throw new ErrorNoEncontrado("Usuario", id)
    return updated
}

async function deleteUser(id: number): Promise<void> {
    const user = await getUserById(id)
    await user.update({ activo: false })
}

async function setUserStatus(id: number, activo: boolean): Promise<User> {
    const user = await User.findOne({ where: { id }, include: [Role, Plant, { model: Carrier, as: "representedCarrier", required: false }] })
    if (!user) throw new ErrorNoEncontrado("Usuario", id)
    await user.update({ activo })
    return user
}

export const userService = {
    listUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    setUserStatus
}
