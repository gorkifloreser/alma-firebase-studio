# Regen MKT Product Requirements Document (PRD)

## Goals and Background Context
**Goals**
*   To be the leading platform for conscious entrepreneurs seeking sustainable and aligned growth.
*   Transform marketing from an exhausting task into a joyful, natural expression of purpose.
*   Achieve high user adoption and retention within the conscious creator niche.
*   Reduce user burnout and increase their sense of brand coherence.

**Background Context**
The Regen MKT addresses a core conflict faced by conscious creators: the misalignment between their purpose-driven work and the extractive nature of traditional digital marketing. Conventional tools often force them into a "hustle culture" of pressure tactics and vanity metrics, leading to creative burnout. Regen MKT proposes a "Regenerative Marketing" model, using AI as a conscious assistant to help build magnetic, authentic brands that attract rather than pursue, allowing creators to grow their businesses without sacrificing their soul.

**Change Log**

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2025-08-10 | 1.0 | Initial PRD Draft from Project Brief | John (PM) |

## Requirements
**Functional Requirements**

*   **FR1:** Users must be able to define their brand's core essence (Module 1).
*   **FR2:** The system shall allow users to list their products and services ("Offerings") (Module 2).
*   **FR3:** The platform must generate a landing page and follow-up sequence for an "Offering" (Module 3).
*   **FR4:** The landing page must include an email capture or "Contact via WhatsApp" CTA (Module 3).
*   **FR5:** The system must create a holistic content campaign to promote all active "Offerings" across different channels (Module 4).
*   **FR6:** The system's AI must generate draft content for social media posts based on the content plan (Module 5).
*   **FR7:** Users must be able to edit, personalize, and approve AI-generated content (Module 6).
*   **FR8:** The platform shall provide a content calendar to schedule and visualize all approved content (Module 7).
*   **FR9:** The system must send automated messages to request testimonials after a sale (Module 8).
*   **FR10:** Users must be able to set a primary and optional secondary language for their brand, and all AI content generation must support both.

**Non-Functional Requirements**

*   **NFR1:** The user interface must be intuitive, polished, and sensory-coherent.
*   **NFR2:** The platform must be a responsive web application.
*   **NFR3:** All AI-generated content must maintain a high degree of authenticity.
*   **NFR4:** User data must be handled with strict privacy and security.
*   **NFR5:** The UI must provide a seamless experience for managing bilingual content.

## User Interface Design Goals
**Overall UX Vision**
The user experience must be calm, intuitive, and inspiring, making the process of marketing feel like a creative and nourishing act. The interface should be clean, spacious, and minimalist, avoiding the clutter and urgency of traditional marketing tools. It should feel like a digital sanctuary for the creator's brand.

**Key Interaction Paradigms**
*   **Emotional Design:** The interface will be designed to evoke feelings of calm, creativity, and empowerment. We will use thoughtful micro-interactions, beautiful typography, and a harmonious color palette to create a positive emotional connection.
*   **AI as a Gentle Guide:** AI interactions will be presented as suggestions and drafts, never as final commands. The user is always in the position of the "alchemist," refining and approving the AI's work.
*   **Cyclical Flow:** The UI will guide the user through the regenerative cycle (Reconexión -> Cosecha) in a clear, circular, or step-by-step manner.
*   **Visual & Tactile:** Interactions like the drag-and-drop calendar ("Cosmic Calendar") should be fluid and satisfying.

**Core Screens and Views**
*   **Brand Heart Dashboard (Módulo 1):** Central hub for the brand's soul.
*   **Offerings Catalog (Módulo 2):** Gallery-like view of offerings.
*   **Funnel Builder (Módulo 3):** Visual wizard for user journeys.
*   **Campaign Orchestrator (Módulo 4):** A strategic dashboard to create and view the holistic content plan.
*   **Content Editor (Módulo 6):** Minimalist, distraction-free editor.
*   **Cosmic Calendar (Módulo 7):** Visual drag-and-drop calendar.
*   **Harvest Dashboard (Módulo 8):** Simple dashboard for testimonial requests.

**Accessibility:** WCAG AA
**Branding:** The branding should be organic, soulful, and minimalist. I'm assuming no specific style guide exists yet, so we will aim for a clean aesthetic with natural tones and elegant typography.
**Target Device and Platforms:** Web Responsive

## Technical Assumptions
**Repository Structure: Standard Next.js App**
*   We will use a standard Next.js application structure. This simplifies the setup and is ideal for a project where the frontend and backend are tightly coupled through Supabase.

**Service Architecture: Full Supabase Stack**
*   The application will be built using a full Supabase stack. The back-end logic will be handled by Supabase Edge Functions. This approach provides a simpler development and deployment model, leveraging a fully managed backend.

**Testing Requirements: Full Testing Pyramid**
*   Our testing strategy will be comprehensive, including:
    *   **Unit Tests:** Jest and React Testing Library (RTL) for the front-end; Deno Testing for the back-end functions.
    *   **Integration Tests:** Deno Testing for testing Edge Functions.
    *   **End-to-End (E2E) Tests:** Cypress for testing critical user flows across the entire application.

