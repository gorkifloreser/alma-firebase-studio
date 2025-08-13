
-- Create the brand_hearts table
CREATE TABLE brand_hearts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    brand_name TEXT,
    brand_brief JSONB,
    mission JSONB,
    vision JSONB,
    values JSONB,
    tone_of_voice JSONB,

    -- Foreign key to the users table in the auth schema
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES auth.users(id)
        ON DELETE CASCADE,
    
    -- Ensure each user can only have one brand heart
    CONSTRAINT brand_hearts_user_id_key UNIQUE (user_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE brand_hearts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own brand heart
CREATE POLICY "Users can view their own brand heart"
ON brand_hearts
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own brand heart
CREATE POLICY "Users can create their own brand heart"
ON brand_hearts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own brand heart
CREATE POLICY "Users can update their own brand heart"
ON brand_hearts
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own brand heart
CREATE POLICY "Users can delete their own brand heart"
ON brand_hearts
FOR DELETE
USING (auth.uid() = user_id);
