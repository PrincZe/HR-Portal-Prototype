# HR Portal Prototype - Technical Specification
**Version:** 1.0  
**Date:** January 2026  
**Author:** William Wong  
**Purpose:** Functional prototype for stakeholder validation and technical feasibility demonstration

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [Storage Structure](#storage-structure)
7. [UI/UX Design System](#uiux-design-system)
8. [Feature Specifications](#feature-specifications)
9. [Implementation Steps](#implementation-steps)
10. [Mock Data Requirements](#mock-data-requirements)
11. [Deployment](#deployment)

---

## Project Overview

### Objectives
Build a functional prototype of HR Portal that demonstrates:
- Role-based access control with 7 user types
- Account management workflows
- Document upload and access based on roles
- Modern, professional UI suitable for government use
- Technical feasibility of proposed architecture

### Scope
**In Scope:**
- OTP authentication (Supabase Auth)
- 7 user roles with hierarchical access
- Account management (view, add, edit users)
- Document upload (circulars, resources)
- Role-based document visibility
- Admin approval workflows (simplified)

**Out of Scope (Future):**
- SGiD integration (will replace OTP later)
- Email notifications
- Advanced search with thesaurus
- Analytics dashboard
- Multi-step approval workflows
- Audit logging (basic version only)

### Success Criteria
- Login works for all 7 role types
- Different roles see different content
- Admin can add/edit users and assign roles
- Documents can be uploaded with access tiers
- UI is clean, professional, minimal scrolling
- Can be demonstrated to DS Jamie on Jan 28

---

## Architecture

### High-Level Architecture
```
User Browser
    ↓
Vercel (Next.js 14 App Router)
    ↓
    +-- Supabase Auth (OTP Login)
    +-- Supabase PostgreSQL (Data)
    +-- Supabase Storage (Documents)
```

### Key Design Decisions

**Why Vercel:**
- Automatic deployments from Git
- Edge functions for API routes
- Preview URLs for stakeholder review
- Production-ready hosting

**Why Supabase:**
- PostgreSQL with Row Level Security (perfect for role-based access)
- Built-in authentication with OTP
- S3-compatible storage for documents
- Real-time capabilities if needed
- Can migrate to AWS RDS later

**Why Next.js 14 App Router:**
- Server Components for better performance
- Server Actions for mutations (no API routes needed)
- File-based routing
- TypeScript support
- Easy to deploy on Vercel

---

## Technology Stack

### Frontend
- **Framework:** Next.js 14.1+ (App Router)
- **Language:** TypeScript 5+
- **Styling:** Tailwind CSS 3.4+
- **UI Components:** shadcn/ui (professional, accessible components)
- **Forms:** React Hook Form + Zod (validation)
- **State Management:** React Context (user session) + React Query (server state)
- **Icons:** Lucide React (consistent, professional icons)

### Backend
- **Database:** Supabase PostgreSQL 15
- **Authentication:** Supabase Auth (Magic Link / OTP)
- **Storage:** Supabase Storage
- **API:** Next.js Server Actions
- **ORM:** Supabase JS Client

### Development Tools
- **Package Manager:** npm or pnpm
- **Linting:** ESLint + Prettier
- **Type Checking:** TypeScript strict mode
- **Git:** Version control

---

## Database Schema

### Tables

#### 1. users (extends Supabase auth.users)
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  agency TEXT,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'rejected', 'disabled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ
);

CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_agency ON users(agency);
```

#### 2. roles
```sql
CREATE TABLE public.roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL, -- 'system_admin', 'portal_admin', 'hrl_ministry', etc.
  display_name TEXT NOT NULL,
  tier INTEGER NOT NULL, -- 1=highest access, 7=lowest
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO roles (name, display_name, tier, description) VALUES
  ('system_admin', 'System Administrator', 1, 'PSD BP - Full system access'),
  ('portal_admin', 'Portal Administrator', 2, 'Agency Portal Admin'),
  ('hrl_ministry', 'HR Leader (Ministry)', 3, 'Ministry HRL - Highest content access'),
  ('hrl_statboard', 'HR Leader (Statutory Board)', 4, 'Stat Board HRL'),
  ('hrl_rep_ministry', 'HRL Representative (Ministry)', 5, 'Ministry HRL Rep'),
  ('hrl_rep_statboard', 'HRL Representative (Stat Board)', 6, 'Stat Board HRL Rep'),
  ('hr_officer', 'HR Officer', 7, 'Standard HR staff');
```

#### 3. circulars
```sql
CREATE TABLE public.circulars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  circular_number TEXT UNIQUE NOT NULL, -- e.g., "HRL-2025-001"
  type TEXT NOT NULL, -- 'hrl', 'hrops', 'psd'
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_name TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  min_role_tier INTEGER, -- Minimum tier required (NULL = everyone)
  ministry_only BOOLEAN DEFAULT FALSE, -- If true, only ministry roles can see
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_circulars_type ON circulars(type);
CREATE INDEX idx_circulars_min_role_tier ON circulars(min_role_tier);
```

#### 4. resources
```sql
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  topic TEXT NOT NULL, -- e.g., 'compensation', 'benefits', 'performance-management'
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  min_role_tier INTEGER,
  ministry_only BOOLEAN DEFAULT FALSE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resources_topic ON resources(topic);
CREATE INDEX idx_resources_min_role_tier ON resources(min_role_tier);
```

#### 5. hrl_meetings
```sql
CREATE TABLE public.hrl_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date DATE NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hrl_meetings_date ON hrl_meetings(meeting_date DESC);
```

#### 6. user_role_history (Audit Trail)
```sql
CREATE TABLE public.user_role_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  old_role_id INTEGER REFERENCES roles(id),
  new_role_id INTEGER NOT NULL REFERENCES roles(id),
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX idx_user_role_history_user ON user_role_history(user_id);
```

#### 7. access_logs (Simple version for prototype)
```sql
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL, -- 'login', 'view_circular', 'download', 'upload', 'create_user', etc.
  resource_type TEXT, -- 'circular', 'resource', 'user', etc.
  resource_id UUID,
  metadata JSONB, -- Additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_access_logs_user ON access_logs(user_id);
CREATE INDEX idx_access_logs_created ON access_logs(created_at DESC);
```

### Row Level Security (RLS) Policies

**Enable RLS on all tables:**
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE circulars ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrl_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_role_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
```

**Policy Examples:**

```sql
-- Users table: Users can see their own record, admins see all
CREATE POLICY "Users can view own record" ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "System admins can view all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'system_admin'
    )
  );

CREATE POLICY "Portal admins can view users in their agency" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() 
      AND r.name = 'portal_admin'
      AND u.agency = users.agency
    )
  );

-- Circulars: Role-based access
CREATE POLICY "View circulars based on role tier" ON circulars
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND (
        -- System admin sees everything
        r.name = 'system_admin'
        OR
        -- Check tier and ministry flag
        (
          (circulars.min_role_tier IS NULL OR r.tier <= circulars.min_role_tier)
          AND
          (NOT circulars.ministry_only OR r.name LIKE '%ministry%')
        )
      )
    )
  );

-- HRL Meetings: Only HRL and HRL Rep can see
CREATE POLICY "HRL meetings access" ON hrl_meetings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND (
        r.name = 'system_admin'
        OR r.tier <= 6 -- HRL Rep tier and above
      )
    )
  );
```

### Helper Functions

```sql
-- Get current user's role tier
CREATE OR REPLACE FUNCTION get_user_role_tier()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_tier INTEGER;
BEGIN
  SELECT r.tier INTO user_tier
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.id = auth.uid();
  
  RETURN COALESCE(user_tier, 999); -- Return high number if no role found
END;
$$;

-- Check if user is ministry role
CREATE OR REPLACE FUNCTION is_ministry_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_ministry BOOLEAN;
BEGIN
  SELECT r.name LIKE '%ministry%' INTO is_ministry
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.id = auth.uid();
  
  RETURN COALESCE(is_ministry, FALSE);
END;
$$;
```

---

## Authentication & Authorization

### Authentication Flow (OTP)

**Login Process:**
1. User enters email on `/login` page
2. Supabase Auth sends magic link / OTP to email
3. User clicks link or enters OTP
4. Supabase validates and creates session
5. App checks if user exists in `users` table
6. If exists and status = 'active', redirect to dashboard
7. If exists and status = 'pending', show "Account pending approval"
8. If not exists, show "No access - contact administrator"

**Implementation:**
```typescript
// app/login/page.tsx
async function handleLogin(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });
}

// app/auth/callback/route.ts
export async function GET(request: Request) {
  // Exchange code for session
  // Check user status
  // Redirect to dashboard or show error
}
```

### Authorization Middleware

```typescript
// lib/auth.ts
export async function getCurrentUser() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data: userData } = await supabase
    .from('users')
    .select('*, roles(*)')
    .eq('id', user.id)
    .single();
    
  return userData;
}

export async function requireRole(allowedRoles: string[]) {
  const user = await getCurrentUser();
  
  if (!user || user.status !== 'active') {
    redirect('/login');
  }
  
  if (!allowedRoles.includes(user.roles.name)) {
    redirect('/unauthorized');
  }
  
  return user;
}
```

### Role Hierarchy for Access Checks

```typescript
// lib/roles.ts
export const ROLE_TIERS = {
  system_admin: 1,
  portal_admin: 2,
  hrl_ministry: 3,
  hrl_statboard: 4,
  hrl_rep_ministry: 5,
  hrl_rep_statboard: 6,
  hr_officer: 7
};

export function canAccessContent(
  userRole: string,
  requiredTier: number | null,
  ministryOnly: boolean
): boolean {
  const userTier = ROLE_TIERS[userRole];
  
  // System admin always has access
  if (userRole === 'system_admin') return true;
  
  // Check tier
  if (requiredTier !== null && userTier > requiredTier) {
    return false;
  }
  
  // Check ministry flag
  if (ministryOnly && !userRole.includes('ministry')) {
    return false;
  }
  
  return true;
}
```

---

## Storage Structure

### Supabase Storage Buckets

**Create 3 buckets:**
1. `circulars` - For HRL, HR OPS, PSD circulars
2. `resources` - For HR resources (templates, guides)
3. `hrl-meetings` - For HRL meeting materials

### Bucket Policies

```sql
-- Circulars bucket: Admins can upload, users can read based on role
CREATE POLICY "Circulars upload for admins" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'circulars' AND
    EXISTS (
      SELECT 1 FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.tier <= 2 -- System admin or Portal admin
    )
  );

CREATE POLICY "Circulars read based on role" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'circulars' AND
    -- Implement role-based logic here or handle in application layer
    true
  );
```

**Note:** For prototype, we may simplify storage policies and handle access control primarily in application layer through database RLS.

### File Organization

```
circulars/
  hrl/
    2025/
      HRL-2025-001.pdf
      HRL-2025-002.pdf
  hrops/
    2025/
      HROPS-2025-001.pdf
  psd/
    2025/
      PSD-2025-006.pdf

resources/
  compensation/
    g17-calculator.xlsx
    salary-guidelines.pdf
  benefits/
    flexibene-guide.pdf

hrl-meetings/
  2025/
    01/
      meeting-notes-2025-01-15.pdf
      presentation-2025-01-15.pptx
```

---

## UI/UX Design System

### Design Principles
- **Professional:** Government-appropriate, clean, trustworthy
- **Efficient:** Minimal clicks, clear information hierarchy
- **Accessible:** WCAG 2.1 AA compliance, keyboard navigation
- **Responsive:** Works on desktop (primary), tablet acceptable
- **Minimal scrolling:** Use tabs, pagination, multi-column layouts

### Color Palette

```css
/* Primary (Government Blue) */
--primary: 221 83% 53%; /* #2563eb */
--primary-foreground: 210 40% 98%;

/* Neutral (Grays) */
--background: 0 0% 100%; /* White */
--foreground: 222 47% 11%; /* Dark gray */
--muted: 210 40% 96%; /* Light gray */
--muted-foreground: 215 16% 47%;

/* Status Colors */
--success: 142 76% 36%; /* Green */
--warning: 38 92% 50%; /* Amber */
--danger: 0 84% 60%; /* Red */
--info: 221 83% 53%; /* Blue */
```

### Typography

```css
/* Font Stack */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Scale */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

### Spacing System

```css
/* Use Tailwind's spacing scale */
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
--spacing-12: 3rem;    /* 48px */
```

### Component Library (shadcn/ui)

**Install these components:**
- `button` - Primary, secondary, ghost, outline variants
- `card` - For content cards, stats cards
- `table` - For user lists, data tables
- `dialog` - For modals (add user, upload doc)
- `dropdown-menu` - For user menu, actions
- `input` - Text inputs, email, search
- `label` - Form labels
- `select` - Dropdowns (role selection, filters)
- `tabs` - For tabbed sections
- `badge` - Status indicators (pending, active, rejected)
- `toast` - Success/error notifications
- `avatar` - User avatars
- `separator` - Dividers
- `scroll-area` - Custom scrollbars
- `sheet` - Side panels for details

### Layout Components

**Sidebar Navigation (Left):**
```
┌─────────────┬──────────────────────────────────┐
│             │                                  │
│  Logo       │         Main Content             │
│             │                                  │
│ Dashboard   │                                  │
│ Circulars   │                                  │
│ Resources   │                                  │
│ Meetings    │                                  │
│ Users       │        (varies by page)          │
│             │                                  │
│             │                                  │
│ Profile     │                                  │
│ Logout      │                                  │
└─────────────┴──────────────────────────────────┘
   200px              Flexible (min-width: 800px)
```

**Collapsible on smaller screens (< 1024px):**
- Hamburger menu icon
- Sidebar slides in from left
- Overlay background

---

## Feature Specifications

### 1. Login Page (`/login`)

**Layout:**
```
┌─────────────────────────────────────────┐
│                                         │
│              [Logo/Title]               │
│                                         │
│          HR Portal Login                │
│                                         │
│    ┌─────────────────────────────┐     │
│    │  Email Address              │     │
│    │  [___________________]      │     │
│    │                             │     │
│    │  [Send Login Link] Button   │     │
│    └─────────────────────────────┘     │
│                                         │
│  After clicking:                        │
│  "Check your email for login link"     │
│                                         │
└─────────────────────────────────────────┘
```

**Features:**
- Email input field with validation
- "Send Login Link" button
- Success message after sending
- Error handling (invalid email, rate limit)
- Clean, centered design

**Component Structure:**
```
app/
  login/
    page.tsx          # Login form
  auth/
    callback/
      route.ts        # Handle OTP callback
```

---

### 2. Dashboard / Homepage (`/`)

**Layout: 3-Column Grid (Desktop)**
```
┌──────────────────────────────────────────────────────┐
│  Welcome, [User Name] • [Role Badge]                 │
├──────────────┬──────────────┬─────────────────────────┤
│              │              │                         │
│  Stats Card  │  Stats Card  │  Stats Card            │
│  Total Users │  Pending     │  Recent Uploads        │
│  2,045       │  12          │  5 this week           │
│              │              │                         │
├──────────────┴──────────────┴─────────────────────────┤
│                                                        │
│  Quick Actions (Cards)                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ Upload   │ │ Manage   │ │ View     │             │
│  │ Circular │ │ Users    │ │ Circulars│             │
│  └──────────┘ └──────────┘ └──────────┘             │
│                                                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Recent Activity (List - Max 5 items)                │
│  • User John Tan approved - 2 hours ago               │
│  • Circular HRL-2025-015 uploaded - 5 hours ago      │
│  • User Mary Lee login - 1 day ago                    │
│                                                        │
│  [View All Activity →]                                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Role-Specific Content:**

**System Admin sees:**
- Total users across all agencies
- Pending approvals (HRL, HRL Rep, Portal Admin)
- Recent uploads across all types
- Quick actions: Upload, Manage Users, View Reports

**Portal Admin sees:**
- Users in their agency only
- Pending HR Officer requests
- Quick actions: Manage Users (agency), View Circulars

**HRL sees:**
- Welcome message
- Quick access to: HRL Circulars, HRL Meetings, Resources
- Recent updates to HRL content
- No admin functions

**HR Officer sees:**
- Welcome message
- Quick access to: FAQs, Resources, PSD Circulars
- Recent updates
- No admin functions

**Responsive:**
- Desktop (>1024px): 3-column grid for stats, 3-column for quick actions
- Tablet (768-1024px): 2-column layout
- Mobile (<768px): Single column, stacked cards

---

### 3. Account Management Page (`/admin/users`)

**CRITICAL FEATURE - Detailed Spec**

**Layout: Split View**
```
┌─────────────────────────────────────────────────────────────┐
│  Account Management                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ All Users    │  │ Pending (12) │  │ By Agency    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  [Add New User] [Export CSV]  [Search: ___________]         │
│                                                               │
├───────────────────────────────────┬───────────────────────────┤
│                                   │                           │
│  User List (Table)               │  User Details (Panel)    │
│  ┌──────────────────────────┐   │                           │
│  │Name   │Role  │Agency│···│   │  [Slide in when user      │
│  ├──────────────────────────┤   │   is clicked]             │
│  │John T │HRL   │MOE   │...│   │                           │
│  │Mary L │HRO   │MHA   │...│   │  Name: John Tan           │
│  │Alex C │HRL-R │PSD   │...│   │  Email: john@gov.sg       │
│  │Sarah K│HRO   │MOF   │...│   │  Role: HRL (Ministry)     │
│  │...    │      │      │   │   │  Agency: MOE              │
│  │                          │   │  Status: Active           │
│  │ Showing 1-20 of 2,045    │   │                           │
│  │ [< Prev] [Next >]        │   │  [Edit Role]              │
│  └──────────────────────────┘   │  [Change Status]          │
│                                   │  [View History]           │
│  60% width                       │  40% width                │
└───────────────────────────────────┴───────────────────────────┘
```

**Features:**

**A. Tabs:**
- **All Users** - Full list
- **Pending (12)** - Badge shows count, only pending approvals
- **By Agency** - Dropdown to filter by agency

**B. Action Bar:**
- **Add New User** button (primary, opens dialog)
- **Export CSV** button (secondary)
- **Search bar** - Search by name, email, agency

**C. User List Table:**

**Columns:**
- Avatar + Name
- Email
- Role (badge with color coding)
- Agency
- Status (badge: Active, Pending, Rejected, Disabled)
- Last Login (relative time: "2 days ago")
- Actions (dropdown menu)

**Actions Dropdown (per user):**
- Edit Role
- Change Status (Approve/Reject if pending)
- View History
- Disable Account (if active)

**Row Click Behavior:**
- Click row → User details panel slides in from right
- Shows full info + action buttons
- Click outside or X button to close

**Pagination:**
- Show 20 users per page
- Pagination controls at bottom
- Display "Showing 1-20 of 2,045"

**D. Add New User Dialog:**

**Modal Form:**
```
┌──────────────────────────────────────┐
│  Add New User               [X Close]│
│                                      │
│  Email Address *                     │
│  [_____________________________]     │
│                                      │
│  Full Name *                         │
│  [_____________________________]     │
│                                      │
│  Role *                              │
│  [▼ Select Role____________]         │
│    - System Administrator            │
│    - Portal Administrator            │
│    - HR Leader (Ministry)            │
│    - HR Leader (Statutory Board)     │
│    - HRL Representative (Ministry)   │
│    - HRL Representative (Stat Board) │
│    - HR Officer                      │
│                                      │
│  Agency *                            │
│  [▼ Select Agency___________]        │
│    - PSD                             │
│    - MOE                             │
│    - MOH                             │
│    - ... (70+ agencies)              │
│                                      │
│  Status                              │
│  ( ) Pending approval                │
│  (•) Active (direct assignment)      │
│                                      │
│  [Cancel]        [Add User]          │
└──────────────────────────────────────┘
```

**Form Validation:**
- Email: Valid format, not already exists
- Full Name: Required
- Role: Required
- Agency: Required
- Status: Default to "Active" for admins

**Submit Behavior:**
- If "Active" selected → User created and active immediately
- If "Pending" selected → User created, shows in Pending tab
- Send email notification with login link (OTP)
- Show success toast
- Close dialog
- Refresh user list

**E. Edit User Dialog:**

Similar to Add User, but:
- Pre-filled with current values
- "Update User" button instead of "Add User"
- Show "Change History" link at bottom
- For role changes, require confirmation: "Changing from HRO to HRL will grant additional access. Confirm?"

**F. User Details Panel (Right Side):**

**Sections:**
1. **Profile Info:**
   - Avatar (initials)
   - Full Name
   - Email
   - Role (badge)
   - Agency
   - Status (badge)
   - Last Login

2. **Actions:**
   - Edit Role (button)
   - Change Status (button with dropdown: Approve, Reject, Disable)
   - View History (button)

3. **Role History (Collapsible):**
   - Show last 5 role changes
   - Date, Old Role → New Role, Changed By
   - "View Full History" link

4. **Recent Activity (Collapsible):**
   - Last 5 actions (login, view circular, download)
   - Date, Action, Resource
   - "View Full Activity" link

**Responsive:**
- Desktop (>1024px): Split view (60/40)
- Tablet/Mobile: Stack vertically, user details in full-screen modal

**Access Control:**
- **System Admin:** Can see all users, add/edit any role
- **Portal Admin:** Can only see users in their agency, can only assign HR Officer role
- **Others:** No access to this page

---

### 4. Circulars Page (`/circulars`)

**Layout: 2-Column**
```
┌───────────────────────────────────────────────────────┐
│  Circulars                                            │
│                                                        │
├──────────────┬─────────────────────────────────────────┤
│              │                                         │
│  Filters     │  Circular Cards (Grid)                 │
│              │                                         │
│  Type:       │  ┌────────────┐  ┌────────────┐       │
│  □ HRL       │  │ HRL-2025-  │  │ HROPS-2025-│       │
│  □ HR OPS    │  │ 015        │  │ 008        │       │
│  □ PSD       │  │ Compensation│  │ Benefits   │       │
│              │  │ Policy     │  │ Update     │       │
│  Year:       │  │            │  │            │       │
│  [▼ 2025]    │  │ 15 Jan 2025│  │ 10 Jan 2025│       │
│              │  │ [View PDF] │  │ [View PDF] │       │
│  Search:     │  └────────────┘  └────────────┘       │
│  [_______]   │                                         │
│              │  ┌────────────┐  ┌────────────┐       │
│  [Clear All] │  │ PSD-2025-  │  │ HRL-2025-  │       │
│              │  │ 006        │  │ 014        │       │
│              │  │ ...        │  │ ...        │       │
│              │  └────────────┘  └────────────┘       │
│              │                                         │
│              │  Showing 12 of 45 circulars            │
│              │  [Load More]                           │
│              │                                         │
│  25% width   │  75% width                             │
└──────────────┴─────────────────────────────────────────┘
```

**Features:**

**A. Left Sidebar - Filters:**
- Type checkboxes (HRL, HR OPS, PSD)
- Year dropdown (2025, 2024, 2023...)
- Search input (search by title, circular number)
- Clear All button

**B. Right Content - Circular Cards:**

**Card Design:**
```
┌─────────────────────────────┐
│  [Icon] HRL-2025-015        │  ← Badge for type
│                             │
│  Compensation Policy Update │  ← Title (2 lines max)
│                             │
│  New salary scales for      │  ← Description (3 lines)
│  senior officers...         │    with ellipsis
│                             │
│  📅 15 Jan 2025             │  ← Date
│  👤 Ministry HRL Only       │  ← Access level
│                             │
│  [View PDF]  [Download]     │  ← Actions
└─────────────────────────────┘
```

**Grid Layout:**
- Desktop: 3 cards per row
- Tablet: 2 cards per row
- Mobile: 1 card per row
- Gap between cards: 1.5rem

**Load More:**
- Show 12 circulars initially
- "Load More" button loads next 12
- Infinite scroll alternative (optional)

**Role-Based Visibility:**
- **HRL:** Sees HRL circulars + HR OPS + PSD
- **HRL Rep:** Sees HRL circulars + HR OPS + PSD
- **HR Officer:** Sees HR OPS + PSD only (HRL hidden)
- **System Admin:** Sees everything

**Empty State:**
- If no circulars match filters: "No circulars found"
- Suggest clearing filters

**View PDF Action:**
- Opens PDF in new tab (Supabase Storage signed URL)
- Logs view action in access_logs

**Download Action:**
- Downloads file to user's computer
- Logs download action

---

### 5. Upload Circular Page (`/admin/upload`)

**Layout: Centered Form**
```
┌──────────────────────────────────────────────────────┐
│  Upload Circular                                     │
│                                                       │
│  ┌────────────────────────────────────────────────┐ │
│  │                                                │ │
│  │  Circular Type *                               │ │
│  │  (•) HRL Circular                              │ │
│  │  ( ) HR OPS Circular                           │ │
│  │  ( ) PSD Circular                              │ │
│  │                                                │ │
│  │  Circular Number *                             │ │
│  │  [_____________________________]               │ │
│  │  e.g., HRL-2025-016                            │ │
│  │                                                │ │
│  │  Title *                                       │ │
│  │  [_____________________________]               │ │
│  │                                                │ │
│  │  Description                                   │ │
│  │  [_____________________________ ]              │ │
│  │  [_____________________________ ]              │ │
│  │  [_____________________________ ]              │ │
│  │                                                │ │
│  │  Access Level *                                │ │
│  │  [▼ Select Access Level________]               │ │
│  │    - Everyone (All HR Officers)                │ │
│  │    - HRL & HRL Rep Only                        │ │
│  │    - HRL Only                                  │ │
│  │    - Ministry HRL Only                         │ │
│  │                                                │ │
│  │  Upload File *                                 │ │
│  │  ┌──────────────────────────────────────┐     │ │
│  │  │  Drag & drop file here               │     │ │
│  │  │  or click to browse                  │     │ │
│  │  │                                      │     │ │
│  │  │  Accepted: PDF, DOC, DOCX            │     │ │
│  │  │  Max size: 10MB                      │     │ │
│  │  └──────────────────────────────────────┘     │ │
│  │                                                │ │
│  │  [Cancel]              [Upload Circular]      │ │
│  │                                                │ │
│  └────────────────────────────────────────────────┘ │
│                                                       │
│  Max width: 600px, centered                          │
└──────────────────────────────────────────────────────┘
```

**Features:**

**Form Fields:**
1. **Circular Type** - Radio buttons (HRL, HR OPS, PSD)
2. **Circular Number** - Text input with format guide
3. **Title** - Text input
4. **Description** - Textarea (optional)
5. **Access Level** - Select dropdown
6. **File Upload** - Drag & drop zone

**Access Level Options:**
- Everyone (All HR Officers) → min_role_tier = 7, ministry_only = false
- HRL & HRL Rep Only → min_role_tier = 6, ministry_only = false
- HRL Only → min_role_tier = 4, ministry_only = false
- Ministry HRL Only → min_role_tier = 3, ministry_only = true

**File Upload:**
- Drag & drop or click to browse
- Show file name and size after selection
- Remove file option (X button)
- Progress bar during upload

**Validation:**
- All required fields must be filled
- Circular number must be unique
- File must be uploaded
- File size < 10MB
- File type: PDF, DOC, DOCX

**Submit Process:**
1. Validate form
2. Upload file to Supabase Storage (appropriate bucket + path)
3. Create record in `circulars` table
4. Show success toast with link to view circular
5. Reset form
6. Log upload action

**Access Control:**
- Only System Admin and Portal Admin can access
- Portal Admin can only upload HR OPS and PSD circulars (not HRL)

**Error Handling:**
- Show field-level errors
- Show upload errors (network, file too large, etc.)
- Rollback: If DB insert fails, delete uploaded file

---

### 6. Resources Page (`/resources`)

**Similar to Circulars, but organized by Topic**

**Layout:**
```
┌───────────────────────────────────────────────────────┐
│  HR Resources                                         │
│                                                        │
├──────────────┬─────────────────────────────────────────┤
│              │                                         │
│  Topics      │  Resource Cards (Grid)                 │
│              │                                         │
│  Compensation│  [Similar to circular cards]           │
│  Benefits    │                                         │
│  Performance │                                         │
│  Recruitment │                                         │
│  Security    │                                         │
│  ...         │                                         │
│              │                                         │
│  File Type:  │                                         │
│  □ PDF       │                                         │
│  □ Excel     │                                         │
│  □ Word      │                                         │
│              │                                         │
└──────────────┴─────────────────────────────────────────┘
```

**Topics:** (17 IM2G topics + additional)
- Compensation
- Benefits
- Performance Management
- Recruitment
- Security Screening
- Approving Authorities
- Personnel Block System
- ... (rest of topics)

**Similar functionality to Circulars page.**

---

### 7. HRL Meetings Page (`/hrl-meetings`)

**Access:** HRL and HRL Rep only

**Layout: List View**
```
┌─────────────────────────────────────────────────────┐
│  HRL Meeting Materials                              │
│                                                      │
│  [Year: ▼ 2025]  [Search: __________]              │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  January 2025 Meeting                          │ │
│  │  15 Jan 2025                                   │ │
│  │                                                │ │
│  │  Documents:                                    │ │
│  │  📄 Meeting Agenda.pdf        [View] [Download]│ │
│  │  📄 Presentation.pptx          [View] [Download]│ │
│  │  📄 Meeting Notes.pdf          [View] [Download]│ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  December 2024 Meeting                         │ │
│  │  ...                                           │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Features:**
- Grouped by month/meeting
- Multiple documents per meeting
- Chronological order (newest first)
- Year filter
- Search by title
- View and download actions

---

### 8. User Profile (`/profile`)

**Layout: Simple Card**
```
┌──────────────────────────────────────┐
│  My Profile                          │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  [Avatar]                      │ │
│  │                                │ │
│  │  John Tan                      │ │
│  │  john.tan@gov.sg               │ │
│  │                                │ │
│  │  Role: HR Leader (Ministry)    │ │
│  │  Agency: Ministry of Education │ │
│  │  Status: Active                │ │
│  │                                │ │
│  │  Last Login: 2 hours ago       │ │
│  │                                │ │
│  │  [Change Password]             │ │
│  │  [Update Profile]              │ │
│  │                                │ │
│  └────────────────────────────────┘ │
│                                      │
│  Recent Activity                     │
│  • Viewed HRL-2025-015 - 1 hour ago │
│  • Downloaded resource - 3 hours ago│
│  • Logged in - 5 hours ago          │
│                                      │
└──────────────────────────────────────┘
```

**Features:**
- View profile info (read-only for most fields)
- Change password (if using OTP, this might not apply)
- Update name, avatar
- View recent activity (last 10 actions)

---

## Implementation Steps

### Phase 1: Project Setup (Day 1-2)

**Step 1.1: Initialize Next.js Project**
```bash
npx create-next-app@latest hr-portal-prototype --typescript --tailwind --app
cd hr-portal-prototype
```

**Step 1.2: Install Dependencies**
```bash
npm install @supabase/supabase-js @supabase/ssr
npm install @hookform/resolvers react-hook-form zod
npm install date-fns
npm install lucide-react
```

**Step 1.3: Install shadcn/ui**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card table dialog dropdown-menu input label select tabs badge toast avatar separator scroll-area sheet
```

**Step 1.4: Setup Supabase Project**
1. Create new project at supabase.com
2. Note Project URL and anon key
3. Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Step 1.5: Create Supabase Client Utilities**
```typescript
// lib/supabase/client.ts
// lib/supabase/server.ts
// lib/supabase/middleware.ts
```

**Step 1.6: Setup Project Structure**
```
app/
  (auth)/
    login/
    auth/callback/
  (dashboard)/
    layout.tsx          # Sidebar + header layout
    page.tsx            # Dashboard
    circulars/
    resources/
    hrl-meetings/
    profile/
    admin/
      users/
      upload/
  api/                  # If needed
components/
  ui/                   # shadcn components
  layout/
    sidebar.tsx
    header.tsx
  circulars/
    circular-card.tsx
    circular-filters.tsx
  users/
    user-table.tsx
    add-user-dialog.tsx
lib/
  supabase/
  auth.ts
  roles.ts
  utils.ts
```

### Phase 2: Database Setup (Day 3)

**Step 2.1: Run SQL in Supabase Dashboard**
- Copy all SQL from Database Schema section
- Execute in SQL Editor
- Verify tables created
- Enable RLS on all tables
- Create RLS policies
- Create helper functions

**Step 2.2: Create Storage Buckets**
- Navigate to Storage in Supabase Dashboard
- Create 3 buckets: `circulars`, `resources`, `hrl-meetings`
- Set bucket policies (public read, authenticated write)

**Step 2.3: Seed Mock Data**
See Mock Data Requirements section for details.

### Phase 3: Authentication (Day 4-5)

**Step 3.1: Build Login Page**
- Create `/login` page
- Email input + Send OTP button
- Handle Supabase Auth magic link
- Show success/error states

**Step 3.2: Auth Callback Route**
- Create `/auth/callback` route
- Exchange code for session
- Check user status in database
- Redirect to dashboard or show error

**Step 3.3: Auth Middleware**
- Protect routes that require authentication
- Redirect to login if not authenticated
- Check user status (active vs pending)

**Step 3.4: Auth Utilities**
- `getCurrentUser()` - Get user with role
- `requireRole()` - Check if user has required role
- `signOut()` - Sign out user

### Phase 4: Dashboard Layout (Day 6-7)

**Step 4.1: Build Sidebar Component**
- Logo/title at top
- Navigation links (role-based)
- User profile at bottom
- Logout button
- Collapsible on mobile

**Step 4.2: Build Header Component**
- Breadcrumbs
- User menu (avatar + dropdown)
- Mobile hamburger menu

**Step 4.3: Create Dashboard Layout**
- Combine sidebar + header
- Main content area
- Apply to all dashboard routes

**Step 4.4: Build Dashboard Page**
- Stats cards (3-column grid)
- Quick actions cards
- Recent activity list
- Role-based content visibility

### Phase 5: Account Management (Day 8-11)

**PRIORITY FEATURE**

**Step 5.1: User List Table**
- Fetch users from database (with pagination)
- Display in table with columns
- Implement search
- Implement filters (tabs)
- Row click → show details panel

**Step 5.2: Add User Dialog**
- Create form with validation
- Role dropdown
- Agency dropdown
- Submit → create user in DB
- Send OTP invite email
- Show success toast

**Step 5.3: Edit User Functionality**
- Pre-fill form with user data
- Update user in DB
- Log role change in history
- Show confirmation for role changes

**Step 5.4: User Details Panel**
- Slide-in panel from right
- Show profile info
- Action buttons
- Role history (collapsible)
- Recent activity (collapsible)

**Step 5.5: Approval Workflow (Simplified)**
- "Pending" tab shows users with status = 'pending'
- Approve button → change status to 'active'
- Reject button → change status to 'rejected'
- Log action

**Step 5.6: Access Control**
- System Admin sees all users
- Portal Admin sees only their agency
- Others cannot access page

### Phase 6: Circulars Feature (Day 12-14)

**Step 6.1: Circulars List Page**
- Fetch circulars from database (with RLS)
- Display in card grid (3 columns)
- Implement filters (left sidebar)
- Load more / pagination
- Empty state if no results

**Step 6.2: Circular Cards**
- Display title, description, date, access level
- View PDF button (open signed URL)
- Download button
- Log view/download actions

**Step 6.3: Upload Circular Page**
- Create form with all fields
- File upload (drag & drop)
- Upload to Supabase Storage
- Create DB record
- Show success/error

**Step 6.4: Role-Based Visibility**
- Use RLS policies to filter circulars
- Test with different roles
- Verify HRL sees more than HRO

### Phase 7: Resources & Meetings (Day 15-16)

**Step 7.1: Resources Page**
- Similar to circulars
- Organized by topic
- File type filters
- Cards with download actions

**Step 7.2: HRL Meetings Page**
- Grouped by month
- List view (not cards)
- Multiple documents per meeting
- Access: HRL and HRL Rep only

**Step 7.3: Upload Pages**
- Similar to upload circular
- Different bucket paths
- Different access control

### Phase 8: User Profile & Polish (Day 17-18)

**Step 8.1: Profile Page**
- Display user info
- Recent activity
- Update name/avatar

**Step 8.2: Polish & Testing**
- Test all features with different roles
- Fix bugs
- Improve responsive design
- Add loading states
- Add error handling
- Toast notifications

### Phase 9: Deployment (Day 19-20)

**Step 9.1: Prepare for Deployment**
- Environment variables in Vercel
- Build and test locally
- Fix any build errors

**Step 9.2: Deploy to Vercel**
- Push to GitHub
- Connect to Vercel
- Deploy
- Test production URL

**Step 9.3: Final Testing**
- Test all features in production
- Test with different roles
- Fix any issues
- Prepare demo script

---

## Mock Data Requirements

### Users (Seed Data)

**Create at least 50 users across 7 roles:**

**System Admin (1 user):**
```sql
-- admin@psd.gov.sg / PSD
```

**Portal Admin (10 users):**
```sql
-- One for each major agency: MOE, MOH, MHA, MOF, MOM, MTI, MINDEF, etc.
-- e.g., admin.moe@moe.gov.sg / MOE
```

**Ministry HRL (10 users):**
```sql
-- Different ministries
-- e.g., hrl.moe@moe.gov.sg / MOE (Ministry)
```

**Statutory Board HRL (10 users):**
```sql
-- Different stat boards
-- e.g., hrl.hdb@hdb.gov.sg / HDB (Statutory Board)
```

**HRL Rep - Ministry (10 users):**
```sql
-- e.g., hrlrep.moe@moe.gov.sg / MOE (Ministry)
```

**HRL Rep - Stat Board (5 users):**
```sql
-- e.g., hrlrep.hdb@hdb.gov.sg / HDB (Statutory Board)
```

**HR Officer (50+ users):**
```sql
-- Spread across many agencies
-- e.g., officer1@moe.gov.sg, officer2@moh.gov.sg, etc.
```

**Total: ~100 users**

**Status Distribution:**
- 80% Active
- 15% Pending
- 5% Rejected/Disabled

### Circulars (Seed Data)

**Create at least 30 circulars:**

**HRL Circulars (10):**
- Access: HRL and HRL Rep only (min_role_tier = 6)
- Types: Policy updates, meeting circulars
- Recent dates (last 3 months)

**HR OPS Circulars (10):**
- Access: HRL, HRL Rep, HR Officer (min_role_tier = 7)
- Types: Operational procedures, templates
- Recent dates

**PSD Circulars (10):**
- Access: Everyone (min_role_tier = 7)
- Types: General announcements
- Recent dates

**Ministry-Only Content (3-5 circulars):**
- ministry_only = true
- Access: Ministry HRL only
- Examples: G17 calculator access, civil service-specific policies

### Resources (Seed Data)

**Create at least 20 resources across topics:**

**Compensation (5 resources):**
- G17 Calculator (Ministry HRL only)
- Salary Guidelines (HRL only)
- Bonus Calculator (Everyone)
- etc.

**Benefits (5 resources):**
- FlexiBene Guide (Everyone)
- Medical Benefits Template (Everyone)
- etc.

**Performance Management (5 resources):**
- Appraisal Templates (HRL only)
- Performance Bonus Guide (Ministry HRL only)
- etc.

**Other Topics (5 resources):**
- Security Screening Guide (Everyone)
- Recruitment Templates (Everyone)
- etc.

### HRL Meetings (Seed Data)

**Create at least 6 meetings:**

**2025 Meetings:**
- January 2025 (3 documents: agenda, presentation, notes)
- December 2024
- November 2024
- October 2024
- September 2024
- August 2024

### Mock Documents

**For prototype, use:**
- Sample PDFs (can be Lorem Ipsum PDFs)
- Label them clearly (e.g., "HRL-2025-001-Sample.pdf")
- Store in appropriate Supabase Storage buckets
- Ensure file paths match database records

**Document Generation:**
- Use online PDF generators or create simple PDFs
- Include title page with circular number and title
- Can use placeholder content (Lorem Ipsum)
- Focus on demonstrating access control, not actual content

---

## Deployment

### Vercel Deployment

**Step 1: Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/hr-portal-prototype.git
git push -u origin main
```

**Step 2: Connect to Vercel**
1. Go to vercel.com
2. Import Git Repository
3. Select your GitHub repo
4. Configure project:
   - Framework: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: `.next`

**Step 3: Add Environment Variables**
```
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

**Step 4: Deploy**
- Click Deploy
- Wait for build to complete
- Get production URL

**Step 5: Custom Domain (Optional)**
- Add custom domain in Vercel settings
- Update DNS records
- Wait for SSL certificate

### Post-Deployment Testing

**Test Checklist:**
1. Login with OTP works
2. All 7 roles can login
3. Dashboard shows role-specific content
4. Account management works (add, edit, approve)
5. Circulars upload and display correctly
6. Role-based visibility works (HRL sees more than HRO)
7. Documents can be downloaded
8. Responsive design works on tablet/mobile
9. All pages load without errors
10. Navigation works correctly

### Demo Preparation

**Create Demo Script:**
1. **Login as System Admin**
   - Show OTP login flow
   - Dashboard with stats and quick actions

2. **Account Management**
   - Show user list (100+ users)
   - Filter by role, search
   - Add new HRL user
   - Show pending approvals
   - Approve an HRL Rep request

3. **Switch to HRL Role**
   - Logout, login as HRL
   - Show different dashboard
   - Can see HRL circulars

4. **Switch to HR Officer**
   - Logout, login as HRO
   - Cannot see HRL circulars
   - Only sees HR OPS and PSD circulars

5. **Upload Circular (as Admin)**
   - Upload new HRL circular
   - Set "HRL Only" access
   - Verify it appears in circular list

6. **View Resources**
   - Browse by topic
   - Show ministry-only content (only visible to ministry HRL)

**Prepare Talking Points:**
- "This prototype demonstrates the core features..."
- "Role-based access control is fully functional..."
- "We can easily integrate SGiD to replace OTP..."
- "Database schema is production-ready, can scale to AWS RDS..."
- "Supabase is just for prototyping, architecture is designed for AWS..."

---

## Technical Notes

### Performance Considerations

**Optimization Strategies:**
1. **Use Next.js Server Components** - Reduce client-side JavaScript
2. **Image Optimization** - Use Next.js Image component
3. **Database Indexing** - Indexes on frequently queried columns
4. **Pagination** - Don't load all users/circulars at once
5. **Caching** - Cache role/user info in session
6. **Lazy Loading** - Code split by route
7. **CDN** - Vercel Edge Network for fast global access

**Expected Performance:**
- Page load: < 2 seconds
- API response: < 500ms
- File upload: < 5 seconds for 5MB file

### Security Considerations

**Current Security Measures:**
1. **Row Level Security** - Database-enforced access control
2. **Authentication** - Supabase Auth with OTP
3. **HTTPS** - Enforced by Vercel
4. **Environment Variables** - Secrets not in code
5. **Input Validation** - Zod schemas on all forms
6. **XSS Prevention** - React auto-escaping
7. **CSRF Protection** - Next.js built-in

**For Production (Future):**
- IP whitelisting (AWS WAF)
- SGiD integration
- Enhanced logging and audit trails
- Rate limiting
- Content Security Policy headers

### Migration Path to Production

**Supabase → AWS RDS:**
1. Export PostgreSQL schema and data
2. Import to AWS RDS
3. Update connection strings
4. Test thoroughly

**Supabase Storage → AWS S3:**
1. Copy files to S3
2. Update file paths in database
3. Use CloudFront for CDN
4. Update signed URL generation

**Supabase Auth → Azure AD / SGiD:**
1. Implement OAuth flow
2. Map roles from external IDP
3. Migrate user records
4. Test authentication flow

**Vercel → AWS (if needed):**
1. Containerize Next.js app
2. Deploy to ECS Fargate
3. Setup ALB, CloudFront
4. Configure CI/CD

---

## Appendix

### Useful Commands

**Development:**
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

**Supabase:**
```bash
npx supabase login
npx supabase init
npx supabase db push  # Push schema changes
npx supabase db pull  # Pull schema from remote
```

**Database:**
```sql
-- Reset database (CAUTION)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- View all tables
\dt

-- View RLS policies
SELECT * FROM pg_policies;
```

### Troubleshooting

**Common Issues:**

1. **"User not found" after login**
   - Check if user exists in `users` table
   - Check if user status is 'active'
   - Check RLS policies

2. **"Cannot read circulars"**
   - Check RLS policies on circulars table
   - Verify user role tier
   - Check ministry_only flag

3. **File upload fails**
   - Check Supabase Storage bucket exists
   - Check file size < 10MB
   - Check bucket policies allow authenticated upload

4. **Build fails on Vercel**
   - Check all environment variables are set
   - Check TypeScript errors (`npm run type-check`)
   - Check build logs in Vercel dashboard

### Resources

**Documentation:**
- Next.js: https://nextjs.org/docs
- Supabase: https://supabase.com/docs
- shadcn/ui: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com/docs

**Design References:**
- Vercel Dashboard (clean, professional)
- Linear (modern SaaS UI)
- Stripe Dashboard (data-heavy UI)

---

**END OF SPECIFICATION**

*This specification is ready to be used with Cursor or any AI coding assistant. It provides comprehensive details for building a functional prototype of the HR Portal.*

*Next steps: Review this spec, make any adjustments, then provide to Cursor for implementation.*
