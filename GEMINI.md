# GEMINI.md - Alma App Development Standards

## 1. Core Development Philosophy

This document outlines the development, testing, and debugging standards for the Alma App. Our philosophy is rooted in a senior-level approach to engineering, emphasizing clean, scalable, and maintainable code. We adhere to the following core principles:

*   **Clarity and Simplicity:** Code should be easy to read, understand, and maintain. Avoid overly complex or "clever" solutions.
*   **Ownership and Accountability:** Take pride in your work. Every line of code should be written with the intention of creating a high-quality, robust product.
*   **Async First:** As a modern web application, all asynchronous operations must be handled gracefully using `async/await` patterns. Non-blocking code is the standard.
*   **Continuous Improvement:** We are committed to iterative improvement. Regularly refactor and enhance the codebase to maintain a high standard of quality.
*   **Reserach first:** When having a complex task be commited to make a deep research in the code base and the documentation to have the best workflow done, with production ready quality code and following the Clarity and Simplicity principle. Respect functional code by adding a comment everytime a function or workflow is functional, that way you'll know what to avoid manupulate in the future, just focusing on the current tasks.
*   **Feedback first:** As a good practice add console logs and explicit error massages for every steps of important workflows while in development mode, such as all the steps to send forms or calling APIs, so if needed, the data is easy to reach and understand. Also add a comment to all of this options, so they're changed for a user friendly feedback solution when it's in production.


## 2. Development Best Practices

### Project Structure
*   **Feature-Based Organization:** Code should be organized by features (e.g., `src/features/authentication`, `src/features/offerings`) rather than by file type. Each feature folder should contain all related components, hooks, services, and types.
*   **Co-location:** Components, their styles (if applicable), and tests should be co-located within the same feature folder to enhance modularity and portability.

### TypeScript
*   **Strict Typing:** Enforce strict typing for all props, state, hooks, and functions. Use TypeScript's `interface` or `type` to define custom types.
*   **Type Inference:** Leverage TypeScript's type inference to keep code clean and avoid redundant type definitions.
*   **Shared Types:** Define shared types in a `src/types` directory to ensure consistency across the application.

### Next.js and React
*   **App Router:** Utilize the Next.js App Router for all new features.
*   **Server Actions:** For all form submissions and data mutations, use Next.js Server Actions to ensure a seamless and secure experience.
*   **Hooks:** Encapsulate reusable logic in custom hooks (`useFeatureName`).

### Supabase Integration
*   **Centralized Configuration:** Initialize the Supabase client in a dedicated file (`src/lib/supabase/client.ts`) to ensure a single source of truth.
*   **Environment Variables:** Securely manage all Supabase project configurations (URL, anon key) using environment variables (`.env.local`).
*   **Row Level Security (RLS):** Implement robust RLS policies on your Supabase tables to protect your data from unauthorized access. Start with restrictive policies and open them up as needed.
*   **Additive Migrations and Functions:** Adhere to an additive-only mindset. 
    *   **Migrations:** Never edit a migration file after it has been applied. To make schema changes, create a *new* migration file. This ensures a linear, reproducible history.
    *   **Edge Functions:** When updating an Edge Function, deploy a new version rather than editing the existing one in place if it risks breaking changes. All migrations and functions should be organized in their respective folders within the `supabase` directory.

### Sensitive File Handling
*   **CRITICAL: Sensitive files such as `.env`, `.env.local`, or any files containing secrets MUST NEVER be deleted.**
*   Changes to these files must be **surgical**. This means you must identify the *exact* line or variable that needs to be added or updated and use a precise replacement method to change only that specific part of the file.
*   **NEVER** read an entire sensitive file, delete it, and write it back with changes. This is a high-risk operation and is forbidden.

### Tailwind CSS
*   **Utility-First:** Embrace the utility-first approach of Tailwind CSS.
*   **Theme Customization:** Define all custom colors, fonts, and spacing in the `tailwind.config.js` file to ensure brand consistency.

## 3. Testing Protocol

A rigorous testing protocol is mandatory. **No story is considered complete until it is accompanied by the appropriate tests.**

*   **Unit Testing:**
    *   **Tooling:** Jest and React Testing Library.
    *   **Scope:** Test individual components, hooks, and utility functions in isolation.
    *   **Requirement:** Every new component or function must have a corresponding unit test.
*   **Integration Testing:**
    *   **Tooling:** Firebase Emulator Suite and React Testing Library.
    *   **Scope:** Test the interaction between multiple components and their integration with Firebase services.
    *   **Requirement:** Any feature that involves data fetching or mutations must have integration tests.
*   **End-to-End (E2E) Testing:**
    *   **Tooling:** Cypress.
    *   **Scope:** Simulate real user scenarios and test complete user flows.
    *   **Requirement:** Critical user flows (e.g., authentication, creating an offering) must be covered by E2E tests.
*   **API Mocking:**
    *   Use Mock Service Worker (MSW) for mocking API requests in tests to ensure predictable results.

## 4. Surgical Debugging Protocol

When a build or test fails, a precise and methodical "surgical" debugging approach is required.

1.  **Analyze the Error:** Carefully read the full error message to understand the root cause. Do not make assumptions.
2.  **Formulate a Hypothesis:** Based on the error, form a specific, testable hypothesis about the problem.
3.  **Research:** If the error is not immediately obvious, perform a targeted web search for the specific error message or technology involved to understand common causes and solutions.
4.  **Isolate the Issue:** Create a minimal reproduction of the bug. This could be a new test case or a temporary component.
5.  **Create a Surgical Plan:** Propose a minimal, targeted plan to fix the specific error. The plan should prioritize the smallest possible change and avoid broad or unrelated modifications.
6.  **Implement and Verify:** Execute the plan and re-run all relevant tests to ensure the fix is effective and has not introduced any regressions.
7.  **Iterate:** If the fix is unsuccessful, research on the web and repeat the process with the new information gained.

### Hard Rules for Debugging
*   **NEVER** comment out or delete failing tests as a "fix."
*   **NEVER** perform large-scale refactoring while debugging. The focus is solely on the surgical fix.
*   **NEVER** override data from the .env or .env.local files, Please always verify if the files exist first, before you create or override the data inside. If you need a key, search for it in the .env.local file and copy it into the .env file, if not found, add a new line with the required variable and ask for the user to share the data.
*   **ALWAYS** write a new test that captures the bug before fixing it. This ensures the bug will not be reintroduced.
*   **ALWAYS** write code to get the best performance on the website, no actions should take more than 2 seconds.
*   If a fix is not found after three focused attempts, **HALT** and escalate with a summary of the actions taken.