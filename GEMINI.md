GEMINI.md - Regen MKT Development Standards
1. Core Development Philosophy
This document outlines the development, testing, and debugging standards for the Regen MKT. Our philosophy is rooted in a senior-level approach to engineering, emphasizing clean, scalable, and maintainable code. We adhere to the following core principles:

Clarity and Simplicity: Code should be easy to read, understand, and maintain. Avoid overly complex or "clever" solutions.

Reliable: Always add console logs for all of the process and steps of the workflows as way to offer feedback, and also give detailed error messages while working in development.

Ownership and Accountability: Take pride in your work. Every line of code should be written with the intention of creating a high-quality, robust product.

Async First: As a modern web application, all asynchronous operations must be handled gracefully using async/await patterns. Non-blocking code is the standard.

Continuous Improvement: We are committed to iterative improvement. Regularly refactor and enhance the codebase to maintain a high standard of quality.

Research First: When having a complex task be commited to make a deep research in the code base and the documentation to have the best workflow done, with production ready quality code and following the Clarity and Simplicity principle. Respect functional code by adding a comment everytime a function or workflow is functional, that way you'll know what to avoid manupulate in the future, just focusing on the current tasks.

Feedback First: As a good practice add console logs and explicit error massages for every steps of important workflows while in development mode, such as all the steps to send forms or calling APIs, so if needed, the data is easy to reach and understand. Also add a comment to all of this options, so they're changed for a user friendly feedback solution when it's in production.

Code Stabilization and Safeguarding: Once a feature or workflow is confirmed to be fully functional, it MUST be explicitly marked to prevent accidental modifications.

Use clear, standardized comments to delineate these stable code blocks:

// GEMINI_SAFE_START
... functional, tested, and approved code ...
// GEMINI_SAFE_END


CRITICAL: Any code enclosed within GEMINI_SAFE_START and GEMINI_SAFE_END comments is considered locked. You MUST NOT modify this code without explicit permission from the user. If a change is required, you must first ask for confirmation, explaining the reason for the proposed change.

2. Development Best Practices
Project Structure

Feature-Based Organization: Code should be organized by features (e.g., src/features/authentication, src/features/offerings) rather than by file type. Each feature folder should contain all related components, hooks, services, and types.

Co-location: Components, their styles (if applicable), and tests should be co-located within the same feature folder to enhance modularity and portability.

TypeScript

Strict Typing: Enforce strict typing for all props, state, hooks, and functions. Use TypeScript's interface or type to define custom types.

Type Inference: Leverage TypeScript's type inference to keep code clean and avoid redundant type definitions.

Shared Types: Define shared types in a src/types directory to ensure consistency across the application.

Next.js and React

App Router: Utilize the Next.js App Router for all new features.

Server Actions: For all form submissions and data mutations, use Next.js Server Actions to ensure a seamless and secure experience.

Hooks: Encapsulate reusable logic in custom hooks (useFeatureName).

Supabase Integration

Centralized Configuration: Initialize the Supabase client in a dedicated file (src/lib/supabase/client.ts) to ensure a single source of truth.

Environment Variables: Securely manage all Supabase project configurations (URL, anon key) using environment variables (.env.local).

Row Level Security (RLS): Implement robust RLS policies on your Supabase tables to protect your data from unauthorized access. Start with restrictive policies and open them up as needed.

Additive Migrations and Database Functions: Adhere to an additive-only mindset for all database schema and logic changes.

Migrations: Never edit a migration file after it has been applied. To make schema changes, create a new migration file. This ensures a linear, reproducible history.

Database Functions: Similarly, treat database functions (e.g., PostgreSQL functions, triggers) as immutable. To alter a function, create a new migration that drops the old one and creates the new version.

Sensitive File Handling

CRITICAL: Sensitive files such as .env, .env.local, or any files containing secrets MUST NEVER be deleted.

Changes to these files must be surgical. This means you must identify the exact line or variable that needs to be added or updated and use a precise replacement method to change only that specific part of the file.

