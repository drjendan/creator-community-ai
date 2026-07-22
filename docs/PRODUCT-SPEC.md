**Creator Community AI**

**Complete Product Specification and MVP Build Blueprint**

Prepared for Nexx Jenn Technologies

| **PRODUCT TYPE** White-label, multi-tenant SaaS | **FLAGSHIP TENANT** Healing For Your Soul | **PRIMARY DIFFERENTIATOR** AI-first creator community platform |
| --- | --- | --- |

**Working positioning: “The AI Operating System for Thought Leaders.”**

Version 1.0 | MVP and product foundation

# 1. Executive Overview

Creator Community AI is a white-label, multi-tenant software-as-a-service platform designed for podcasters, coaches, therapists, churches, authors, speakers, educators, and other thought leaders who want to bring their content, community, learning experiences, events, memberships, and AI-powered guidance into one branded digital environment.

The first demonstration and flagship tenant is Healing For Your Soul, with The Unspoken Spaces podcast as a central content experience. The product is intended to begin as a polished MVP and mature into a scalable SaaS platform operated by Nexx Jenn Technologies.

| **Area** | **Specification** |
| --- | --- |
| **Business objective** | Validate that creators and mission-driven organizations will adopt one platform for content, learning, community, events, membership, and AI-powered engagement. |
| **MVP objective** | Deliver one complete member journey and one complete tenant-administrator journey with a premium, emotionally resonant user experience. |
| **Core strategy** | Build shared platform capabilities once—authentication, tenant management, billing, branding, analytics, and AI routing—then reuse them across future Nexx Jenn products. |
| **MVP success definition** | A visitor can register, join a tenant, consume podcast and course content, participate in community, view events and resources, and use an AI Coach grounded in tenant-approved content. |

# 2. Product Vision and Positioning

## 2.1 Vision

Create an AI-first operating system that helps thought leaders transform their expertise into an organized, scalable, and deeply engaging digital community without stitching together numerous disconnected platforms.

## 2.2 Positioning statement

Creator Community AI is a premium, white-label platform that combines community, podcasts, learning, events, resources, memberships, and a creator-trained AI Coach in one multi-tenant system.

## 2.3 Target users

Podcasters and media creators

Coaches and consultants

Therapists and wellness professionals

Churches and ministry leaders

Authors and speakers

Educators and course creators

Mission-driven organizations and member communities

## 2.4 Competitive differentiation

AI trained on each creator or organization’s approved content, with source citations.

A podcast-centric experience that can become the content engine for learning, reflection, community, and marketing.

White-label multi-tenancy so one software platform can serve many branded customer organizations.

Tenant-supplied AI API keys to reduce platform-level model costs and provide provider flexibility.

An expansion path toward an AI Content Studio that repurposes one episode into many business and learning assets.

# 3. Product Principles

| **Area** | **Specification** |
| --- | --- |
| **Human first** | Technology should strengthen trust, reflection, learning, belonging, and measurable outcomes rather than replace human relationships. |
| **Premium simplicity** | The product should feel sophisticated, calm, warm, and clear—not like a generic dashboard or student project. |
| **Tenant isolation** | Every organization’s users, branding, content, AI configuration, and data must remain securely separated. |
| **Practical MVP scope** | Complete core journeys first. Delay advanced features until the product has been validated. |
| **Creator control** | Tenant owners control content, branding, access levels, AI provider, AI instructions, and approved knowledge sources. |
| **Scalable foundation** | Architecture decisions should support future tenants and modules without forcing an immediate enterprise-scale build. |

# 4. User Roles and Permissions

| **Area** | **Specification** |
| --- | --- |
| **Platform Super Admin** | Manages all tenants, platform health, tenant status, cross-platform settings, and product-level administration. |
| **Tenant Owner** | Owns a tenant account and manages branding, billing, AI configuration, administrators, memberships, and content. |
| **Tenant Admin** | Manages members, content, events, resources, community moderation, and selected tenant settings. |
| **Content Manager / Instructor** | Creates and manages podcasts, courses, lessons, resources, and events as permitted. |
| **Member** | Consumes content, participates in community, tracks learning, registers for events, saves resources, and uses the AI Coach. |

# 5. Core User Journeys

## 5.1 Member journey

Visit the public tenant website.

Review the tenant’s value proposition, featured content, community, learning, and membership options.

Register and verify an account.

Join the tenant or select a membership level.

Enter the member dashboard.

Listen to or watch a podcast episode.

Open a course and complete a lesson.

View or participate in a community discussion.

Browse resources and upcoming events.

