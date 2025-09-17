
-- Add the new preset_id column to funnels
alter table public.funnels
add column preset_id bigint;

-- Add the foreign key constraint to link funnels and funnel_presets
alter table public.funnels
add constraint funnels_preset_id_fkey
foreign key (preset_id)
references public.funnel_presets (id)
on delete set null;

-- Add a column to store the user-defined goal of the funnel
alter table public.funnels
add column goal text;

-- Add the new jsonb column to store the detailed strategy brief
alter table public.funnels
add column strategy_brief jsonb;

-- Drop the old, redundant funnel_type column
alter table public.funnels
drop column if exists funnel_type;

-- Add RLS policies for the funnels table if they don't exist
-- This ensures users can only see their own funnels.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable read access for own funnels' AND polrelid = 'public.funnels'::regclass) THEN
    CREATE POLICY "Enable read access for own funnels" ON public.funnels
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable insert for own funnels' AND polrelid = 'public.funnels'::regclass) THEN
    CREATE POLICY "Enable insert for own funnels" ON public.funnels
    AS PERMISSIVE FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable update for own funnels' AND polrelid = 'public.funnels'::regclass) THEN
    CREATE POLICY "Enable update for own funnels" ON public.funnels
    AS PERMISSIVE FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Enable delete for own funnels' AND polrelid = 'public.funnels'::regclass) THEN
    CREATE POLICY "Enable delete for own funnels" ON public.funnels
    AS PERMISSIVE FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END;
$$;
