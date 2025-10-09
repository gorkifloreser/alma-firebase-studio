# Regen MKT: AI Best Practices & System Architecture

This document outlines the core principles of the AI architecture, ensuring that every AI-driven action is interdependent, context-aware, and verifiable. The system is designed not as a single monolithic AI, but as an ecosystem of specialized AI flows that pass context to each other, creating an intelligent assembly line.

---

## 1. The Core Concept: The Intelligent Context Cascade

The key to the platform's intelligence is not a persistent "memory," but a "just-in-time" context-gathering process. Each AI flow is programmed to query the database for the exact information it needs for a specific task at the moment of execution. This ensures that the AI's "thinking" is always based on the most up-to-date user data.

The system is architected as a multi-phase workflow:

### **Phase 1: The Foundation (The "Soul" & Tactical Libraries)**

This is where the brand's core identity is established and enriched by the AI.

1.  **User's Role (The Strategist):**
    *   Define the **`Brand Heart`**: Mission, vision, values, tone of voice, visual identity, and **`Audience`** profiles.
    *   (Optional) Upload **`Brand Documents`**: Provide raw knowledge for the AI to consult via RAG.

2.  **AI's Action (Tactical Enrichment):**
    *   **`adapt-viral-hooks-flow`**: The AI analyzes the `Brand Heart` and the global `viral_hooks` library. It then generates and saves the brand's unique "Top 10" viral hooks, rewritten in the specific tone of voice, into the `adapted_viral_hooks` table.
    *   **`adapt-value-strategies-flow`**: The AI repeats this process for `value_strategies`, creating and saving a personalized "Top 10" list of content methods to the `adapted_value_strategies` table.

*   **Outcome:** The database contains the brand's soul (`Brand Heart`) and an arsenal of **personalized marketing tactics** (`adapted_hooks` and `adapted_value_strategies`) ready for use.

---

### **Phase 2: The Strategic Plan (From "What" to "How")**

This phase translates a product or service into a high-level marketing strategy.

1.  **User's Role (The Campaign Director):**
    *   Create an **`Offering`** (the "what").
    *   Use the **"AI Strategist"** to select that `Offering`.
    *   Choose a **`Funnel Preset`** (the strategic template).
    *   Define a clear **`Goal`**.

2.  **AI's Action (`generate-funnel-flow`):**
    *   The AI queries the database for the `Brand Heart`, `Audience`, and `Offering` details.
    *   Using the `Funnel Preset` as a guide, it generates a **`strategy_brief`**. This is a high-level *conceptual map* defining the psychological stages of the customer journey, all written in the brand's `Tone of Voice`.

*   **Outcome:** A `funnels` record is saved, linking the `Offering` to a detailed `strategy_brief`, which becomes the campaign's master plan.

---

### **Phase 3: Tactical Orchestration (From "How" to "What Content")**

This is where abstract strategy becomes a concrete, actionable content plan.

1.  **User's Role (The Producer):**
    *   Open the **"Campaign Orchestrator"** for the `Funnel`.
    *   Set the campaign dates.

2.  **AI's Action (`generate-media-plan-flow`):**
    *   **Cross-references data:** The AI queries multiple tables:
        1.  The `strategy_brief` from the `Funnel`.
        2.  The personalized `adapted_viral_hooks` table.
        3.  The personalized `adapted_value_strategies` table.
        4.  The `user_channel_settings`.
    *   **Generates the Content Plan:** The AI "orchestrates" a sequence of posts. For each post (`media_plan_item`):
        *   It selects an appropriate `adapted_viral_hook` for awareness.
        *   It selects an appropriate `adapted_value_strategy` for consideration.
        *   It generates a `creative_prompt` by merging the `visual_identity` with the post's concept.
        *   It suggests a date (`suggested_post_at`) and `format` based on channel best practices.

*   **Outcome:** A complete `MediaPlan` is generated, which is a list of `media_plan_items` (content drafts) ready for refinement in the "AI Artisan".

---

### **Phase 4: The Harvest & Re-seeding (Closing the Loop)**

The system becomes regenerative, turning customer success into new, authentic marketing.

1.  **User's Role (The Gardener):**
    *   Mark a sale as "Completed" in the **`Harvest Circle`**.

2.  **AI's Action (`requestTestimonial` & `createContentFromTestimonial` flows):**
    *   The system can automatically request a testimonial.
    *   When a new `Testimonial` is added, the user can click **"Create Content"**. The AI reads the testimonial, cross-references it with the `Brand Heart` and `Offering`, and generates a new social media post draft based on that social proof.

*   **Outcome:** A customer's success story is automatically transformed into the starting point for a new, authentic piece of marketing.

---

## 2. Verification Strategy: The "Glass Box" Approach

To ensure the AI is using the provided context correctly, a three-tiered verification strategy must be implemented.

### **Level 1: Server-Side Logging (For Developers)**

This provides the most direct, technical verification.

1.  **Log the Input:** Before every AI call, `console.log()` the complete context object being sent to the AI model. This allows developers to see exactly what "ingredients" the AI is working with.
2.  **Log the Output:** Immediately after receiving a response from the AI, `console.log()` the raw JSON output. This allows for a direct comparison between the instructions given and the content produced, helping to debug and refine prompts.

### **Level 2: In-UI Feedback (For the User)**

This makes the AI's process transparent to the end-user.

1.  **"Context Used" Summary:** In generation dialogs, display a collapsible section summarizing the key data points the AI is using for that specific task (e.g., Tone of Voice, Target Audience, Hook Selected). This gives the user insight and control.
2.  **(Optional) "Show Prompt" Button:** For advanced users or debugging, a button to reveal the final, complete prompt sent to the AI model provides ultimate transparency.

### **Level 3: Automated Unit Testing (For Long-Term Robustness)**

This creates a safety net to ensure future changes don't break the context cascade.

1.  **Mock Data:** Create tests for each AI flow that use mock `Brand Heart` and `Offering` data.
2.  **Context Assertion:** The test should run the flow and assert that the prompt sent to the (mocked) AI service contains the correct information from the mock data.
3.  **Output Assertion:** The test can simulate an AI response and verify that the code correctly processes and saves the data.

By combining these three levels of verification, we can build a high degree of confidence that the AI is consistently and accurately using the user's data to generate truly personalized and aligned marketing content.
