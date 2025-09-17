
-- Create the funnel_presets table
CREATE TABLE IF NOT EXISTS public.funnel_presets (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    type TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    best_for TEXT,
    principles TEXT
);

-- Seed the table with the funnel presets
INSERT INTO public.funnel_presets (type, title, description, best_for, principles)
VALUES
    ('Lead Magnet', 'The Lead Magnet', 'Build your audience by offering value upfront.', 'Building an email list or audience.', 'Reciprocity & Commitment'),
    ('Direct Offer', 'The Direct Offer', 'Drive immediate sales with a clear, compelling offer.', 'One-time purchases, events, or products.', 'Scarcity & Social Proof'),
    ('Nurture & Convert', 'The Nurture & Convert', 'Build trust and authority before asking for the sale.', 'High-ticket services or coaching.', 'Liking & Authority'),
    ('Onboarding & Habit', 'The Onboarding & Habit', 'Guide users to their "aha!" moment and build retention.', 'SaaS, memberships, or recurring services.', 'The Hook Model'),
    ('Sustainable', 'The Sustainable Funnel', 'Facilitate a fair and balanced exchange of value.', 'Standard e-commerce and reliable services.', 'Fair Value Exchange'),
    ('Regenerative', 'The Regenerative Funnel', 'Create a net-positive impact and build deep loyalty.', 'Mission-driven brands and communities.', 'Net-Positive Value Creation')
ON CONFLICT (type) DO NOTHING;