**Additional Technical Assumptions and Requests**
*   **Database & Services:** We will leverage Supabase for all core services: PostgreSQL database, Authentication, Storage, and Edge Functions.
*   **CI/CD:** GitHub Actions will be used to automate our testing and deployment pipelines, including deploying Supabase functions.
*   **Monitoring & Logging:** Sentry will be used for error monitoring, and Pino for structured logging within the Edge Functions.

## Epic List
*   **Epic 1: Foundation & Brand Heart:** Establish the core project infrastructure, user authentication, and implement the "Brand Heart" (Module 1), allowing users to define their brand's soul.
*   **Epic 2: Offerings & Content Creation:** Implement the "Offerings Catalog" (Module 2) and connect it to the "Creative Studio" (Module 5) and "Artisan's Workshop" (Module 6) to enable AI-powered content generation based on the user's offerings.
*   **Epic 3: Funnels, Strategy & Scheduling:** Develop the "Magic Funnels" (Module 3) to create landing pages, the "Campaign Orchestrator" (Module 4) to build a content plan, and the "Cosmic Calendar" (Module 7) to schedule the content.
*   **Epic 4: The Harvest Circle & Legacy:** Implement the "Harvest Circle" (Module 8) to manage the post-sale experience and automate the collection of testimonials.

## Epic 1: Foundation & Brand Heart
**Epic Goal:** To establish the core project infrastructure, user authentication, and implement the "Brand Heart" (Module 1), allowing users to define their brand's soul and language preferences.

**Story 1.1: Project Scaffolding & Initial Setup**
*   **As a developer,** I want a simple Next.js application and a Supabase project set up, **so that** I have a solid foundation to build the application on.
    *   **Acceptance Criteria:**
        1.  A Next.js application is created (e.g., `npx create-next-app`).
        2.  A `supabase` directory is created at the root to hold Edge Functions and migrations.
        3.  The Supabase client is integrated into the Next.js application.
        4.  A basic CI pipeline using GitHub Actions is configured to run linting and build checks.

**Story 1.2: User Authentication**
*   **As a Conscious Creator,** I want to be able to sign up and log in to the platform, **so that** I can access my private brand workspace.
    *   **Acceptance Criteria:**
        1.  A user can sign up for a new account using an email and password via a clean, simple interface.
        2.  A user can log in with their credentials.
        3.  A user can log out.
        4.  The application has protected routes that are only accessible after a user has logged in.
        5.  Authentication is securely handled using Supabase Auth.

**Story 1.3: Bilingual Language Settings**
*   **As a Conscious Creator,** I want to set a primary and an optional secondary language for my brand, **so that** the platform can generate content in the languages my audience speaks.
    *   **Acceptance Criteria:**
        1.  Within a dedicated "Account Settings" page, the user can select a primary language from a predefined list.
        2.  The user can optionally select a secondary language from the same list.
        3.  The selected language preferences are saved to the user's profile.
        4.  The UI for language selection is clear and easy to use.

**Story 1.4: Define Brand Heart with Guided Form (Module 1)**
*   **As a Conscious Creator,** I want a guided form to input the core elements of my brand's soul, **so that** the AI has a deep understanding of my essence for all future content creation.
    *   **Acceptance Criteria:**
        1.  A dedicated "Brand Heart" page is created and is a protected route.
        2.  The page contains a form with fields for key brand elements (e.g., Mission, Vision, Values, Tone of Voice).
        3.  The user can save the form content, and it is stored in the database.
        4.  If a secondary language is configured, the form displays fields for both languages side-by-side.
        5.  For each field, an "Auto-translate" button is present. When clicked, the AI translates the content from the primary language field into the secondary language field, which the user can then edit.
        6.  The saved brand essence is displayed clearly on the page after being saved.

**Story 1.5: Define Brand Heart with Document Upload (Module 1)**
*   **As a Conscious Creator,** I want to be able to upload existing documents about my brand, **so that** the AI can analyze them to automatically understand my brand's essence.
    *   **Acceptance Criteria:**
        1.  On the "Brand Heart" page, there is an option to upload documents (e.g., PDF, DOCX).
        2.  Uploaded files are securely stored using Supabase Storage.
        3.  The user can see a list of their uploaded documents.
        4.  (MVP) The system saves a reference to these documents for future analysis; full RAG processing will be implemented in a later story.

## Epic 2: Offerings & Content Creation
**Epic Goal:** To empower the user to define their offerings and use them as a basis for AI-driven content creation, which they can then refine and approve. This epic brings Modules 2, 5, and 6 to life.

**Story 2.1: Create and View "Offerings" (Module 2)**
*   **As a Conscious Creator,** I want to add my products, services, or events to a catalog, **so that** the platform knows what I am offering to my audience.
    *   **Acceptance Criteria:**
        1.  A new "Offerings" page is created and is a protected route.
        2.  The user can create a new "Offering" by filling out a form with fields for Title, Description, and Type (e.g., Product, Service, Event).
        3.  If a secondary language is configured, the form displays fields for both languages.
        4.  An "Auto-translate" button is available to translate the Title and Description from the primary to the secondary language, with the output being editable.
        5.  All created "Offerings" are displayed in a clean, gallery-like list on the "Offerings" page.
        6.  The user can click on an "Offering" to view its details.