Ask the AI Coach a question and review cited sources.

## 5.2 Tenant owner journey

Sign in to the tenant administration area.

Configure tenant name, logo, colors, fonts, and public messaging.

Invite administrators and content managers.

Add or edit podcast episodes.

Create courses, modules, and lessons.

Upload resources and add events.

Moderate community content.

Configure an AI provider and upload or select approved knowledge sources.

Define membership plans and access levels.

Review member and content activity.

## 5.3 Platform administrator journey

Create or approve a tenant.

Assign a tenant owner.

Set the tenant status to active, trial, suspended, or archived.

Review platform usage and operational health.

Support tenant setup while preserving tenant data isolation.

# 6. Information Architecture and Navigation

## 6.1 Public tenant navigation

Home

Podcast

Learning

Community preview

Resources

Events

Membership

About

Sign in / Join

## 6.2 Authenticated member navigation

Dashboard

Podcast

Learning

Community

Resources

Events

AI Coach

Membership / Account

Profile

## 6.3 Tenant administration navigation

Overview

Branding

Members

Podcast management

Courses and lessons

Community moderation

Resources

Events

AI settings

Membership plans

Analytics

Tenant settings

## 6.4 Platform administration navigation

Platform overview

Tenants

Users

Plans and entitlements

System settings

Audit and support tools

# 7. Functional Requirements

## 7.1 Public Website

Premium branded header and navigation

Editorial hero with clear primary and secondary calls to action

Featured podcast episode

Featured course or learning path

Community preview

Upcoming event

Featured resource

AI Coach introduction

Membership options

Testimonials or social proof

Footer with tenant and platform information

## 7.2 Authentication and Profile

Email and password registration

Email verification

Login and logout

Forgot-password and reset-password flows

Protected routes

Profile record creation

Role-based redirect after login

Clear validation, loading, success, and error states

No social login required for MVP

## 7.3 Member Dashboard

Personalized welcome

Continue learning

Latest podcast episode

Featured discussion

Upcoming event

Saved or featured resource

Membership status

AI Coach call to action

Learning progress

Useful empty states for new tenants or members

## 7.4 Podcast Module

Episode library and search

Episode categories or topics

Episode detail page

Audio and/or video playback

Transcript

Show notes and key takeaways

Reflection or discussion questions

Related resources

Published, draft, and access-level controls

Tenant-admin create, edit, publish, unpublish, and delete functions

## 7.5 Learning Module

Course catalog

Course detail page

Modules and lessons

Video, audio, text, and downloadable lesson content

Lesson completion

Progress percentage

Continue-learning experience

Tenant-admin course and lesson management

MVP excludes certificates and advanced assessment engines

## 7.6 Community Module

Text posts

Comments

Reactions or likes

Categories or channels

Pinned posts

Moderation controls

Member and admin views

MVP excludes direct messaging, complex groups, and real-time notifications

## 7.7 Resource Library

Resource categories

PDF and file uploads

Links and downloadable files

Search and filtering

Featured resources

Access-level control

Tenant-admin create, edit, publish, and remove functions

## 7.8 Events

Upcoming-event list

Event details

Date, time, location, and virtual link

Registration or RSVP

Replay link after the event

Member access status

Tenant-admin event management

## 7.9 Memberships

Free and paid plan definitions

Feature and content entitlements

Membership status on the member account

Stripe-ready billing architecture

Tenant-specific pricing and plan labels

MVP may use a simplified checkout or test-mode subscription flow

# 8. AI Coach Specification

## 8.1 Purpose

The AI Coach provides conversational guidance grounded in the current tenant’s approved podcasts, transcripts, lessons, resources, and selected knowledge sources. It must not present itself as a replacement for licensed, pastoral, medical, legal, or crisis support.

## 8.2 Supported providers

OpenAI

Anthropic Claude

Google Gemini

For MVP implementation, one provider may be completed first—preferably OpenAI—then the shared abstraction layer can be extended to Claude and Gemini.

## 8.3 Tenant-supplied API key model

Each tenant provides its own API key.

Keys are encrypted at rest.

Keys are never exposed to browser code or other tenants.

The platform routes requests according to the tenant’s selected provider and model.

AI usage costs are primarily borne by the tenant through its provider account.

## 8.4 AI configuration

Provider and model

Encrypted API key

System prompt

Tone and persona

Approved knowledge sources

Disclaimer text

Conversation limits or quotas

Source citation settings

Content categories excluded from use

## 8.5 Retrieval and citations

Search only the active tenant’s approved content.

