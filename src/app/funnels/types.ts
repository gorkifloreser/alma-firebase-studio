import type { GenerateFunnelOutput } from '@/ai/flows/generate-funnel-flow';
import type { PlanItem } from '@/ai/flows/generate-media-plan-flow';

export type { PlanItem };

export type PlanItemForSave = Partial<PlanItem> & { 
    id?: string;
    status?: string;
    creative_prompt?: string;
    stage_name?: string;
};

export type UserChannelSetting = {
    id: number;
    channel_name: string;
};

export type MediaPlanItem = { 
    id: string;
    media_plan_id: string;
    user_id: string;
    offering_id: string | null;
    format: string | null;
    copy: string | null;
    hashtags: string | null;
    creative_prompt: string | null;
    suggested_post_at: string | null;
    created_at: string;
    stage_name: string | null;
    objective: string | null;
    concept: string | null;
    status: string; 
    user_channel_id: number | null;
    user_channel_settings: { channel_name: string } | null;
};

export type MediaPlan = {
    id: string;
    funnel_id: string;
    created_at: string;
    title: string;
    status: 'active' | 'archived';
    campaign_start_date: string | null;
    campaign_end_date: string | null;
    media_plan_items: MediaPlanItem[] | null;
};

export type OfferingSchedule = {
    id: string;
    event_date: string | null;
}

export type Funnel = {
    id: string;
    user_id: string;
    offering_id: string;
    name: string;
    created_at: string;
    updated_at: string;
    preset_id: number;
    goal: string | null;
    strategy_brief: GenerateFunnelOutput | null;
    offerings: {
        id: string;
        title: { primary: string | null };
        offering_schedules: OfferingSchedule[] | null;
    } | null;
    media_plans: MediaPlan[] | null;
}

export type FunnelPreset = {
    id: number;
    user_id: string | null;
    type: string;
    title: string;
    description: string;
    best_for: string;
    principles: string;
};
