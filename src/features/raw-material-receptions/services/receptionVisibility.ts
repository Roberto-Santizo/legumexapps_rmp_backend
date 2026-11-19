import type { TokenPayload } from "../../authentication/middleware/authenticate"

// Authentication reloads the current role from the database on every request.
export function fieldReceiptOwner(user: Pick<TokenPayload, "sub" | "roleName">): number | undefined {
    return user.roleName.trim().toLocaleLowerCase("es") === "campo" ? user.sub : undefined
}

export function representedCarrierScope(user: Pick<TokenPayload, "roleName" | "permissions" | "representedCarrierId">): number | undefined {
    return user.roleName.trim().toLocaleLowerCase("es") === "campo"
        && user.permissions?.includes("rawMaterialReceptions:manageCarrier")
        && Number.isSafeInteger(user.representedCarrierId) && Number(user.representedCarrierId) > 0
        ? user.representedCarrierId! : undefined
}