Retrieve relevant excerpts from transcripts, lessons, resources, and other indexed content.

Pass retrieved context to the selected model.

Return the answer with clear source references.

Do not allow cross-tenant retrieval.

PostgreSQL full-text search is acceptable for MVP; vector search can be added later.

## 8.6 Safety and boundaries

Display a configurable disclaimer.

Avoid diagnosis, emergency guidance, or claims of professional licensure.

Provide escalation language for crisis or high-risk content.

Log operational metadata without unnecessarily storing sensitive conversation content.

Allow tenant owners to disable AI temporarily.

# 9. Tenant Branding and White-Label Requirements

Tenant name, slug, logo, favicon, and optional wordmark

Primary, secondary, accent, background, and text colors

Typography configuration within approved web-safe or hosted options

Hero imagery and public copy

Button labels and membership language

Custom email sender identity where supported

Future custom-domain support

Branding loaded dynamically from the resolved tenant

## 9.1 Visual direction for Healing For Your Soul

Premium, warm, calm, human-centered, and editorial

Wellness-oriented without appearing clinical

Sophisticated, multicultural photography

Balanced headings; avoid oversized type

Controlled spacing with strong hierarchy

Minimal excessive gradients or generic SaaS visuals

Limited rounded cards and restrained shadows

Accessible contrast and responsive layouts

# 10. Multi-Tenant Architecture

Every tenant-owned record includes tenant_id.

Tenant membership determines access and role.

Supabase Row-Level Security enforces tenant isolation.

Tenant resolution is based on a slug initially and may support domains later.

Branding, content, plans, AI configuration, and member activity are tenant-scoped.

Platform administrators use explicit elevated permissions, not ordinary tenant access.

At least two test tenants must be used to verify isolation.

# 11. Technical Architecture

| **Area** | **Specification** |
| --- | --- |
| **Frontend and application** | Next.js with TypeScript, using the App Router where practical. |
| **Styling** | Tailwind CSS with shadcn/ui or a controlled reusable component library. |
| **Backend** | Next.js server actions and API routes for MVP, avoiding unnecessary service fragmentation. |
| **Database** | Supabase PostgreSQL. |
| **Authentication** | Supabase Auth. |
| **File storage** | Supabase Storage initially; Bunny.net may be considered later for high-volume video. |
| **Payments** | Stripe. |
| **Email** | Resend. |
| **Hosting** | Netlify is the current deployment target; Vercel remains an alternative. |
| **Source control** | GitHub. |
| **Edge and DNS** | Cloudflare when a production domain is introduced. |
| **AI routing** | Provider abstraction supporting tenant-selected OpenAI, Claude, or Gemini. |

# 12. Data Model

## 12.1 Core tables

| **Area** | **Specification** |
| --- | --- |
| **tenants** | Tenant identity, slug, status, branding, and configuration. |
| **profiles** | User profile linked to authentication identity. |
| **tenant_memberships** | User-to-tenant relationship and role. |
| **podcast_episodes** | Episode metadata, media links, transcript, publication status, and access level. |
| **courses** | Course metadata and publication state. |
| **course_modules** | Ordered course sections. |
| **lessons** | Lesson content, media, order, and access level. |
| **lesson_progress** | Member completion and progress tracking. |
| **community_posts** | Tenant-scoped posts, categories, status, and pinning. |
| **community_comments** | Comments linked to posts and members. |
| **community_reactions** | Member reactions linked to posts or comments. |
| **resources** | Files, links, metadata, category, and access level. |
| **events** | Event details, registration link, replay link, and access level. |
| **event_registrations** | Member RSVP or registration records. |
| **membership_plans** | Tenant-specific membership definitions and Stripe mapping. |
| **member_subscriptions** | Member subscription status and entitlement mapping. |
| **ai_provider_settings** | Encrypted provider credentials and configuration. |
| **ai_knowledge_sources** | Approved and indexed sources for retrieval. |
| **ai_conversations** | Optional conversation metadata and member context. |
| **audit_logs** | Administrative and security-relevant activity. |

## 12.2 Common fields

id

tenant_id where applicable

created_at

updated_at

created_by where appropriate

status

published_at where appropriate

access_level

sort_order where appropriate

# 13. Security, Privacy, and Governance

Supabase Row-Level Security on every tenant-scoped table.

Server-side authorization for protected operations.

Service-role credentials never exposed to the client.

AI provider keys encrypted at rest.

Environment secrets excluded from GitHub.

Least-privilege role model.

Audit logging for tenant and platform administration.

File access rules aligned to tenant and membership entitlements.

