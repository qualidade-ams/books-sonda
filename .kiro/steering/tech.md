# Technology Stack

## Frontend Framework
- **React 18** with TypeScript
- **Vite** as build tool and dev server
- **React Router DOM** for client-side routing

## UI & Styling
- **Tailwind CSS** for styling with custom Sonda brand colors
- **shadcn/ui** component library built on Radix UI primitives
- **Lucide React** for icons
- **Inter** font family
- Custom CSS variables for theming (light/dark mode support)

## State Management & Data Fetching
- **TanStack Query (React Query)** for server state management
- **React Hook Form** with Zod validation for forms
- **React Context** for global state (Auth, Permissions)

## Backend & Database
- **Supabase** for backend-as-a-service
- PostgreSQL database (via Supabase)
- Real-time subscriptions and authentication

## Development Tools
- **TypeScript** with relaxed configuration (noImplicitAny: false)
- **Vitest** for testing with jsdom environment
- **ESLint** for code linting
- **PostCSS** with Autoprefixer

## Common Commands

```bash
# Development
npm run dev              # Start dev server on port 8080

# Building
npm run build           # Production build
npm run build:dev       # Development build
npm run preview         # Preview production build

# Testing
npm run test            # Run tests in watch mode
npm run test:run        # Run tests once

# Code Quality
npm run lint            # Run ESLint
```

## Key Libraries
- **@supabase/supabase-js** - Database and auth client
- **class-variance-authority** - Component variant management
- **clsx** & **tailwind-merge** - Conditional CSS classes
- **date-fns** - Date manipulation
- **sonner** - Toast notifications
- **zod** - Schema validation