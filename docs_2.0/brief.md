# Project Brief: Regen MKT

## Executive Summary
The Regen MKT is a SaaS platform designed for conscious creators and entrepreneurs, offering a "Regenerative Marketing" ecosystem. It aims to transform marketing from an exhausting, extractive process into a joyful and authentic expression of purpose by using AI as a conscious co-creator to build magnetic, value-driven brands.

## Problem Statement
Modern creators and conscious entrepreneurs face a significant conflict between their mission to serve and the conventional, extractive marketing tools available. Traditional marketing promotes a "hustle culture" that relies on pressure tactics, constant performance, and metrics that feel disconnected from genuine value. This leads to creative burnout and a misalignment between the creator's soul and their brand's expression.

## Proposed Solution
Regen MKT provides a "Regenerative Marketing" platform that shifts the paradigm from chasing to attracting. It's an intelligent digital ecosystem that uses AI to assist creators in a way that nourishes them, their audience, and their business. The platform facilitates the creation of magnetic content, automates workflows in alignment with natural rhythms, and builds authentic connections, making marketing a natural extension of the creator's purpose.

## Target Users
**Primary User Segment: The Conscious Creator/Entrepreneur**
- **Profile:** Solopreneurs, coaches, healers, artists, and small business owners in the wellness, spirituality, and personal development spaces.
- **Behaviors:** They value authenticity, purpose-driven work, and deep connection with their audience. They are often overwhelmed by the demands of digital marketing and feel repelled by aggressive sales tactics.
- **Needs & Pains:** They need tools that align with their values, save creative energy, and automate tasks without sacrificing authenticity. Their primary pain is the burnout and dissonance caused by traditional marketing methods.

## Goals & Success Metrics
### Business Objectives
- Achieve a high user adoption and retention rate within the target niche.
- Establish Regen MKT as the leading platform for regenerative business practices.
### User Success Metrics
- Users report a significant reduction in marketing-related stress and burnout.
- Users feel their brand messaging is more aligned with their personal values.
- Users successfully publish consistent, high-quality content through the platform.
### Key Performance Indicators (KPIs)
- **Adoption Rate:** Number of new sign-ups per month.
- **Retention Rate:** Percentage of users who remain active after 3 months.
- **Content Publication Rate:** Average number of content pieces published per user per week.
- **Burnout Reduction (Survey):** Target a 40% reduction in self-reported burnout after 3 months of use.

## MVP Scope
### Core Features (Must Have)
- **Module 1: The Corazón of the Brand:** A knowledge base where users can define their brand's essence using manual input or document upload (RAG).
- **Module 2: Catalog of Ofrendas:** A simple system to list products/services with contextual notes for the AI.
- **Module 3: Funnels Mágicos (Simplified):** AI-powered generator for a single, core user journey, including a landing page (with email or WhatsApp CTA) and a basic email/WhatsApp follow-up sequence.
- **Module 5 & 6: Creative Studio & Artisan's Workshop:** AI-powered content generation for one primary format (e.g., social media posts) and a simple editor for personalization.
- **Module 7: Calendario Cósmico:** A content calendar to schedule and visualize the publication of the generated content.
- **Module 8: Círculo de Cosecha (Simplified):** Automated post-sale email/WhatsApp message to request a testimonial.
### Out of Scope for MVP
- Multi-channel funnel generation (focus on one primary flow).
- Holistic media planning (Module 4).
- Advanced content formats (video scripts, long-form articles).
- Direct social media integration for publishing (users will copy-paste).
- Full delivery management dashboard (focus on testimonial collection).

## Post-MVP Vision
### Phase 2 Features
- Introduce the **Orquestador de Medios (Module 4)** for holistic content planning.
- Expand the **Estudio Creativo (Module 5)** to support more content formats like video scripts and blog posts.
- Integrate directly with social media platforms for automated publishing.
- Develop the full **Círculo de Cosecha (Module 8)** with a central dashboard and testimonial management.
### Long-term Vision
To expand the platform into a complete operating system for conscious businesses, including tools for community management, course delivery, and financial tracking, all guided by regenerative principles.

## Technical Considerations
### Platform Requirements
- **Target Platforms:** Responsive Web Application.
- **Performance Requirements:** Fast, intuitive, and seamless user experience is critical to the "non-extractive" principle.
### Technology Preferences
- **Frontend:** Next.js, TypeScript, MUI, Zustand.
- **Backend:** Nest.js, TypeScript.
- **Database & Services:** PostgreSQL, Supabase for Storage and Auth.
- **DevOps:** Turborepo, Terraform, GitHub Actions.
### Architecture Considerations
- **Repository Structure:** Monorepo (using Turborepo).
- **Service Architecture:** A modular monolith to start, with the potential to extract services later.
- **Integration Requirements:** Need to integrate with email (e.g., Resend) and WhatsApp APIs (e.g., Twilio).

## Constraints & Assumptions
### Constraints
- The initial build will be bootstrapped, favoring technologies that are cost-effective and quick to develop with (like Supabase).
### Key Assumptions
- Users are willing to trust an AI with their core brand messaging.
- The "regenerative" approach to marketing will lead to better, more sustainable business results for our target users.
- The proposed tech stack can deliver the fluid and beautiful user experience required.

## Risks & Open Questions
### Key Risks
- **Authenticity Risk:** The AI-generated content may fail to capture the unique soul of the creator, feeling generic and undermining the core value proposition.
- **Market Adoption Risk:** The target market may be resistant to a technology-based solution, preferring more "analog" methods.
### Open Questions
- What is the most effective way to onboard users and help them build trust with the AI?
- How do we measure "regenerative" success beyond standard business KPIs?