NEVER read an entire sensitive file, delete it, and write it back with changes. This is a high-risk operation and is forbidden.

Tailwind CSS

Utility-First: Embrace the utility-first approach of Tailwind CSS.

Theme Customization: Define all custom colors, fonts, and spacing in the tailwind.config.js file to ensure brand consistency.

Commit Hygiene

Atomic Commits: After every successful and verified change (e.g., a bug fix, a feature implementation), create a Git commit. This ensures a clean history and provides a reliable rollback point if issues arise later.

3. Testing Protocol
A rigorous testing protocol is mandatory. No story is considered complete until it is accompanied by the appropriate tests.

Unit Testing:

Tooling: Jest and React Testing Library.

Scope: Test individual components, hooks, and utility functions in isolation.

Requirement: Every new component or function must have a corresponding unit test.

Integration Testing:

Tooling: Firebase Emulator Suite and React Testing Library.

Scope: Test the interaction between multiple components and their integration with Firebase services.

Requirement: Any feature that involves data fetching or mutations must have integration tests.

End-to-End (E2E) Testing:

Tooling: Cypress.

Scope: Simulate real user scenarios and test complete user flows.

Requirement: Critical user flows (e.g., authentication, creating an offering) must be covered by E2E tests.

API Mocking:

Use Mock Service Worker (MSW) for mocking API requests in tests to ensure predictable results.

4. Surgical Debugging Protocol
When a build or test fails, a precise and methodical "surgical" debugging approach is required.

Analyze the Error: Carefully read the full error message to understand the root cause. Do not make assumptions.

Formulate a Hypothesis: Based on the error, form a specific, testable hypothesis about the problem.

Research: If the error is not immediately obvious, perform a targeted web search for the specific error message or technology involved to understand common causes and solutions.

Isolate the Issue: Create a minimal reproduction of the bug. This could be a new test case or a temporary component.

Add feedback: When debugging always add step by step console logs and detailed error toast, so the developer knows what's the bug.

Create a Surgical Plan: Propose a minimal, targeted plan to fix the specific error. The plan should prioritize the smallest possible change and avoid broad or unrelated modifications.

Implement and Verify: Execute the plan and re-run all relevant tests to ensure the fix is effective and has not introduced any regressions.

Iterate: If the fix is unsuccessful, research on the web and repeat the process with the new information gained.

Hard Rules for Debugging

NEVER comment out or delete failing tests as a "fix."

NEVER perform large-scale refactoring while debugging. The focus is solely on the surgical fix.

NEVER override data from the .env or .env.local files, Please always verify if the files exist first, before you create or override the data inside. If you need a key, search for it in the .env.local file and copy it into the .env file, if not found, add a new line with the required variable and ask for the user to share the data.

ALWAYS write a new test that captures the bug before fixing it. This ensures the bug will not be reintroduced.

ALWAYS write code to get the best performance on the website, no actions should take more than 2 seconds.

If a fix is not found after three focused attempts, HALT and escalate with a summary of the actions taken.

5. Social Media & Third-Party API Integration Workflow
Authentication MUST use OAuth 2.0: The authentication flow must be server-driven. The client redirects the user to the provider, but the exchange of the temporary code for an access token (which requires a client_secret) MUST happen in a server-side Next.js API Route (e.g., /app/api/auth/callback/meta).

Tokens MUST be Stored Securely: All user-specific credentials (access tokens, refresh tokens) for third-party services must be stored in a dedicated social_connections table in Supabase. These tokens MUST be encrypted in the database before storage, preferably using pgsodium. RLS policies must ensure a user can only ever access their own connection data.

API Calls MUST be Server-Side in Next.js: Direct API calls from the Next.js client to a social media platform are strictly forbidden. All interactions (e.g., publishing a post, fetching data) MUST be encapsulated directly within Next.js Server Actions. The Server Action will retrieve the user's encrypted token from Supabase, decrypt it (if necessary), and then make the API call to the third-party service.

