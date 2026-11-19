export class ErrorApp extends Error {
    constructor(
        public readonly codigoEstado: number,
        message: string
    ) {
        super(message)
        this.name = this.constructor.name
    }
}

export class ErrorNoEncontrado extends ErrorApp {
    constructor(recurso: string, id: number | string) {
        super(404, `${recurso} con id ${id} no fue encontrado`)
    }
}

export class ErrorNoAutorizado extends ErrorApp {
    constructor(mensaje: string = "Usuario o contraseña inválidos") {
        super(401, mensaje)
    }
}

export class ErrorProhibido extends ErrorApp {
    constructor(mensaje: string = "No tienes permisos para realizar esta acción") {
        super(403, mensaje)
    }
}

export class ErrorCuentaBloqueada extends ErrorApp {
    constructor(mensaje: string = "Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta nuevamente más tarde") {
        super(423, mensaje)
    }
}
