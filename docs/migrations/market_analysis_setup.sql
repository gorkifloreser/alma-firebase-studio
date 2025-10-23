-- 📜 SCRIPT DE CONFIGURACIÓN MANUAL PARA LA TABLA market_analysis
-- Copia y pega este script completo en el Editor de SQL de tu proyecto de Supabase.

-- PASO 1: Crear la tabla `market_analysis`
-- Esta tabla almacenará los datos de análisis de mercado para cada usuario.
CREATE TABLE IF NOT EXISTS public.market_analysis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    indice_demanda_mensual integer NOT NULL DEFAULT 50,
    indice_oferta_competencia integer NOT NULL DEFAULT 50,
    tendencia_precios_promedio double precision NOT NULL DEFAULT 0,
    margen_ganancia_actual integer NOT NULL DEFAULT 25,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Añadir comentarios para mayor claridad en el esquema de la base de datos
COMMENT ON TABLE public.market_analysis IS 'Almacena datos de análisis de mercado para cada usuario.';
COMMENT ON COLUMN public.market_analysis.indice_demanda_mensual IS 'Escala de 1 a 100 que representa la demanda del mercado.';
COMMENT ON COLUMN public.market_analysis.indice_oferta_competencia IS 'Escala de 1 a 100 que representa la saturación de la competencia.';
COMMENT ON COLUMN public.market_analysis.tendencia_precios_promedio IS 'Porcentaje de cambio en los precios promedio. Ej: 5 para +5%, -2 para -2%.';
COMMENT ON COLUMN public.market_analysis.margen_ganancia_actual IS 'El margen de ganancia actual como un porcentaje. Ej: 35 para 35%.';

-- PASO 2: Habilitar la Seguridad a Nivel de Fila (RLS)
-- ¡Esto es CRUCIAL para la seguridad! Asegura que los usuarios solo puedan acceder a sus propios datos.
ALTER TABLE public.market_analysis ENABLE ROW LEVEL SECURITY;

-- PASO 3: Crear Políticas de RLS
-- Estas reglas definen quién puede hacer qué con los datos en la tabla.

-- Limpiar políticas existentes para evitar errores si se ejecuta de nuevo
DROP POLICY IF EXISTS "Allow individual read access" ON public.market_analysis;
DROP POLICY IF EXISTS "Allow individual insert access" ON public.market_analysis;
DROP POLICY IF EXISTS "Allow individual update access" ON public.market_analysis;
DROP POLICY IF EXISTS "Allow individual delete access" ON public.market_analysis;

-- Política de LECTURA: Los usuarios solo pueden leer sus propios datos.
CREATE POLICY "Allow individual read access"
ON public.market_analysis
FOR SELECT
USING (auth.uid() = user_id);

-- Política de INSERCIÓN: Los usuarios solo pueden crear un registro para sí mismos.
CREATE POLICY "Allow individual insert access"
ON public.market_analysis
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política de ACTUALIZACIÓN: Los usuarios solo pueden actualizar sus propios datos.
CREATE POLICY "Allow individual update access"
ON public.market_analysis
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política de BORRADO: Los usuarios solo pueden borrar sus propios datos.
CREATE POLICY "Allow individual delete access"
ON public.market_analysis
FOR DELETE
USING (auth.uid() = user_id);


-- PASO 4: Crear un Trigger para actualizar automáticamente 'updated_at'
-- Esta función y trigger aseguran que el campo 'updated_at' se actualice solo
-- cuando una fila cambia.

-- Crear la función
CREATE OR REPLACE FUNCTION public.handle_market_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Borrar el trigger si ya existe para evitar errores
DROP TRIGGER IF EXISTS on_market_analysis_update ON public.market_analysis;

-- Crear el trigger que llama a la función antes de cada actualización
CREATE TRIGGER on_market_analysis_update
    BEFORE UPDATE ON public.market_analysis
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_market_analysis_updated_at();

-- --- FIN DEL SCRIPT ---
-- ¡Has configurado exitosamente la tabla de análisis de mercado!