Frontend Invocation MUST use Server Actions: The Next.js frontend will use Server Actions to execute all backend logic. The Server Action is the final destination for the logic, handling everything from data validation to fetching tokens and calling the external API.

API Keys MUST be in Next.js Environment Variables: All platform-specific credentials (App ID, App Secret, API Key) must be stored as environment variables for the Next.js runtime. For production, these MUST be managed in the hosting provider's secret management system (e.g., Vercel Environment Variables, AWS Secrets Manager). They must never be hardcoded or exposed to the client.

Permitted API Usage for Content Publishing: The primary and explicitly permitted use of integrated social media APIs is for publishing content to the user's connected accounts.

### **Hard Server Restart (Next.js)** 🛠️

#### **When to Perform a Hard Restart:**

* After changing configuration files (e.g., `next.config.ts`, `tsconfig.json`).
* After installing, updating, or removing dependencies (`npm install`, `npm update`, `npm uninstall`).
* If the development server becomes unresponsive, unusually slow, or you suspect it's serving stale content.

***

#### **Procedure:**

1.  **Stop the Server:** Forcefully stop all Next.js development server processes.
    ```bash
    pkill -f 'next dev'
    ```

2.  **Clear Cache & Restart:** Permanently remove the `.next` cache directory and restart the server in the background.
    ```bash
    rm -rf .next && npm run dev &
    ```


## 6. Data Naming Conventions: snake_case vs. camelCase

**CRITICAL:** To prevent data-related errors, a strict separation of naming conventions must be maintained between the database/server and the client.

*   **Database & Server Actions (`snake_case`):**
    *   All database table columns **MUST** use `snake_case` (e.g., `user_id`, `landing_page_html`).
    *   Data objects returned from or passed directly into Supabase queries within server actions (`actions.ts`) **MUST** use `snake_case`.

*   **Client-Side React (`camelCase`):**
    *   All client-side variables, state, props, and object keys within React components (`.tsx` files) **MUST** use `camelCase` (e.g., `userId`, `landingPageHtml`).

---

### **The Boundary: Transformation**

The transformation from `snake_case` to `camelCase` (and vice-versa) is the responsibility of the code at the boundary between the server and client.

*   **Data to Client (Server Action -> Component):** When a server action fetches data from the database, it should return a `snake_case` object. The client component that calls the action is responsible for transforming the keys to `camelCase` before storing them in state or passing them as props.

*   **Data to Server (Component -> Server Action):** When a client component sends data to a server action (e.g., for an update or insert), it sends a `camelCase` object. The server action is then responsible for transforming the keys to `snake_case` before sending the data to the database. A utility function (like the `toSnakeCase` function in `artisan/actions.ts`) should be used for this.

**Example (Client-Side Fetching & State Update):**

```typescript
// 1. Server Action (e.g., /app/artisan/actions.ts)
// Returns data directly from Supabase, which is in snake_case.
export async function getContentItem(mediaPlanItemId: string) {
  // ... Supabase query ...
  // return data; // e.g., { id: '123', landing_page_html: '<h1>Hi</h1>', user_id: 'abc' }
}

// 2. Client Component (e.g., /app/artisan/_components/SomeEditor.tsx)
'use client';
import { useState, useEffect } from 'react';
import { getContentItem } from '../actions';

function SomeEditor({ itemId }) {
  const [creative, setCreative] = useState({ landingPageHtml: '' }); // State is camelCase

  useEffect(() => {
    const fetchContent = async () => {
      const dbData = await getContentItem(itemId); // Receives snake_case data

      // CORRECT: Transform the data before setting state
      const clientData = {
        landingPageHtml: dbData.landing_page_html // Manual or utility-based transform
      };
      setCreative(clientData);
    };

    fetchContent();
  }, [itemId]);

  // ... component JSX ...
}
```
This strict convention prevents `undefined` property errors in React and ensures data integrity with the database.