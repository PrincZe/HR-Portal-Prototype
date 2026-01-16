# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HR Portal Prototype for Singapore Public Service Division. A Next.js 16 application with Supabase backend demonstrating role-based access control for 7 user tiers (System Admin → HR Officer), document management (circulars, resources, HRL meetings), and account workflows.

## Development Commands

```bash
npm run dev      # Start development server on localhost:3000
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server
```

## Environment Setup

Required `.env.local` variables:
```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  # For admin operations
```

## Architecture

### Route Groups
- `app/(auth)/` - Authentication routes (login, pending-approval, unauthorized, auth callback)
- `app/(dashboard)/` - Protected routes requiring active user status

### Auth Flow
1. Middleware (`middleware.ts` + `lib/supabase/middleware.ts`) handles session refresh and route protection
2. `lib/auth.ts` provides `getCurrentUser()`, `requireAuth()`, `requireRole()` for page-level auth
3. Users with status !== 'active' are redirected to pending-approval or unauthorized

### Role Hierarchy
Defined in `lib/roles.ts`. Lower tier = higher access:
- Tier 1: system_admin (full access)
- Tier 2: portal_admin
- Tier 3-4: HRL ministry/statboard
- Tier 5-6: HRL rep ministry/statboard
- Tier 7: hr_officer

Use `canAccessContent(userRole, requiredTier, ministryOnly)` for content access checks. Database uses Row Level Security (RLS) for automatic filtering.

### Data Fetching Pattern
- **Server Components**: Use `createClient()` from `lib/supabase/server.ts` (async, uses cookies)
- **Client Components**: Use `createClient()` from `lib/supabase/client.ts` (browser client)
- Server components pass user data to client components as props for client-side filtering/interaction

### File Storage
Three Supabase storage buckets: `circulars`, `resources`, `hrl-meetings`. Access via `lib/storage/access-control.ts` which enforces RLS before returning signed URLs.

### Type Definitions
Core types in `lib/types/database.ts`: `User`, `Role`, `Circular`, `Resource`, `HRLMeeting`, `UserRole`, `UserStatus`

## UI Components

Uses shadcn/ui (new-york style) with Radix primitives. Add components via:
```bash
npx shadcn@latest add <component-name>
```

Components in `components/ui/`. Icons from lucide-react.

## Key Files

- `lib/roles.ts` - Role constants and access control functions
- `lib/auth.ts` - Server-side auth helpers
- `lib/supabase/middleware.ts` - Session and route protection logic
- `lib/types/database.ts` - TypeScript type definitions
- `lib/constants/agencies.ts` - Ministry/agency list
- `lib/constants/topics.ts` - Document topic categories