Basic rate limiting and abuse protection for AI and public forms.

Data retention, privacy policy, terms of use, and acceptable-use policy required before production launch.

Backup and restore procedures documented before beta.

# 14. Design System Requirements

| **Area** | **Specification** |
| --- | --- |
| **Typography** | Professional, readable type scale with controlled heading sizes and strong body readability. |
| **Color** | Warm, restrained tenant palette with accessible contrast and semantic status colors. |
| **Layout** | Generous but controlled whitespace, responsive content widths, and clear page hierarchy. |
| **Buttons** | Consistent primary, secondary, text, destructive, disabled, hover, and focus states. |
| **Cards** | Use selectively; avoid turning every section into a rounded container. |
| **Forms** | Clear labels, inline guidance, validation, error messages, and touch-friendly controls. |
| **Media** | Consistent image ratios and graceful fallbacks for podcast, course, event, and resource imagery. |
| **Accessibility** | Keyboard navigation, visible focus, semantic headings, alt text, labels, and contrast compliance. |
| **Responsive behavior** | Designed and tested for desktop, tablet, and mobile. |

# 15. MVP Scope

## 15.1 Included

Public tenant website

Authentication and member profiles

Multi-tenant foundation and RLS

Healing For Your Soul seeded tenant

Member dashboard

Podcast module

Courses, modules, lessons, and progress

Simple community

Resources

Events and RSVP

AI Coach with grounded retrieval and citations

Tenant administration

Basic platform administration

Free and premium membership plan structure

Stripe-ready or test-mode subscription flow

Netlify deployment through GitHub

## 15.2 Explicitly excluded from MVP

Native mobile application

Direct messaging

Real-time notifications

Certificates

Advanced quiz engine

Affiliate program

Gamification

Creator marketplace

Advanced analytics

RSS podcast import and distribution

Full email marketing automation

AI Content Studio

Zoom integration

Complex referral systems

Enterprise SSO

# 16. MVP Acceptance Criteria

| **Area** | **Specification** |
| --- | --- |
| **Public experience** | A visitor can understand the tenant, view featured content, and reach registration or membership actions. |
| **Authentication** | A user can register, verify email, sign in, reset a password, and sign out. |
| **Tenant isolation** | Users from Tenant A cannot access Tenant B records through the UI or direct requests. |
| **Member dashboard** | The dashboard displays tenant-scoped seeded and live data with useful empty states. |
| **Podcast** | Members can browse and view episodes; admins can create and manage them. |
| **Learning** | Members can open courses, complete lessons, and see progress; admins can manage course content. |
| **Community** | Members can create or interact with posts; admins can moderate. |
| **Resources and events** | Members can browse resources and events; admins can manage both. |
| **AI Coach** | A member can ask a question, receive a tenant-grounded answer, and see cited sources. |
| **Membership** | Free and paid plan structures exist and access can be differentiated. |
| **Deployment** | The application builds successfully and deploys from GitHub to Netlify. |
| **Quality** | The experience is responsive, accessible, visually consistent, and free of critical build or runtime errors. |

# 17. Recommended Build Sequence

| **Area** | **Specification** |
| --- | --- |
| **1. Protect the prototype** | Create a full local backup and establish Git source control. |
| **2. Restore design fidelity** | Audit the current prototype against approved visual references; create a design system before adding more pages. |
| **3. Build the homepage** | Complete the public Healing For Your Soul landing page using reusable components. |
| **4. Configure Supabase** | Create the project, set environment variables, apply migrations, and verify tables. |
| **5. Implement authentication** | Registration, verification, login, password reset, logout, protected routes, and profiles. |
| **6. Implement multi-tenancy** | Tenant resolution, membership roles, branding loader, and RLS verification with two tenants. |
| **7. Build the member dashboard** | Use seeded tenant-scoped data and complete states. |
| **8. Build complete modules** | Podcast, learning, resources, events, and community—member view plus admin management for each. |
| **9. Add AI Coach** | Start with one provider, then extend the provider abstraction. |
| **10. Add membership billing** | Connect Stripe in test mode and enforce plan entitlements. |
| **11. Add tenant and platform admin** | Complete essential administration only. |
| **12. Test and deploy** | Run lint, type checks, build, database and isolation tests, then deploy through GitHub to Netlify. |

# 18. Three-Day Prototype-to-MVP Sprint

| **Area** | **Specification** |
| --- | --- |
| **Day 1** | Design restoration, shared components, public homepage, Supabase setup, authentication foundation, and tenant seed data. |
| **Day 2** | Member dashboard, podcast, learning, resources, events, and the simple community experience. |
| **Day 3** | AI Coach, tenant administration, basic membership flow, quality assurance, GitHub integration, and Netlify deployment. |

