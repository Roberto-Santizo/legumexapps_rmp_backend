-- Ejecutar en TablePlus contra la base de datos de Render.
-- Coordinar con el despliegue del backend y frontend que utilizan baskets.name.
-- El renombrado conserva los valores, pesos, IDs y relaciones existentes.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $$
DECLARE
    has_code boolean;
    has_name boolean;
BEGIN
    IF to_regclass('public.baskets') IS NULL THEN
        RAISE EXCEPTION 'No existe public.baskets. Verifica la conexion y el esquema antes de continuar.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'baskets' AND column_name = 'code'
    ) INTO has_code;
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'baskets' AND column_name = 'name'
    ) INTO has_name;

    IF has_code AND NOT has_name THEN
        ALTER TABLE public.baskets RENAME COLUMN code TO name;
    ELSIF has_name AND NOT has_code THEN
        RAISE NOTICE 'La columna ya se llama name; no hay cambios pendientes.';
    ELSE
        RAISE EXCEPTION 'Se esperaba solo code o solo name en public.baskets. No se modifico la tabla.';
    END IF;
END;
$$;

COMMIT;

-- Verificacion del resultado.
SELECT id, name, weight FROM public.baskets ORDER BY id LIMIT 20;
