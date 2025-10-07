-- Este script te permite verificar si la restricción UNIQUE necesaria existe en tu tabla social_connections.
-- Esta restricción es crucial para que la operación de upsert (insertar o actualizar) funcione correctamente.
--
-- Cómo usar:
-- 1. Ve al "SQL Editor" en tu panel de Supabase.
-- 2. Copia y pega el siguiente código.
-- 3. Ejecútalo.
--
-- Resultado esperado:
-- Si la restricción existe, verás una fila en los resultados con el nombre 'social_connections_user_id_provider_key'.
-- Si no aparece ninguna fila, significa que la restricción no se creó y debes aplicarla con el segundo comando.

-- COMANDO 1: Verificar si la restricción existe
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM
    pg_constraint
WHERE
    conrelid = 'public.social_connections'::regclass
    AND conname = 'social_connections_user_id_provider_key';

-- COMANDO 2: Si la restricción no existe, ejecuta el siguiente comando para añadirla.
-- Esto hará que la combinación de `user_id` y `provider` sea única.
-- NOTA: Descomenta la línea de abajo solo si el primer comando no devolvió resultados.
--
-- ALTER TABLE public.social_connections
-- ADD CONSTRAINT social_connections_user_id_provider_key UNIQUE (user_id, provider);