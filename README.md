# HR Portal Prototype

A functional prototype of the HR Portal for Singapore Public Service Division, demonstrating role-based access control, document management, and user account management.

## 🎯 Project Overview

This prototype demonstrates:
- **7 user roles** with hierarchical access control (System Admin → Portal Admin → HRL → HRL Rep → HR Officer)
- **Role-based document access** - different users see different content based on their tier and ministry/stat board affiliation
- **Account management** - admins can create, approve, and manage user accounts
- **Document management** - upload and access circulars, resources, and HRL meeting materials
- **OTP authentication** via Supabase (will be replaced with SGiD in production)

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Vercel
- **Form Management**: React Hook Form + Zod
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Supabase account and project
- Git

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/PrincZe/HR-Portal-Prototype.git
cd "HR Portal Prototype"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the values with your actual Supabase project credentials from the [Supabase Dashboard](https://app.supabase.com).

### 4. Set Up Database (Phase 3)

The database schema and setup will be completed in Phase 3. See `HR_Portal_Prototype_Specification.md` for the complete SQL schema.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
├── app/
│   ├── (auth)/              # Authentication routes
│   │   ├── login/           # Login page
│   │   └── auth/callback/   # OTP callback handler
│   ├── (dashboard)/         # Protected dashboard routes
│   │   ├── layout.tsx       # Dashboard layout with sidebar
│   │   ├── page.tsx         # Dashboard home
│   │   ├── circulars/       # Circulars management
│   │   ├── resources/       # HR resources
│   │   ├── hrl-meetings/    # HRL meeting materials
│   │   ├── profile/         # User profile
│   │   └── admin/           # Admin features
│   │       ├── users/       # Account management
│   │       └── upload/      # Upload circulars
│   ├── globals.css          # Global styles
│   └── layout.tsx           # Root layout
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── layout/              # Layout components
│   │   ├── sidebar.tsx      # Navigation sidebar
│   │   └── header.tsx       # Top header
│   ├── circulars/           # Circular-specific components
│   └── users/               # User management components
├── lib/
│   ├── supabase/            # Supabase client utilities
│   │   ├── client.ts        # Browser client
│   │   ├── server.ts        # Server client
│   │   └── middleware.ts    # Auth middleware
│   ├── types/               # TypeScript type definitions
│   │   └── database.ts      # Database types
│   ├── auth.ts              # Auth helper functions
│   ├── roles.ts             # Role hierarchy logic
│   └── utils.ts             # Utility functions
├── middleware.ts            # Next.js middleware for auth
└── HR_Portal_Prototype_Specification.md  # Full technical specification
```

## 👥 User Roles

1. **System Administrator** (Tier 1) - PSD BP, full system access
2. **Portal Administrator** (Tier 2) - Agency portal admin
3. **HR Leader (Ministry)** (Tier 3) - Ministry HRL, highest content access
4. **HR Leader (Statutory Board)** (Tier 4) - Stat Board HRL
5. **HRL Representative (Ministry)** (Tier 5) - Ministry HRL Rep
6. **HRL Representative (Stat Board)** (Tier 6) - Stat Board HRL Rep
7. **HR Officer** (Tier 7) - Standard HR staff

## 🔐 Authentication & Authorization

- **Authentication**: OTP via Supabase Auth (magic link)
- **Authorization**: Row Level Security (RLS) in PostgreSQL
- **Session Management**: Supabase SSR with Next.js middleware
- **Protected Routes**: Automatic redirect to login if not authenticated

## 📝 Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 🗺️ Implementation Roadmap

### ✅ Phase 1-2: Project Setup (Current)
- Next.js 14 initialization
- Dependencies installation
- Supabase configuration
- Project structure
- Layout components

### 🔄 Phase 3: Database Setup (Next)
- Execute SQL schema
- Create storage buckets
- Set up RLS policies
- Seed mock data

### 📅 Future Phases
- Phase 4: Dashboard layout
- Phase 5: Account management (PRIORITY)
- Phase 6: Circulars feature
- Phase 7: Resources & meetings
- Phase 8: Profile & polish
- Phase 9: Deployment

## 📚 Documentation

- **Technical Specification**: See `HR_Portal_Prototype_Specification.md` for complete details
- **Database Schema**: Detailed schema in specification document
- **API Documentation**: Will be added in later phases

## 🔗 Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🤝 Contributing

This is a prototype project for stakeholder validation. For questions or issues, contact the development team.

## 📄 License

Internal use only - Public Service Division, Singapore

---

**Status**: Phase 1-2 Complete ✅  
**Next**: Phase 3 - Database Setup  
**Target Demo Date**: January 28, 2026
# Testing Git setup
# Testing Git setup
