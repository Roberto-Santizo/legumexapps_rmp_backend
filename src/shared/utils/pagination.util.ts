import { FindOptions, FindAndCountOptions, Model, ModelStatic } from "sequelize"

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10

export type PaginationParams = {
    page?: number
    limit?: number
}

export type PaginatedResult<T> = {
    data: T[]
    meta: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
}

export async function paginate<T extends Model>(
    model: ModelStatic<T>,
    options: FindAndCountOptions<T>,
    pagination?: PaginationParams
): Promise<PaginatedResult<T>> {
    const page = pagination?.page && pagination.page > 0 ? pagination.page : DEFAULT_PAGE
    const limit = pagination?.limit && pagination.limit > 0 ? pagination.limit : DEFAULT_LIMIT
    const offset = (page - 1) * limit

    const { rows, count } = await model.findAndCountAll({ ...options, limit, offset })

    return {
        data: rows,
        meta: {
            total: count,
            page,
            limit,
            totalPages: Math.max(Math.ceil(count / limit), 1)
        }
    }
}

export async function paginateOrAll<T extends Model>(
    model: ModelStatic<T>,
    options: FindOptions<T>,
    pagination?: PaginationParams,
    all?: boolean
): Promise<PaginatedResult<T> | { data: T[] }> {
    if (all) {
        const rows = await model.findAll(options)
        return { data: rows }
    }
    return paginate(model, options, pagination)
}
