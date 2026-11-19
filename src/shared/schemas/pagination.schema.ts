import z from "zod"

export const paginationQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    all: z.enum(["true", "false"]).transform(value => value === "true").optional(),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>
