
-- Up
ALTER TABLE public.funnels
ADD COLUMN goal TEXT,
ADD COLUMN strategy_brief JSONB;

-- Down
ALTER TABLE public.funnels
DROP COLUMN goal,
DROP COLUMN strategy_brief;
