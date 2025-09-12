# Project Structure & Organization

## Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   ├── auth/           # Authentication components
│   ├── errors/         # Error handling components
│   ├── form/           # Form-related components
│   ├── notifications/  # Notification components
│   ├── permissions/    # Permission management components
│   └── ui/             # Generic UI components (shadcn/ui)
│
├── config/             # Application configuration
├── contexts/           # React Context providers
├── errors/             # Error classes and handlers
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
│   └── supabase/       # Supabase client and types
├── lib/                # Utility libraries
├── pages/              # Application pages/routes
│   └── admin/          # Administrative pages
├── services/           # API services and business logic
├── styles/             # Global styles
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Naming Conventions

### Files & Directories
- **PascalCase** for React components: `UserConfig.tsx`, `GroupManagement.tsx`
- **camelCase** for utilities and services: `emailService.ts`, `permissionUtils.ts`
- **kebab-case** for pages when URL-friendly: `email-config`, `audit-logs`
- **lowercase** for directories: `components`, `services`, `utils`

### Components
- Use **function declarations** for page components
- Use **const arrow functions** for smaller UI components
- Export components as default when they're the main export
- Use named exports for utility components

### Import Organization
1. React and external libraries
2. Internal components (using `@/` alias)
3. Types and interfaces
4. Relative imports

## Architecture Patterns

### Component Organization
- **Pages**: Top-level route components in `/pages`
- **Components**: Reusable UI components organized by domain
- **UI Components**: Generic, reusable components in `/components/ui`

### State Management
- **Global State**: React Context for auth and permissions
- **Server State**: TanStack Query for API data
- **Form State**: React Hook Form for form management
- **Local State**: useState for component-specific state

### Error Handling
- **Global Error Boundary**: Catches unhandled errors
- **Permission Error Boundary**: Handles permission-related errors
- **Custom Error Classes**: Specific error types in `/errors`

### Routing
- **Protected Routes**: Use `ProtectedRoute` wrapper with `screenKey` prop
- **Route Organization**: Admin routes under `/admin` prefix
- **Navigation**: Programmatic navigation using React Router hooks

## Code Style Guidelines

### TypeScript
- Use interfaces for object shapes
- Use type aliases for unions and primitives
- Relaxed configuration allows `any` when needed
- Optional strict null checks disabled for flexibility

### Styling
- **Tailwind CSS** classes for styling
- **CSS Variables** for theme colors
- **Sonda Brand Colors**: Use custom color palette
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Support via CSS variables and class toggle

### Testing
- **Vitest** with jsdom environment
- **Testing Library** for component testing
- Test files in `__tests__` directories
- Setup file at `src/test/setup.ts`