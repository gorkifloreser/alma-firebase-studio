# Epic 1: Foundation & Brand Heart
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
