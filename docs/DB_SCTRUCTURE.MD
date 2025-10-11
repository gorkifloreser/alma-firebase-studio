-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

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
  CONSTRAINT adapted_value_strategies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT adapted_value_strategies_original_id_fkey FOREIGN KEY (original_id) REFERENCES public.value_strategies(id)
);
CREATE TABLE public.adapted_viral_hooks (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  original_id bigint,
  original_text text,
  category text,
  relevance_score integer,
  virality_score integer,
  adapted_hook text,
  strategy text,
  visual_prompt text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT adapted_viral_hooks_pkey PRIMARY KEY (id),
  CONSTRAINT adapted_viral_hooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT adapted_viral_hooks_original_id_fkey FOREIGN KEY (original_id) REFERENCES public.viral_hooks(id)
);
CREATE TABLE public.art_styles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  prompt_suffix text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT art_styles_pkey PRIMARY KEY (id),
  CONSTRAINT art_styles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.brand_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  content text,
  embedding USER-DEFINED,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  file_path text NOT NULL,
  document_group_id uuid,
  is_file_reference boolean NOT NULL DEFAULT false,
  keywords text,
  CONSTRAINT brand_documents_pkey PRIMARY KEY (id),
  CONSTRAINT brand_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.brand_hearts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  brand_name text,
  brand_brief jsonb,
  mission jsonb,
  vision jsonb,
  values jsonb,
  tone_of_voice jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  logo_url text,
  visual_identity jsonb DEFAULT '{}'::jsonb,
  contact_info jsonb DEFAULT '[]'::jsonb,
  audience jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT brand_hearts_pkey PRIMARY KEY (id),
  CONSTRAINT brand_hearts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.funnel_presets (
  id integer NOT NULL DEFAULT nextval('funnel_presets_id_seq'::regclass),
  type text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  best_for text,
  principles text,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT funnel_presets_pkey PRIMARY KEY (id),
  CONSTRAINT funnel_presets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.funnel_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  funnel_id uuid NOT NULL,
  user_id uuid NOT NULL,
  step_order integer NOT NULL,
  step_type text NOT NULL,
  title jsonb,
  content jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  path text UNIQUE,
  data jsonb,
  CONSTRAINT funnel_steps_pkey PRIMARY KEY (id),
  CONSTRAINT funnel_steps_funnel_id_fkey FOREIGN KEY (funnel_id) REFERENCES public.funnels(id),
  CONSTRAINT funnel_steps_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.funnels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  offering_id uuid NOT NULL,
  name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  preset_id bigint,
  goal text,
  strategy_brief jsonb,
  media_plan_id uuid UNIQUE,
  CONSTRAINT funnels_pkey PRIMARY KEY (id),
  CONSTRAINT funnels_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT funnels_offering_id_fkey FOREIGN KEY (offering_id) REFERENCES public.offerings(id),
  CONSTRAINT funnels_preset_id_fkey FOREIGN KEY (preset_id) REFERENCES public.funnel_presets(id),
  CONSTRAINT fk_media_plan FOREIGN KEY (media_plan_id) REFERENCES public.media_plans(id)
);
CREATE TABLE public.media_plan_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  media_plan_id uuid NOT NULL,
  user_id uuid NOT NULL,
  offering_id uuid,
  format text,
  copy text,
  hashtags text,
  creative_prompt text,
  suggested_post_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  stage_name text,
  objective text,
  concept text,
  status USER-DEFINED NOT NULL DEFAULT 'draft'::media_plan_item_status,
  user_channel_id bigint,
  content_body jsonb,
  scheduled_at timestamp with time zone,
  published_at timestamp with time zone,
  image_url text,
  video_url text,
  video_script text,
  carousel_slides jsonb,
  carousel_slides_text text,
  landing_page_html text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  media_format text,
  aspect_ratio text,
  CONSTRAINT media_plan_items_pkey PRIMARY KEY (id),
  CONSTRAINT media_plan_items_media_plan_id_fkey FOREIGN KEY (media_plan_id) REFERENCES public.media_plans(id),
  CONSTRAINT media_plan_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT media_plan_items_offering_id_fkey FOREIGN KEY (offering_id) REFERENCES public.offerings(id),
  CONSTRAINT media_plan_items_user_channel_id_fkey FOREIGN KEY (user_channel_id) REFERENCES public.user_channel_settings(id)
);
CREATE TABLE public.media_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  funnel_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  campaign_start_date timestamp with time zone,
  campaign_end_date timestamp with time zone,
  CONSTRAINT media_plans_pkey PRIMARY KEY (id),
  CONSTRAINT media_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT media_plans_funnel_id_fkey FOREIGN KEY (funnel_id) REFERENCES public.funnels(id)
);
CREATE TABLE public.offering_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  offering_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL,
  user_id uuid NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT offering_media_pkey PRIMARY KEY (id),
  CONSTRAINT offering_media_offering_id_fkey FOREIGN KEY (offering_id) REFERENCES public.offerings(id),
  CONSTRAINT offering_media_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.offering_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL,
  user_id uuid NOT NULL,
  event_date timestamp with time zone,
  duration text,
  frequency text,
  location_label text,
  location_address text,
  location_gmaps_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  prices jsonb NOT NULL DEFAULT '[]'::jsonb,
  CONSTRAINT offering_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT offering_schedules_offering_id_fkey FOREIGN KEY (offering_id) REFERENCES public.offerings(id),
  CONSTRAINT offering_schedules_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.offerings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title jsonb NOT NULL,
  description jsonb NOT NULL,
  type USER-DEFINED NOT NULL,
  contextual_notes text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT offerings_pkey PRIMARY KEY (id),
  CONSTRAINT offerings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  updated_at timestamp with time zone,
  full_name text,
  avatar_url text,
  website text,
  primary_language text NOT NULL DEFAULT 'en'::text CHECK (primary_language <> ''::text),
  secondary_language text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.social_connections (
  id bigint NOT NULL DEFAULT nextval('social_connections_id_seq'::regclass),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamp with time zone,
  account_id text,
  account_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT false,
  instagram_account_id text,
  account_picture_url text,
  CONSTRAINT social_connections_pkey PRIMARY KEY (id),
  CONSTRAINT social_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.testimonials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  offering_id uuid NOT NULL,
  customer_name text NOT NULL,
  testimonial_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT testimonials_pkey PRIMARY KEY (id),
  CONSTRAINT testimonials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT testimonials_offering_id_fkey FOREIGN KEY (offering_id) REFERENCES public.offerings(id)
);
CREATE TABLE public.user_channel_settings (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  channel_name text NOT NULL,
  best_practices text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_channel_id bigint,
  connections jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT user_channel_settings_pkey PRIMARY KEY (id),
  CONSTRAINT user_channel_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_channel_settings_user_channel_id_fkey FOREIGN KEY (user_channel_id) REFERENCES public.user_channels(id)
);
CREATE TABLE public.user_channels (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  channel_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_channels_pkey PRIMARY KEY (id),
  CONSTRAINT user_channels_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.value_strategies (
  id bigint NOT NULL DEFAULT nextval('value_strategies_id_seq'::regclass),
  virality_axis text NOT NULL,
  content_method text NOT NULL,
  value_purpose text NOT NULL,
  practical_example text NOT NULL,
  CONSTRAINT value_strategies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.viral_hooks (
  id bigint NOT NULL DEFAULT nextval('viral_hooks_id_seq'::regclass),
  user_id uuid,
  category text NOT NULL,
  hook_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT viral_hooks_pkey PRIMARY KEY (id),
  CONSTRAINT viral_hooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);