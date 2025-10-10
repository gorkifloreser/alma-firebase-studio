# Epic 3: Funnels, Strategy & Scheduling
**Epic Goal:** To create a strategic bridge between the user's offerings and their audience. This epic implements the core logic for generating customer journeys (Funnels), creating a strategic content plan, and scheduling the approved content for publication. It activates Modules 3, 4, and 7.

**Story 3.1: Generate a "Magic Funnel" (Module 3)**
*   **As a Conscious Creator,** I want to select an "Offering" and generate a complete marketing funnel for it with one click, **so that** I can create a coherent customer journey without manual setup.
    *   **Acceptance Criteria:**
        1.  On the detail page for an "Offering", there is a "Generate Funnel" button.
        2.  Clicking the button triggers the AI to generate a landing page and a simple 3-step follow-up sequence (for email or WhatsApp).
        3.  The generated assets are based on the Brand Heart, the Offering details, and its contextual notes.
        4.  If bilingual, all assets (landing page copy, follow-up messages) are generated in both languages.
        5.  The user is presented with a view showing the generated landing page and the follow-up sequence.

**Story 3.2: View and Edit the Landing Page (Module 3)**
*   **As a Conscious Creator,** I want to view and edit the AI-generated landing page in a simple visual editor, **so that** I can ensure it perfectly represents my "Offering".
    *   **Acceptance Criteria:**
        1.  The generated landing page is displayed in a simple, visual drag-and-drop editor.
        2.  The user can edit the text content and reorder pre-defined content blocks (e.g., Header, Body, CTA).
        3.  The landing page includes the configured CTA (email capture form or WhatsApp button).
        4.  The user can save their changes.
        5.  A unique, shareable URL is generated for the landing page.
    *   **Technical Notes:**
        *   The visual editor will be implemented using the **Puck** open-source library.
        *   A set of custom, Tailwind CSS-styled React components will be created for use within the Puck editor to ensure brand consistency.

**Story 3.3: Create a Holistic, Multi-Channel Campaign (Module 4)**
*   **As a Conscious Creator,** I want the AI to create a content campaign that suggests specific pieces for social media, email, and WhatsApp, **so that** I have a clear, holistic strategy for promoting my "Offerings" across all my key channels.
    *   **Acceptance Criteria:**
        1.  A new "Campaign Orchestrator" page is created and is a protected route.
        2.  A "Generate Campaign" button triggers the AI to analyze all "Offerings" marked as "active".
        3.  The AI generates a list of suggested content pieces for the upcoming week, **explicitly tailored for different channels.**
        4.  The plan is displayed in a clear, organized list, grouped by channel (e.g., "Social Media," "Email," "WhatsApp").
        5.  Example plan items could be:
            *   **Social Media:** "A 3-part Instagram carousel for the 'Meditation Workshop' Offering."
            *   **Email:** "A weekly newsletter announcing the 'New Moon Circle' Offering."
            *   **WhatsApp:** "A short, personal message to the broadcast list about the 'Early Bird Discount'."
        6.  Each item in the plan can be clicked to initiate the content generation flow (Module 5), pre-configured for the specified channel and format.

**Story 3.4: Schedule Approved Content on the "Cosmic Calendar" (Module 7)**
*   **As a Conscious Creator,** I want to see all my approved content on a calendar and schedule it for publication, **so that** I can have peace of mind that my marketing is automated.
    *   **Acceptance Criteria:**
        1.  A new "Calendar" page is created and is a protected route.
        2.  All content with an "Approved" status appears in an "Unscheduled" sidebar.
        3.  The user can drag and drop content from the sidebar onto the calendar to set a publication date and time.
        4.  Once scheduled, the content's status changes to "Scheduled" and it is displayed on the calendar.
        5.  (MVP) The "publication" itself is a placeholder for now. Direct social media integration will be a future story.
