
CREATE TABLE public.adapted_value_strategies (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  original_id bigint,
  original_method text,
  relevance_score integer,
  adapted_method text,
  strategy text,
  visual_prompt text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT adapted_value_strategies_pkey PRIMARY KEY (id),
  CONSTRAINT adapted_value_strategies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT adapted_value_strategies_original_id_fkey FOREIGN KEY (original_id) REFERENCES public.value_strategies(id) ON DELETE SET NULL
);

ALTER TABLE public.adapted_value_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to own adapted value strategies"
ON public.adapted_value_strategies
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.adapted_value_strategies IS 'Stores the Top 10 value content strategies, adapted by the AI for a specific user''s brand.';