A three-day sprint can produce a strong demonstration MVP, but a production-ready beta should include additional time for security review, billing validation, content preparation, accessibility, legal policies, monitoring, backups, and user testing.

# 19. Post-MVP Roadmap

| **Area** | **Specification** |
| --- | --- |
| **Sprint 2: Production foundation** | Stripe subscriptions, production email, onboarding, security hardening, observability, backups, testing, and legal pages. |
| **30-day beta** | Healing For Your Soul live beta, real member feedback, refined content workflows, and usage analytics. |
| **60-day expansion** | Enhanced white-label onboarding, custom domains, tenant self-service, and additional pilot organizations. |
| **90-day public SaaS launch** | Formal plans, scalable onboarding, content studio features, marketing systems, and public sales launch. |

# 20. Future AI Content Studio

The strongest post-MVP differentiator is an AI Content Studio that treats a podcast episode or long-form recording as the source for an entire content and learning ecosystem.

Transcription

Blog post

Newsletter

LinkedIn article

Social-media posts

Instagram carousel copy

Workbook

Reflection guide

Discussion questions

Quiz

Course outline

Lesson drafts

AI knowledge-base update

# 21. Future Nexx Jenn Platform Vision

Creator Community AI can become one module within a broader Nexx Jenn AI Platform. Shared infrastructure could support multiple products without duplicating authentication, billing, tenant management, AI provider routing, design systems, or analytics.

CommunityOS

AgentOS

LearningOS

BusinessOS

MarketingOS

# 22. Environment and Deployment Requirements

## 22.1 Local environment variables

NEXT_PUBLIC_SUPABASE_URL=

NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

APP_ENCRYPTION_KEY=

NEXT_PUBLIC_APP_URL=

STRIPE_SECRET_KEY=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

STRIPE_WEBHOOK_SECRET=

RESEND_API_KEY=

## 22.2 Deployment workflow

Develop locally and verify with npm run dev.

Run linting, type checking, tests, and npm run build.

Commit and push changes to GitHub.

Import the GitHub repository into Netlify.

Configure environment variables in Netlify.

Set the production application URL in Supabase authentication settings.

Add required callback and redirect URLs.

Use Stripe test mode until end-to-end subscription flows are verified.

# 23. Quality Assurance Checklist

☐ No build errors

☐ No TypeScript errors

☐ No critical linting errors

☐ Authentication flows tested

☐ Password reset tested

☐ Tenant isolation tested with two tenants

☐ Role permissions tested

☐ Mobile, tablet, and desktop layouts reviewed

☐ Keyboard navigation tested

☐ Images include alt text

☐ Forms include labels and clear validation

☐ Loading, empty, success, and error states present

☐ Admin create/edit/publish flows tested

☐ AI answers cite tenant-approved sources

☐ AI cannot retrieve another tenant’s content

☐ Stripe test checkout and webhook flow tested

☐ Netlify production deploy verified

☐ Backup and rollback procedure documented

# 24. Current Prototype Status and Immediate Next Actions

A starter Next.js project has been created and adjusted for Netlify deployment. The current prototype runs locally, but the visual direction differs from the original approved concept. The immediate priority is to restore the shared design foundation before expanding functionality, so inconsistent visual patterns are not duplicated across the application.

Back up the current project folder.

Add original and current screenshots to a design-reference folder.

Run a design audit and formalize the design system.

Update the public homepage first.

Create and configure the Supabase project.

Apply database migrations.

Implement authentication.

Implement and test tenant isolation.

Build the member dashboard and complete each module one at a time.

# 25. Product Decisions Requiring Confirmation

Final public product name and domain

Final Healing For Your Soul brand palette, typography, and approved images

Initial membership plans and pricing

Whether Netlify remains the production host or Vercel is preferred

First AI provider and model

Content moderation policy

AI conversation retention policy

Legal disclaimer language for wellness, coaching, ministry, or therapeutic content

Custom-domain timeline

Whether Healing For Your Soul is a paying tenant, internal flagship, or launch partner

# 26. Definition of Done for MVP

The MVP is complete when the full visitor-to-member experience and the tenant-owner content-management experience operate in a secure, tenant-isolated, responsive, and visually consistent production deployment; the AI Coach answers from approved tenant content with citations; and the system is ready for a controlled Healing For Your Soul beta.

Nexx Jenn Technologies | Creator Community AI Product Specification  •  Page