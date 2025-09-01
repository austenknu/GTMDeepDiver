# GTM Deep Diver

A new tool that guides sales strategy and research agents through systematic company deep-dives, transforming public evidence into pain-point maps and quantified ROI business cases with persona-aware outreach assets.

## 🎯 Overview

GTM Deep Diver helps sales teams conduct systematic research by:
- **Guided Research Process**: 7-phase wizard for comprehensive company analysis
- **Evidence Management**: Centralized collection of URLs, files, and notes with provenance tracking
- **AI-Powered Insights**: Automated signal extraction and pain point mapping
- **ROI Quantification**: Multi-scenario financial analysis with sensitivity modeling
- **Stakeholder Mapping**: Persona-based decision maker analysis
- **Outreach Generation**: Automated, personalized outreach with source attribution

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript
- **Styling**: TailwindCSS + shadcn/ui components
- **Forms**: React Hook Form + Zod validation
- **State**: TanStack Query for server state
- **Backend**: Next.js Route Handlers (REST API)
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis (Upstash) for rate limiting and caching
- **Jobs**: BullMQ for background processing
- **Auth**: Clerk for SSO and user management
- **Storage**: AWS S3 for file uploads

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API route handlers
│   ├── dashboard/         # Dashboard page
│   ├── projects/          # Project management pages
│   └── sign-in/           # Authentication pages
├── components/            # Reusable UI components
│   └── ui/               # Base UI components (shadcn/ui)
├── features/             # Feature-specific components and hooks
│   ├── auth/             # Authentication features
│   ├── evidence/         # Evidence management
│   ├── projects/         # Project management
│   ├── roi/              # ROI calculation
│   └── stakeholders/     # Stakeholder mapping
├── lib/                  # Core utilities and configurations
│   ├── workers/          # Background job workers
│   ├── schemas.ts        # Zod validation schemas
│   ├── db.ts            # Database connection
│   ├── redis.ts         # Redis configuration
│   └── utils.ts         # General utilities
└── types/               # TypeScript type definitions
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (local or hosted)
- Redis instance (Upstash recommended)
- Clerk account for authentication

### Installation

1. **Clone and setup:**
   ```bash
   git clone https://github.com/austenknu/GTMDeepDiver.git
   cd GTMDeepDiver
   npm install
   ```

2. **Environment configuration:**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your actual values
   ```

3. **Database setup:**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/gtm_deep_diver"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# OpenAI (for NLP processing)
OPENAI_API_KEY=sk-...

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=gtm-deep-diver-files
```

## 📊 Features

### 7-Phase Research Wizard

1. **Industry Scan**: Research industry trends and competitive landscape
2. **Company Scan**: Gather evidence about target company
3. **Pain Map**: Map evidence to business pain points with confidence scores
4. **ROI Model**: Calculate quantified business value with sensitivity analysis
5. **Stakeholders**: Identify and map decision makers by persona
6. **Outreach Kit**: Generate persona-specific outreach assets
7. **QA & Review**: Quality assurance and contrarian analysis

### Evidence Management
- **Multi-format Support**: URLs, file uploads, and manual notes
- **Automatic Processing**: Background fetching and metadata extraction
- **AI Summarization**: Automated signal extraction from content
- **Deduplication**: Content hash-based duplicate prevention
- **Security Scanning**: File uploads scanned before approval

### ROI Calculator
- **Multi-scenario Analysis**: Conservative, likely, and optimistic scenarios
- **Sensitivity Modeling**: Automatic scaling of benefit parameters
- **Business Metrics**: Hours saved, error reduction, cloud optimization, risk mitigation
- **Validation Warnings**: Reasonableness checks for input parameters

### Stakeholder Mapping
- **Persona Types**: Economic Decider, Technical Evaluator, User Owner, Compliance/Procurement
- **Goal Tracking**: Likely objectives and success metrics
- **Objection Handling**: Anticipated concerns and proof points
- **Contact Management**: LinkedIn and other professional profile links

### Outreach Generation
- **Template Engine**: Persona and channel-specific templates
- **Dynamic Content**: ROI data and pain points automatically inserted
- **Source Attribution**: All claims linked to evidence sources
- **Multiple Channels**: Email and LinkedIn DM formats

## 🔒 Security

### Authentication & Authorization
- **SSO Integration**: Clerk-powered authentication with MFA support
- **Role-Based Access**: Admin, User, and Guest roles with granular permissions
- **Project Ownership**: Users can only access their own projects (unless admin)
- **Session Management**: Secure JWT handling with automatic refresh

### API Security
- **Rate Limiting**: Per-user and per-IP rate limits on all endpoints
- **Input Validation**: Zod schema validation on all API boundaries
- **Error Handling**: Secure error responses without information leakage
- **Audit Logging**: Comprehensive activity logging for compliance

### Data Protection
- **Encryption**: All data encrypted in transit and at rest
- **File Security**: Uploaded files quarantined and scanned before approval
- **PII Handling**: Minimal data collection with secure processing
- **Backup & Recovery**: Automated database backups with point-in-time recovery

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

### Test Coverage Requirements
- **Minimum Coverage**: 80% line coverage
- **API Testing**: All endpoints tested with Supertest
- **Component Testing**: React Testing Library for UI components
- **E2E Testing**: Playwright for critical user flows

## 📈 Performance

### Optimization Strategies
- **Server-Side Rendering**: Next.js SSR for fast initial page loads
- **Code Splitting**: Dynamic imports for heavy components
- **Image Optimization**: Next.js Image component with WebP support
- **Caching**: Redis caching for external API responses
- **Database**: Optimized queries with proper indexing

### Performance Targets
- **TTFB**: < 200ms (p95)
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Setup
1. Configure environment variables in Vercel dashboard
2. Set up PostgreSQL database (Neon or Supabase recommended)
3. Configure Redis instance (Upstash)
4. Set up Clerk authentication
5. Configure AWS S3 bucket for file storage

## 📚 API Documentation

### Core Endpoints

#### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

#### Evidence
- `GET /api/projects/:id/evidence` - List project evidence
- `POST /api/projects/:id/evidence` - Add evidence source
- `PATCH /api/projects/:id/evidence/:evidenceId` - Update evidence
- `DELETE /api/projects/:id/evidence/:evidenceId` - Delete evidence

#### Analysis
- `POST /api/projects/:id/pain` - Create pain point mapping
- `POST /api/projects/:id/roi` - Calculate ROI scenarios
- `POST /api/projects/:id/stakeholders` - Add stakeholder
- `POST /api/projects/:id/outreach` - Generate outreach asset
- `POST /api/projects/:id/export` - Generate project export

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with proper tests
4. Run the test suite: `npm test`
5. Commit using conventional commits: `git commit -m "feat: add amazing feature"`
6. Push to your branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines
- **Code Style**: Prettier + ESLint with TypeScript strict mode
- **Commit Format**: Conventional Commits for automated versioning
- **Testing**: All new features must include tests
- **Documentation**: Update README and add JSDoc comments
- **Security**: Follow OWASP guidelines and security checklist

## 📄 License

This project is licensed under the MIT License 

Built for sales professionals who value systematic research and data-driven outreach.
