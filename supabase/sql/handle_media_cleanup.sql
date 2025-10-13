-- 📜 SCRIPT DE LIMPIEZA DE ARCHIVOS PARA LA TABLA media_plan_items (VERSIÓN 2)
-- Este script crea una función y dos triggers para eliminar automáticamente
-- archivos de Supabase Storage (imágenes, carruseles y videos) cuando un registro 
-- en `media_plan_items` es actualizado o eliminado.

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
BEGIN
    -- Inicializar el array de rutas a eliminar
    paths_to_delete := ARRAY[]::TEXT[];

    -- 1. Extraer la ruta del campo `image_url` si es una URL de Storage
    IF OLD.image_url IS NOT NULL AND OLD.image_url LIKE '%/storage/v1/object/public/%' THEN
        SELECT string_agg(path_tokens[2], '/') INTO file_path FROM (
            SELECT path_tokens FROM unnest(string_to_array(OLD.image_url, '/')) WITH ORDINALITY AS t(path_tokens, ord) WHERE ord > 6
        ) AS p;
        
        IF file_path IS NOT NULL THEN
           paths_to_delete := array_append(paths_to_delete, file_path);
        END IF;
    END IF;

    -- 2. Extraer la ruta del campo `video_url` si es una URL de Storage
    IF OLD.video_url IS NOT NULL AND OLD.video_url LIKE '%/storage/v1/object/public/%' THEN
        SELECT string_agg(path_tokens[2], '/') INTO file_path FROM (
            SELECT path_tokens FROM unnest(string_to_array(OLD.video_url, '/')) WITH ORDINALITY AS t(path_tokens, ord) WHERE ord > 6
        ) AS p;
        
        IF file_path IS NOT NULL THEN
           paths_to_delete := array_append(paths_to_delete, file_path);
        END IF;
    END IF;

    -- 3. Extraer las rutas del campo `carousel_slides` (que es JSONB)
    -- 3. Extraer las rutas del campo `carousel_slides` (que es JSONB)
    IF OLD.carousel_slides IS NOT NULL THEN
        BEGIN
            -- Este bloque intenta procesar el campo `carousel_slides`.
            -- Primero, verifica si es un array jsonb. Si no lo es, intenta convertirlo
            -- de texto a jsonb. Si alguna de estas operaciones falla, la excepción
            -- captura el error y permite que el trigger continúe sin fallar.
            FOR slide IN
                SELECT * FROM jsonb_to_recordset(
                    CASE
                        WHEN jsonb_typeof(OLD.carousel_slides) = 'array' THEN OLD.carousel_slides
                        ELSE (OLD.carousel_slides ->> 0)::jsonb -- Intenta tratarlo como un string json anidado
                    END
                ) AS x(imageUrl TEXT)
            LOOP
                -- Procesar solo si la URL del slide es una URL de Storage
                IF slide.imageUrl IS NOT NULL AND slide.imageUrl LIKE '%/storage/v1/object/public/%' THEN
                    -- Extraer la ruta de la URL de cada slide
                    SELECT string_agg(path_tokens[2], '/') INTO file_path FROM (
                        SELECT path_tokens FROM unnest(string_to_array(slide.imageUrl, '/')) WITH ORDINALITY AS t(path_tokens, ord) WHERE ord > 6
                    ) AS p;

                    IF file_path IS NOT NULL THEN
                        paths_to_delete := array_append(paths_to_delete, file_path);
                    END IF;
                END IF;
            END LOOP;
        EXCEPTION WHEN others THEN
            -- Si hay cualquier error al procesar `carousel_slides`, se ignora para
            -- no detener la operación principal de UPDATE/DELETE.
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
-- de la tabla `media_plan_items`.

-- Trigger 1: Se ejecuta ANTES de que una fila sea ELIMINADA
DROP TRIGGER IF EXISTS before_delete_media_item ON public.media_plan_items;
CREATE TRIGGER before_delete_media_item
BEFORE DELETE ON public.media_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_media_cleanup();

-- Trigger 2: Se ejecuta ANTES de que una fila sea ACTUALIZADA
-- La cláusula `WHEN` optimiza la ejecución para que solo se dispare si un campo de media relevante ha cambiado.
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

-- ----------------------------------------------------------------
-- FIN DEL SCRIPT
-- ----------------------------------------------------------------