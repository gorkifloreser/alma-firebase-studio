-- Agrega la columna 'updated_at' a la tabla 'media_plan_items'.
-- Esta columna registrará la fecha y hora de la última modificación de un registro.
ALTER TABLE public.media_plan_items
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL;

-- Crea una función que actualiza el campo 'updated_at' a la hora actual.
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new."updated_at" = NOW();
  RETURN _new;
END;
$$ LANGUAGE plpgsql;

-- Crea un trigger que ejecuta la función anterior cada vez que se actualiza una fila en 'media_plan_items'.
CREATE TRIGGER set_media_plan_items_updated_at
BEFORE UPDATE ON public.media_plan_items
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Comentario para describir el propósito de la nueva columna en el esquema de la base de datos.
COMMENT ON COLUMN public.media_plan_items.updated_at IS 'Tracks the last modification time of the media plan item.';
