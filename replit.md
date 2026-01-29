# SENAI Gestão Educacional

## Overview

This is an educational management system built for SENAI-SP (Serviço Nacional de Aprendizagem Industrial). The application enables professors to manage classes, students, evaluations, grades, schedules, and attendance. It follows a full-stack TypeScript architecture with React frontend and Express backend, using PostgreSQL for data persistence.

The system supports two user roles: professors (who manage their own classes) and administrators (who can manage all professors and have broader access). The interface is in Brazilian Portuguese, reflecting the target user base.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom SENAI-inspired theme (blue/red/white/gray palette)
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Session Management**: Express session with MemoryStore (development) / PostgreSQL store (production)
- **API Design**: RESTful endpoints defined in shared/routes.ts with Zod schema validation
- **Authentication**: Custom session-based auth with email/password (separate from Replit Auth integration)

### Data Model
The database schema includes:
- `usuarios` - Teachers and administrators
- `turmas` - Classes/cohorts with year and semester
- `unidades_curriculares` - Curriculum units per class
- `alunos` - Students with enrollment numbers
- `matriculas` - Student-class enrollments (many-to-many)
- `avaliacoes` - Evaluations/assessments per curriculum unit
- `notas` - Individual student grades
- `horarios` - Class schedules
- `frequencia` - Attendance records

### Shared Code Structure
- `shared/schema.ts` - Drizzle table definitions and Zod insert schemas
- `shared/routes.ts` - API route definitions with input/output schemas
- Path aliases: `@/` for client/src, `@shared/` for shared directory

### Authentication Flow
The application uses session-based authentication stored in the database. Login validates email/password against the usuarios table. Protected routes check session.usuarioId middleware. There's also Replit Auth integration available in server/replit_integrations/ for optional SSO.

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via DATABASE_URL environment variable
- **Drizzle Kit**: Database migrations stored in /migrations directory
- **connect-pg-simple**: PostgreSQL session store for production

### Third-Party Libraries
- **xlsx**: Excel file parsing for bulk student imports
- **date-fns**: Date formatting with Portuguese locale support
- **recharts**: Data visualization for grade analytics
- **@uppy/core** and **@uppy/react**: File upload management with dashboard modal
- **@uppy/aws-s3**: S3-compatible upload for Replit Object Storage

### Recent Changes (January 2026)

#### Cache Invalidation Fix
Fixed an issue where newly created evaluations weren't showing in the evaluations list or as columns in the final grades screen. The problem was a queryKey mismatch - the mutation was invalidating `["/api/turmas", classId]` but the query was using `[api.turmas.obter.path, classId]`. All invalidations now use the correct path pattern from the api routes definition.

### Photo Gallery Feature (January 2026)
The student profile page includes a photo gallery for facial recognition purposes:
- **Database table**: `fotos_alunos` stores photo references linked to students
- **Object Storage**: Photos stored in Replit App Storage with presigned URLs
- **Camera Capture**: Multiple photo capture via webcam in browser
- **API Endpoints**: 
  - `GET /api/alunos/:id/fotos` - List student photos
  - `POST /api/alunos/:id/fotos` - Add photo reference
  - `DELETE /api/fotos/:id` - Remove photo
  - `GET /api/uploads/url?objectPath=...` - Serve stored files

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret key for session encryption
- `NODE_ENV` - development/production mode flag

### Replit-Specific Integrations
- `@replit/vite-plugin-runtime-error-modal` - Error overlay in development
- `@replit/vite-plugin-cartographer` - Source mapping for Replit
- `@replit/vite-plugin-dev-banner` - Development environment indicator