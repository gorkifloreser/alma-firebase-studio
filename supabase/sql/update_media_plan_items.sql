-- Añade la columna 'updated_at' a la tabla 'media_plan_items'
-- y configura un trigger para que se actualice automáticamente.

-- Paso 1: Añadir la columna con un valor por defecto.
ALTER TABLE public.media_plan_items
ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Paso 2: Crear una función que actualizará el timestamp.
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Paso 3: Crear el trigger que ejecutará la función antes de cada actualización.
CREATE TRIGGER set_media_plan_items_updated_at
BEFORE UPDATE ON public.media_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Comentario para documentar el cambio en la base de datos.
COMMENT ON TRIGGER set_media_plan_items_updated_at ON public.media_plan_items
IS 'trigger to set value of column "updated_at" to current timestamp on row update';
