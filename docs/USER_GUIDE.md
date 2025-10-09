# Regen MKT: The Intelligent Context Cascade

This guide explains how the Regen MKT platform uses your brand's core identity to create authentic, interdependent, and effective marketing campaigns. It's not a single, monolithic AI, but an ecosystem of specialized AI flows that pass context to each other, like an intelligent assembly line. Each step refines your marketing, building upon the previous one.

---

### **Phase 1: The Foundation (Your Brand's Soul & Tactical Libraries)**

This is where it all begins. You provide the "soul" of your brand, and the AI enriches it with personalized tactics that will be used later.

1.  **Your Role (The Brand Strategist):**
    *   **Define the `Brand Heart`:** You fill out your mission, vision, values, tone of voice, visual identity, and, crucially, your **`Audience`** profiles (buyer personas). This is your brand's fundamental truth.
    *   **(Optional) Upload `Brand Documents`:** You provide raw knowledge (PDFs, text files) for the AI to consult, giving it deeper context about your work.

2.  **AI's Action (Tactical Enrichment):**
    *   **`adapt-viral-hooks-flow`:** The AI analyzes your `Brand Heart` and the global `viral_hooks` library. It then generates and saves your brand's unique "Top 10" viral hooks, rewritten in your specific tone of voice and complete with visual ideas. These are stored in the `adapted_viral_hooks` table.
    *   **`adapt-value-strategies-flow`:** The AI repeats this process for `value_strategies`, creating and saving a personalized "Top 10" list of content methods designed to provide value to your specific audience. These are stored in the `adapted_value_strategies` table.

*   **Outcome:** The database now contains not only your brand's soul (`Brand Heart`) but also an arsenal of **personalized marketing tactics** (`adapted_hooks` and `adapted_value_strategies`) ready for the AI to use in future campaign creation.

---

### **Phase 2: The Strategic Plan (From "What" to "How")**

This is where we translate a product or service into a high-level marketing strategy.

1.  **Your Role (The Campaign Director):**
    *   You create an **`Offering`** (the "what" you want to market).
    *   You open the **"AI Strategist"** and select that `Offering`.
    *   You choose a **`Funnel Preset`** (the strategic template, or the "why").
    *   You define a clear **`Goal`** (e.g., "Get 50 signups for my webinar").

2.  **AI's Action (`generate-funnel-flow`):**
    *   The AI reads your `Brand Heart`, your `Audience` profiles, and the details of your `Offering`.
    *   Using the `Funnel Preset` as a guide, it generates a **`strategy_brief`**. This is not the final content; it's a high-level *conceptual map*. It defines the psychological stages of the customer journey (Awareness, Consideration, Conversion, etc.) and the key concepts for each stage, all written in your brand's unique `Tone of Voice`.

*   **Outcome:** A `funnels` record is saved to the database, linking your `Offering` to a detailed `strategy_brief`. This brief is now the master plan for the campaign.

---

### **Phase 3: Tactical Orchestration (From "How" to "What Content")**

This is the most complex and powerful step, where the abstract strategy becomes a concrete, actionable content plan.

1.  **Your Role (The Producer):**
    *   You open the **"Campaign Orchestrator"** for the `Funnel` you just created.
    *   You set the **campaign dates**.

2.  **AI's Action (`generate-media-plan-flow`):**
    *   **Cross-references data:** The AI now queries multiple tables to gather context:
        1.  The `strategy_brief` from your `Funnel` (the map).
        2.  Your personalized `adapted_viral_hooks` table (the best attention-grabbers).
        3.  Your personalized `adapted_value_strategies` table (the best value arguments).
        4.  Your `user_channel_settings` (the best practices for each social media channel).
    *   **Generates the Content Plan:** The AI "orchestrates" a sequence of posts. For each post (which becomes a `media_plan_item`):
        *   **For the Awareness stage:** It selects an `adapted_viral_hook` to use as the headline.
        *   **For the Consideration stage:** It selects an `adapted_value_strategy` and develops it in the body of the post.
        *   **For the Conversion stage:** It writes a clear Call-to-Action (CTA) aligned with your `Goal`.
        *   **It generates a `creative_prompt`:** It merges your `visual_identity` with the post's concept to create a detailed instruction for image or video generation.
        *   **It assigns a date and format:** It suggests a `suggested_post_at` and a `format` based on the channel's best practices.

*   **Outcome:** A complete `MediaPlan` is generated, which is a list of `media_plan_items` (content drafts) ready for your final touch in the "AI Artisan".

---

### **Phase 4: The Harvest & Re-seeding (Closing the Loop)**

The system becomes truly regenerative, turning customer success into new, authentic marketing.

1.  **Your Role (The Gardener):**
    *   You mark a sale or interaction as "Completed" in the **`Harvest Circle`**.

2.  **AI's Action (`requestTestimonial` & `createContentFromTestimonial` flows):**
    *   The system can automatically send a request for a testimonial.
    *   When you add a new `Testimonial`, you can click **"Create Content"**. The AI reads the testimonial, cross-references it with your `Brand Heart` and the related `Offering`, and generates a new social media post draft based on that authentic social proof.

*   **Outcome:** A customer's success story is automatically transformed into the starting point for a new, authentic piece of marketing, closing the loop and making your marketing self-sustaining.