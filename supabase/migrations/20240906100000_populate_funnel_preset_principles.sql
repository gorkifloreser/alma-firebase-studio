-- supabase/migrations/20240906100000_populate_funnel_preset_principles.sql

UPDATE public.funnel_presets
SET principles = 'Combines B=MAP Model with the Reciprocity Principle. The goal is to offer immediate, tangible value upfront in exchange for contact information, creating a sense of obligation and starting a relationship on a positive note.'
WHERE type = 'Lead Magnet';

UPDATE public.funnel_presets
SET principles = 'Combines B=MAP with Scarcity and Social Proof principles. This model is designed for immediate action on a clear offer, leveraging urgency and the influence of others'' decisions to drive conversions.'
WHERE type = 'Direct Offer';

UPDATE public.funnel_presets
SET principles = 'Based on Cialdini''s Liking and Authority principles. This funnel builds trust and rapport over time through value-driven content and expert positioning before making an offer.'
WHERE type = 'Nurture & Convert';

UPDATE public.funnel_presets
SET principles = 'Directly implements Nir Eyal''s Hook Model (Trigger, Action, Variable Reward, Investment). The goal is to create a habit-forming product loop that brings users back repeatedly.'
WHERE type = 'Onboarding & Habit';

UPDATE public.funnel_presets
SET principles = 'The core principle is a fair and balanced value exchange. The funnel is transparent and reliable, designed to create a stable, transactional relationship and customer satisfaction.'
WHERE type = 'Sustainable Funnel';

UPDATE public.funnel_presets
SET principles = 'The core principle is net-positive value creation. The funnel aims to leave the customer and ecosystem better off by focusing on education, community, and mission-driven impact.'
WHERE type = 'Regenerative Funnel';
