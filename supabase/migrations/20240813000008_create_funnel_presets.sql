
CREATE TABLE public.funnel_presets (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    best_for TEXT,
    principles TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the table with the four science-based funnel models
INSERT INTO public.funnel_presets (type, title, description, best_for, principles) VALUES
(
    'Lead Magnet',
    'The Lead Magnet',
    'Offer a free resource (e.g., guide, workshop) to capture leads.',
    'Building an email list or audience.',
    'Reciprocity, Commitment'
),
(
    'Direct Offer',
    'The Direct Offer',
    'Drive immediate sales for a specific product or event.',
    'One-time purchases, event tickets, or limited-time offers.',
    'Scarcity, Social Proof'
),
(
    'Nurture & Convert',
    'The Nurture & Convert',
    'Build trust and authority with a value-driven sequence.',
    'High-ticket services, coaching, or complex products.',
    'Liking, Authority'
),
(
    'Onboarding & Habit',
    'The Onboarding & Habit',
    'Guide new users to their "aha!" moment and encourage retention.',
    'SaaS, memberships, and recurring subscription services.',
    'The Hook Model'
);
