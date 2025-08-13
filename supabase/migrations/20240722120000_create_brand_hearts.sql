
CREATE TABLE brand_hearts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_name TEXT,
    brand_brief JSONB,
    mission JSONB,
    vision JSONB,
    values JSONB,
    tone_of_voice JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE brand_hearts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own brand heart"
ON brand_hearts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand heart"
ON brand_hearts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand heart"
ON brand_hearts
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_brand_heart_updated
BEFORE UPDATE ON brand_hearts
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();
