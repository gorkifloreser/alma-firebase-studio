-- Este script actualiza la tabla 'social_connections' para permitir almacenar múltiples
-- cuentas por proveedor (ej. múltiples páginas de Facebook) y marcar una como activa.
--
-- Cómo usar:
-- 1. Ve al "SQL Editor" en tu panel de Supabase.
-- 2. Copia y pega el siguiente código.
-- 3. Ejecútalo.
--
-- NOTA: Ejecuta estos comandos en orden. Si la tabla no existe, primero debes
-- ejecutar el script de 'create_social_connections.sql'.

-- Paso 1: Eliminar la antigua restricción UNIQUE si existe.
-- Si esta restricción no existe, este comando puede dar un error, lo cual es seguro ignorar.
ALTER TABLE public.social_connections
DROP CONSTRAINT IF EXISTS social_connections_user_id_provider_key;

-- Paso 2: Añadir la columna 'is_active' para marcar la cuenta seleccionada.
-- Se establece en 'false' por defecto para las filas existentes.
ALTER TABLE public.social_connections
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- Paso 3: Añadir una restricción única para la combinación de user_id, account_id y provider.
-- Esto previene la inserción de la misma cuenta para el mismo usuario y proveedor múltiples veces.
ALTER TABLE public.social_connections
ADD CONSTRAINT social_connections_user_id_account_id_provider_key UNIQUE (user_id, account_id, provider);

-- Paso 4: Crear un índice único parcial.
-- Esta es la regla clave que asegura que solo puede haber UNA cuenta con 'is_active = true'
-- por cada combinación de usuario y proveedor.
-- Esto previene que un usuario tenga dos páginas de Instagram activas al mismo tiempo.
CREATE UNIQUE INDEX IF NOT EXISTS one_active_connection_per_provider
ON public.social_connections (user_id, provider)
WHERE (is_active = true);
