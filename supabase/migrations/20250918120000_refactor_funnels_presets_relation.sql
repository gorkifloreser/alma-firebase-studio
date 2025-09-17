-- Step 1: Add the new preset_id column to the funnels table
ALTER TABLE public.funnels
ADD COLUMN preset_id BIGINT;

-- Step 2: Add a foreign key constraint to the new column
ALTER TABLE public.funnels
ADD CONSTRAINT funnels_preset_id_fkey
FOREIGN KEY (preset_id) REFERENCES public.funnel_presets(id)
ON DELETE SET NULL;

-- Step 3: (Optional but recommended) Populate the new preset_id column based on the old funnel_type
-- This is a best-effort update. If types don't match, it will be left NULL.
UPDATE public.funnels f
SET preset_id = fp.id
FROM public.funnel_presets fp
WHERE f.funnel_type = fp.type;

-- Step 4: Drop the old, redundant funnel_type column
ALTER TABLE public.funnels
DROP COLUMN funnel_type;
