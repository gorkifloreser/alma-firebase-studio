
-- Add user_id to funnel_presets table
ALTER TABLE public.funnel_presets
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing global presets to have NULL user_id
UPDATE public.funnel_presets SET user_id = NULL;

-- Enable RLS on funnel_presets table
ALTER TABLE public.funnel_presets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, to prevent errors on re-run
DROP POLICY IF EXISTS "Allow public read access" ON public.funnel_presets;
DROP POLICY IF EXISTS "Allow user to manage their own presets" ON public.funnel_presets;

-- Create policy for public read access to global presets
CREATE POLICY "Allow public read access"
ON public.funnel_presets
FOR SELECT
USING (user_id IS NULL);

-- Create policy for users to manage their own presets
CREATE POLICY "Allow user to manage their own presets"
ON public.funnel_presets
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