**Story 2.2: Add Contextual Notes to "Offerings" (Module 2)**
*   **As a Conscious Creator,** I want to add special notes to my "Offerings", **so that** the AI can understand the specific context for a marketing campaign (e.g., "pre-sale discount," "for beginners," "limited spots").
    *   **Acceptance Criteria:**
        1.  When creating or editing an "Offering", there is a dedicated field for "Contextual Notes".
        2.  The user can add free-text notes to this field.
        3.  These notes are saved and associated with the specific "Offering".
        4.  The notes are clearly visible when viewing the details of an "Offering".

**Story 2.3: Generate Content Drafts from "Offerings" (Module 5)**
*   **As a Conscious Creator,** I want to select one of my "Offerings" and have the AI generate a social media post for it, **so that** I can quickly create marketing content that is aligned with my brand.
    *   **Acceptance Criteria:**
        1.  On the detail page for a specific "Offering", there is a "Generate Content" button.
        2.  Upon clicking, the AI uses the Brand Heart (from Module 1) and the selected "Offering" details (including contextual notes) to generate a draft social media post.
        3.  If two languages are configured, the AI generates the post in both languages.
        4.  The generated draft is displayed to the user for review in a modal or a new view.

**Story 2.4: Edit and Approve Content (Module 6)**
*   **As a Conscious Creator,** I want to edit the AI-generated draft and approve it, **so that** I have final control over my message and can add my personal touch.
    *   **Acceptance Criteria:**
        1.  The generated content draft is displayed within a simple, intuitive editor ("The Artisan's Workshop").
        2.  The user can modify the text of the draft.
        3.  If bilingual, the user can easily switch between or see both language versions to edit them.
        4.  An "Approve" button saves the content and marks its status as "Approved".
        5.  Approved content is stored in the database, ready for scheduling in the next epic.

## Epic 3: Funnels, Strategy & Scheduling
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
        *   A set of custom, MUI-based React components will be created for use within the Puck editor to ensure brand consistency.

**Story 3.3: Create a Holistic, Multi-Channel Campaign (Module 4)**
*   **As a Conscious Creator,** I want the AI to create a content plan that suggests specific pieces for social media, email, and WhatsApp, **so that** I have a clear, holistic strategy for promoting my "Offerings" across all my key channels.
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

## Epic 4: The Harvest Circle & Legacy
**Epic Goal:** To complete the regenerative cycle by managing the post-sale experience and transforming customer success stories into new, authentic marketing content. This epic activates the full vision of Module 8.

**Story 4.1: Track "Offering" Delivery (Module 8)**
*   **As a Conscious Creator,** I want a simple dashboard to track the delivery status of my "Offerings", **so that** I can manage my post-sale workflow and know when to engage with my customers.
    *   **Acceptance Criteria:**
        1.  A new "Harvest Circle" page is created and is a protected route.
        2.  The page displays a list of recent sales/engagements.
        3.  Each item has a status (e.g., "To Deliver," "In Progress," "Completed").
        4.  The user can manually update the status of each item.

**Story 4.2: Automate Testimonial Requests (Module 8)**
*   **As a Conscious Creator,** I want the platform to automatically ask for a testimonial after an "Offering" is completed, **so that** I can consistently gather social proof without manual effort.
    *   **Acceptance Criteria:**
        1.  When an "Offering" is marked as "Completed" on the Harvest Circle dashboard, an automated workflow is triggered.
        2.  The system sends a pre-defined, personalized message via Email or WhatsApp asking for feedback/testimonial.
        3.  The message is based on templates that can be customized by the user in the settings.
        4.  The system waits for a configurable amount of time (e.g., 3 days) after completion before sending the request.

**Story 4.3: Central Testimonial Repository (Module 8)**
*   **As a Conscious Creator,** I want all my collected testimonials to be stored in one central place, **so that** I can easily find and reuse them in my marketing.
    *   **Acceptance Criteria:**
        1.  A "Testimonials" tab is available within the "Harvest Circle" page.
        2.  Testimonials received (initially, these will be manually copy-pasted by the user) are stored in a central repository.
        3.  Each testimonial can be tagged with the relevant "Offering".
        4.  The user can easily view, search, and filter all their testimonials.

**Story 4.4: Reseed Content with Testimonials (Module 8 to 5)**
*   **As a Conscious Creator,** I want to be able to turn a powerful testimonial into new marketing content with one click, **so that** I can "reseed" my marketing with authentic stories of transformation.
    *   **Acceptance Criteria:**
        1.  In the testimonial repository, each testimonial has a "Create Content from this" button.
        2.  Clicking this button sends the testimonial text to the "Creative Studio" (Module 5).
        3.  The AI generates a new draft social media post that features the testimonial, framed by the user's Brand Heart.
        4.  The new draft appears in the "Artisan's Workshop" (Module 6) for the user to edit and approve.
