-- 📜 SCRIPT DE LIMPIEZA DE ARCHIVOS PARA LA TABLA media_plan_items (VERSIÓN 3 - ROBUSTA)
-- Este script crea una función y dos triggers para eliminar automáticamente
-- archivos de Supabase Storage (imágenes, carruseles y videos) cuando un registro 
-- en `media_plan_items` es actualizado o eliminado.
-- Esta versión es más robusta y segura.

-- ----------------------------------------------------------------
-- PASO 1: Crear la Función de Limpieza
-- ----------------------------------------------------------------
-- Esta función se encarga de la lógica de extracción y eliminación de archivos.
-- Es reutilizable y se llamará desde los triggers.

CREATE OR REPLACE FUNCTION public.handle_media_cleanup()
RETURNS TRIGGER AS $$
DECLARE
    paths_to_delete TEXT[];
    bucket_name TEXT := 'Alma'; -- ⚠️ ¡Verifica que este sea el nombre de tu bucket!
    slide RECORD;
    file_path TEXT;
    storage_url_prefix TEXT;
BEGIN
    -- Construir el prefijo de la URL de storage para identificar los archivos correctamente
    storage_url_prefix := '%/storage/v1/object/public/' || bucket_name || '/%';

    -- Inicializar el array de rutas a eliminar
    paths_to_delete := ARRAY[]::TEXT[];

    -- 1. Extraer la ruta del campo `image_url` si es una URL de Storage
    IF OLD.image_url IS NOT NULL AND OLD.image_url LIKE storage_url_prefix THEN
        -- Extrae la ruta del archivo después del nombre del bucket.
        file_path := substring(OLD.image_url from '/storage/v1/object/public/' || bucket_name || '/(.*)');
        IF file_path IS NOT NULL THEN
           paths_to_delete := array_append(paths_to_delete, file_path);
        END IF;
    END IF;

    -- 2. Extraer la ruta del campo `video_url` si es una URL de Storage
    IF OLD.video_url IS NOT NULL AND OLD.video_url LIKE storage_url_prefix THEN
        file_path := substring(OLD.video_url from '/storage/v1/object/public/' || bucket_name || '/(.*)');
        IF file_path IS NOT NULL THEN
           paths_to_delete := array_append(paths_to_delete, file_path);
        END IF;
    END IF;

    -- 3. Extraer las rutas del campo `carousel_slides` (que es JSONB)
    IF OLD.carousel_slides IS NOT NULL THEN
        -- Usamos un bloque BEGIN...EXCEPTION para evitar que un JSON malformado
        -- detenga toda la transacción de la base de datos (UPDATE o DELETE).
        BEGIN
            -- Iterar sobre cada objeto en el array JSON de `carousel_slides`
            FOR slide IN SELECT * FROM jsonb_to_recordset(OLD.carousel_slides) AS x(imageUrl TEXT)
            LOOP
                -- Procesar solo si la URL del slide es una URL de Storage
                IF slide.imageUrl IS NOT NULL AND slide.imageUrl LIKE storage_url_prefix THEN
                    file_path := substring(slide.imageUrl from '/storage/v1/object/public/' || bucket_name || '/(.*)');
                    IF file_path IS NOT NULL THEN
                        paths_to_delete := array_append(paths_to_delete, file_path);
                    END IF;
                END IF;
            END LOOP;
        EXCEPTION WHEN others THEN
            -- Si hay cualquier error al procesar `carousel_slides` (ej. JSON inválido),
            -- se registra un aviso y se continúa, para no bloquear la operación principal.
            RAISE WARNING 'Error procesando carousel_slides para limpieza. ID de fila: %. Error: %', OLD.id, SQLERRM;
        END;
    END IF;

    -- 4. Si encontramos rutas, eliminarlas del Storage
    IF array_length(paths_to_delete, 1) > 0 THEN
        -- La función `storage.delete_objects` elimina los archivos.
        PERFORM storage.delete_objects(bucket_name, paths_to_delete);
    END IF;

    -- 5. Devolver el registro OLD para permitir que la operación original (DELETE/UPDATE) continúe
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- PASO 2: Crear o Reemplazar los Triggers
-- ----------------------------------------------------------------
-- Estos triggers conectan la función `handle_media_cleanup` a los eventos
-- de la tabla `media_plan_items`. Usamos DROP/CREATE para asegurar que
-- siempre tengamos la última versión del trigger.

-- Trigger 1: Se ejecuta ANTES de que una fila sea ELIMINADA
DROP TRIGGER IF EXISTS before_delete_media_item ON public.media_plan_items;
CREATE TRIGGER before_delete_media_item
BEFORE DELETE ON public.media_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_media_cleanup();

-- Trigger 2: Se ejecuta ANTES de que una fila sea ACTUALIZADA
DROP TRIGGER IF EXISTS before_update_media_item ON public.media_plan_items;
CREATE TRIGGER before_update_media_item
BEFORE UPDATE ON public.media_plan_items
FOR EACH ROW
WHEN (
    OLD.image_url IS DISTINCT FROM NEW.image_url OR
    OLD.carousel_slides IS DISTINCT FROM NEW.carousel_slides OR
    OLD.video_url IS DISTINCT FROM NEW.video_url
)
EXECUTE FUNCTION public.handle_media_cleanup();
