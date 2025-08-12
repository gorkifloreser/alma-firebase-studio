# Epic 2: Offerings & Content Creation
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
