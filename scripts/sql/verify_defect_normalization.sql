-- Consultas de solo lectura para TablePlus, después de desplegar el backend.
-- La migración se ejecuta desde db:setup; este archivo únicamente verifica.

SELECT migration_id, applied_at,
       jsonb_array_length(snapshot -> 'catalog') AS catalogo_anterior,
       jsonb_array_length(snapshot -> 'associations') AS asociaciones_anteriores,
       jsonb_array_length(snapshot -> 'merges') AS asociaciones_equivalentes_consolidadas
FROM defect_normalization_backups
WHERE migration_id = 'defect_catalog_normalized_v2';

SELECT COUNT(*) AS defectos_unicos,
       COUNT(*) FILTER (WHERE activo) AS defectos_disponibles
FROM defect_catalog;

SELECT COUNT(*) AS asociaciones_actuales,
       COUNT(*) FILTER (WHERE dc.id IS NULL) AS sin_catalogo,
       COUNT(*) FILTER (WHERE pd.tolerance_percentage < 0 OR pd.tolerance_percentage > 100) AS tolerancias_invalidas
FROM product_defects pd
LEFT JOIN defect_catalog dc ON dc.id = pd.defect_catalog_id;

SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'product_defects' AND column_name = 'name'
) AS columna_nombre_duplicada;

SELECT dc.id, dc.name, dc.activo,
       COUNT(pd.id) AS productos_asociados
FROM defect_catalog dc
LEFT JOIN product_defects pd ON pd.defect_catalog_id = dc.id
GROUP BY dc.id, dc.name, dc.activo
ORDER BY dc.name;
