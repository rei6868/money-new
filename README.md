# Financial Management System Migration

## Project Overview
This project aims to migrate and standardize the financial management system from AppSheet + Google Sheet to a modern web application using Neon DB.

## Sprint 3 Enhancements
- Streamlined the transactions experience by focusing on core column metadata (`/api/transactions/columns`) and removing legacy filter/sort flows from the UI and API responses.
- Introduced a persistent collapsed sidebar preference and refreshed the product iconography with a money bag favicon and updated manifest assets.

### Development Flow
1. **Database Design & Implementation**
   - ERD design
   - Schema implementation
   - Data migration strategy

2. **API Development**
   - RESTful API design
   - Endpoint implementation
   - API documentation

3. **Business Logic**
   - Core financial calculations
   - Data validation
   - Business rules implementation

4. **User Interface**
   - Responsive design
   - User-friendly interfaces
   - Interactive components

5. **Automation Testing**
   - Unit tests
   - Integration tests
   - E2E testing

## Getting Started

### Prerequisites
- Node.js 16.x or higher
- npm 7.x or higher
- Neon DB account

### Local Development
1. Clone the repository
```bash
git clone https://github.com/rei6868/gemini-money.git
cd gemini-money
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your Neon DB credentials
```

4. Start development server
```bash
npm run dev
```

### End-to-End Testing with Cypress

Cypress is configured for browser-based end-to-end testing.

1. Ensure the development server is running in a separate terminal (`npm run dev`).
2. Open the interactive Cypress Test Runner:
   ```bash
   npm run cypress:open
   ```
3. Execute the Cypress suite in headless mode:
   ```bash
   npm run cypress:run
   ```

### Deployment
Deployment instructions will be added as the project progresses.

### Database Operations
- `npm run db:push` – Uses Drizzle Kit to push the current schema to the Neon database defined by `DB_URL`.
- `npm run db:deploy` – Wraps the push command with logging to `logs/` for auditing deployment runs.
- `npm run db:verify` – Connects to Neon, inspects the live schema, and writes a verification report to `docs/neon-schema-verification.md` comparing it with the documented expectations.

Ensure `DB_URL` is configured in your `.env` before running any of the database commands.

## Documentation
- Technical documentation can be found in the `/docs` directory
- API documentation will be available once endpoints are implemented
- Database schema documentation will be maintained in `/docs/database`

## Sprint 3 Backend Hotfix Summary
- Hardened the modular transactions dataset pipeline with strict type-safe conversions to satisfy the new TypeScript checks.
- Tightened filter, restore, and API request parsing to guarantee sort metadata and query parameters conform to the shared schema.
- Reconfirmed the suite (`npm test`, `npm run lint`, `npm run build`) to keep Vercel deployments green for the sprint deliverable.

## Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Neon DB Documentation](https://neon.tech/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
