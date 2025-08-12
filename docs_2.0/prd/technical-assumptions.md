# Technical Assumptions
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
