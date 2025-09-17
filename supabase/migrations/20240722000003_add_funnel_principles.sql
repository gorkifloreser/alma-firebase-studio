
ALTER TABLE public.funnel_presets
ADD COLUMN principles TEXT;

UPDATE public.funnel_presets
SET principles = 'Focus on Reciprocity and Commitment. Offer a valuable free resource (e.g., guide, workshop) to capture leads. The funnel should emphasize the value of the freebie and make signing up extremely easy.'
WHERE type = 'Lead Magnet';

UPDATE public.funnel_presets
SET principles = 'Focus on Scarcity and Social Proof. Drive immediate sales for a product or event. Use testimonials, customer counts, and time-limited offers to increase motivation.'
WHERE type = 'Direct Offer';

UPDATE public.funnel_presets
SET principles = 'Focus on Liking and Authority. Build trust over a series of value-driven messages. Best for high-ticket services. The tone should be helpful and expert, not salesy.'
WHERE type = 'Nurture & Convert';

UPDATE public.funnel_presets
SET principles = 'Focus on the Hook Model (Trigger, Action, Variable Reward, Investment). Guide new users to their "aha!" moment and encourage retention. The content should be educational and show the product in action.'
WHERE type = 'Onboarding & Habit';

UPDATE public.funnel_presets
SET principles = 'Focus on Fair Value Exchange. The relationship is balanced and does no harm. Use clear & honest marketing, a solid product, and functional support. Best for standard e-commerce and reliable services.'
WHERE type = 'Sustainable Funnel';

UPDATE public.funnel_presets
SET principles = 'Focus on Net-Positive Value Creation. The relationship gives more than it takes. Use education, community building, and mission-driven impact. Best for mission-driven brands and communities.'
WHERE type = 'Regenerative Funnel';
