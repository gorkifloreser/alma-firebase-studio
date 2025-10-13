# Plan de Gestión de Medios en Cascada con Triggers de Supabase

Este documento detalla la estrategia para eliminar archivos huérfanos de Supabase Storage de forma automática cuando los registros en la tabla `media_plan_items` son actualizados o eliminados.

### 1. El Problema: Archivos Huérfanos

La gestión manual de archivos en el Storage desde la lógica de la aplicación presenta dos riesgos principales:

*   **En `UPDATE`**: Cuando se actualiza un campo de URL de imagen (`image_url` o `carousel_slides`), la nueva URL reemplaza a la antigua en la base de datos, pero el archivo original al que apuntaba la URL antigua permanece en el Storage, convirtiéndose en un "huérfano".
*   **En `DELETE`**: Si la lógica de la aplicación elimina un registro de la base de datos pero falla al intentar eliminar el archivo asociado del Storage (debido a un error de red, permisos, o un bug), el archivo también queda huérfano.

### 2. La Solución Propuesta: Automatización a Nivel de Base de Datos

La solución es implementar un sistema automatizado y centralizado a nivel de base de datos utilizando **Triggers y Functions de PostgreSQL**. Este enfoque garantiza que la limpieza de archivos se ejecute de manera consistente y atómica.

El flujo de trabajo es el siguiente:

```mermaid
graph TD
    subgraph "Application Logic"
        A[User updates/deletes post in Artisan/Calendar] --> B{Server Action (`updateContent` / `deleteContent`)};
    end

    subgraph "Supabase Database"
        B --> C(1. `UPDATE` or `DELETE` on `media_plan_items` table);
        C --> D{2. Trigger Fires (BEFORE operation)};
        D --> E[3. PostgreSQL Function (`handle_media_cleanup`) executes];
        E --> F{4. Function extracts old media URLs};
        F --> G[5. Function calls `storage.remove` for each old URL];
    end

    subgraph "Supabase Storage"
        G --> H[6. Orphaned files are deleted];
    end

    C --> I(7. Original `UPDATE`/`DELETE` completes);
```

### 3. Script SQL para Implementación Manual

Este script se puede ejecutar directamente en el **SQL Editor** del dashboard de Supabase para implementar la solución.

```sql
-- 📜 SCRIPT DE LIMPIEZA DE ARCHIVOS PARA LA TABLA media_plan_items
-- Este script crea una función y dos triggers para eliminar automáticamente
-- archivos de Supabase Storage cuando un registro en `media_plan_items`
-- es actualizado o eliminado, evitando así archivos huérfanos.

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
    image_path TEXT;
BEGIN
    -- Inicializar el array de rutas a eliminar
    paths_to_delete := ARRAY[]::TEXT[];

    -- 1. Extraer la ruta del campo `image_url` del registro ANTIGUO
    IF OLD.image_url IS NOT NULL THEN
        -- La función `storage.get_path_from_url` es una forma segura de extraer la ruta
        -- del archivo a partir de la URL pública.
        SELECT string_agg(path_tokens[2], '/') INTO image_path FROM (
            SELECT path_tokens FROM unnest(string_to_array(OLD.image_url, '/')) WITH ORDINALITY AS t(path_tokens, ord) WHERE ord > 6
        ) AS p;
        
        IF image_path IS NOT NULL THEN
           paths_to_delete := array_append(paths_to_delete, image_path);
        END IF;
    END IF;

    -- 2. Extraer las rutas del campo `carousel_slides` (que es JSONB)
    IF OLD.carousel_slides IS NOT NULL THEN
        -- Iterar sobre cada objeto en el array JSON de `carousel_slides`
        FOR slide IN SELECT * FROM jsonb_to_recordset(OLD.carousel_slides) AS x(imageUrl TEXT)
        LOOP
            IF slide.imageUrl IS NOT NULL THEN
                -- Extraer la ruta de la URL de cada slide
                SELECT string_agg(path_tokens[2], '/') INTO image_path FROM (
                    SELECT path_tokens FROM unnest(string_to_array(slide.imageUrl, '/')) WITH ORDINALITY AS t(path_tokens, ord) WHERE ord > 6
                ) AS p;

                IF image_path IS NOT NULL THEN
                    paths_to_delete := array_append(paths_to_delete, image_path);
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- 3. Si encontramos rutas, eliminarlas del Storage
    IF array_length(paths_to_delete, 1) > 0 THEN
        -- La función `storage.delete_objects` elimina los archivos.
        -- Es importante que el rol que ejecuta esto (postgres) tenga los permisos necesarios.
        -- Supabase lo configura por defecto.
        PERFORM storage.delete_objects(bucket_name, paths_to_delete);
    END IF;

    -- 4. Devolver el registro OLD para permitir que la operación original (DELETE/UPDATE) continúe
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------
-- PASO 2: Crear los Triggers
-- ----------------------------------------------------------------
-- Estos triggers conectan la función `handle_media_cleanup` a los eventos
-- de la tabla `media_plan_items`.

-- Trigger 1: Se ejecuta ANTES de que una fila sea ELIMINADA
CREATE TRIGGER before_delete_media_item
BEFORE DELETE ON public.media_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.handle_media_cleanup();

-- Trigger 2: Se ejecuta ANTES de que una fila sea ACTUALIZADA
-- La cláusula `WHEN` es una optimización clave: el trigger solo se dispara
-- si `image_url` o `carousel_slides` realmente han cambiado.
CREATE TRIGGER before_update_media_item
BEFORE UPDATE ON public.media_plan_items
FOR EACH ROW
WHEN (OLD.image_url IS DISTINCT FROM NEW.image_url OR OLD.carousel_slides IS DISTINCT FROM NEW.carousel_slides)
EXECUTE FUNCTION public.handle_media_cleanup();

-- ----------------------------------------------------------------
-- FIN DEL SCRIPT
-- ----------------------------------------------------------------
```

### 4. Ventajas de este Enfoque

*   **Atomicidad y Consistencia**: La limpieza ocurre dentro de la misma transacción de la base de datos. Si la operación principal falla, la limpieza de archivos tampoco se ejecuta.
*   **Centralización**: La lógica reside en un único lugar, garantizando que se aplique de manera consistente sin importar desde dónde se origine el cambio.
*   **Seguridad y Fiabilidad**: Elimina la dependencia en el código de la aplicación para realizar la limpieza, reduciendo el riesgo de errores.
*   **Eficiencia**: El trigger de `UPDATE` solo se ejecuta cuando los campos de medios relevantes han cambiado, evitando operaciones innecesarias.