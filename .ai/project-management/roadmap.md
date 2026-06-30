# Phased Roadmap for ExpenseFlow AI

This roadmap defines the project timeline, task specifications, and implementation sequence for the multi-tenant expense management SaaS.

---

## Project Phases

### Phase 1: Project Foundation, Scaffolding & Multi-Tenant Architecture
- NestJS & Next.js base workspaces scaffolding, Docker Compose setup (MongoDB + Redis).
- Tenant Context isolation hooks using AsyncLocalStorage and Mongoose Tenant Isolation Plugin.
- Core database connections, schema registration (Organization, User, Role, Permission, Department, Designation).

### Phase 2: Authentication, Authorization & User Onboarding (RBAC)
- Multi-tenant JWT Authentication APIs (Signup, Login, Token Refresh, Password Reset).
- Tenant Invitation flow, secure link generation, and invite redemption API.
- Frontend Auth Layout and views (Login, Signup, Forgot/Reset Password, Invite Acceptance UI).

### Phase 3: Organization Settings & Employee Directory
- Organization profile configuration, departments, designations CRUD APIs.
- Employee Profile & Directory management backend API (including disable/delete/manager linking).
- Org Settings dashboard, Department/Designation manager UI, and Employee Directory Frontend views.

### Phase 4: Project Management & Vendor Management
- Project CRUD API, project managers assignment, and employees/vendors project linkages.
- Vendor Profile Management (bank details, GST/PAN, contact info) with multi-project mapping support.
- Project Detail Pages, Vendor Directories, and Project Dashboard UI.

### Phase 5: Budget Management & Real-Time Alerts
- Budget schemas and allocations (Organization budget down to Projects).
- Budget limits validator, real-time spent/remaining status tracking API, and over-budget triggers.
- Budget notifications rules architecture & background job workers (Redis + BullMQ) with Alert settings UI.

### Phase 6: Expense Categories, Payment Methods & Expense Submission
- Dynamic Expense Categories (limits, rules) and Payment Methods (Cash, CC, UPI) CRUD APIs.
- Expense creation API supporting GST/VAT, notes, vendor, project, and multipart attachment uploads.
- Expense Claim Submission wizard, receipt upload component, and user expense history tables.

### Phase 7: Dynamic Approval Workflows Engine
- Rule-based project approval workflows configuration engine (dynamic stages).
- Approval transitions executor (Auto-Approvals, Manager approval, Admin approval, history logs).
- Manager Approval Inbox, Reject/Approve dialogs, and Workflow Flow Designer Admin UI.

### Phase 8: Reimbursements, Audit Logs & Global Search
- Reimbursement batches processing & payroll disbursement ledgers API.
- System-wide Action Logger (Audit Logs) for tracking database modifications and login events.
- Reimbursements Processor dashboard, Audit Logs viewer, and global search UI.

### Phase 9: Interactive Dashboards & Financial Reports
- Financial Export Engine generating CSV, Excel, and PDF formats for reporting.
- Advanced Reports Filters API (by project, employee, manager, vendor, category, date range).
- Dashboard cards and charts (Admin Overview, Manager Project view, Employee reimbursement tracker).

### Phase 10: Multi-Channel Notifications, 2FA Security & Polish
- Notification dispatcher service utilizing Redis + BullMQ (Email, In-App Alerts, future WhatsApp templates).
- Advanced security policies (2FA setup, password strength checks, session timeout controls).
- End-to-End integration testing (Playwright + Jest) and production deployment validation.

---

## Detailed Task Breakdown

```yaml
- task:
    id: "PHASE-01-TASK-001"
    title: "Project Scaffolding & Environment Setup"
    agent: "backend-agent"
    priority: "P0"
    complexity: "S"
    dependencies: []
    acceptance_criteria:
      - NestJS (Backend) and Next.js (Frontend) workspace setup
      - Docker Compose configured for MongoDB 8.x and Redis 7.x instances
      - Workspace builds and runs without errors

- task:
    id: "PHASE-01-TASK-002"
    title: "AsyncLocalStorage & Multi-Tenant Mongoose Plugin"
    agent: "backend-agent"
    priority: "P0"
    complexity: "M"
    dependencies: ["PHASE-01-TASK-001"]
    acceptance_criteria:
      - Tenant context hook implemented using AsyncLocalStorage in NestJS
      - Global Mongoose plugin automatically injects organizationId filters into queries
      - Unit tests verify multi-tenant isolation

- task:
    id: "PHASE-01-TASK-003"
    title: "Core Database Schema Setup"
    agent: "backend-agent"
    priority: "P0"
    complexity: "M"
    dependencies: ["PHASE-01-TASK-002"]
    acceptance_criteria:
      - Organization, User, Role, Permission database schemas defined
      - Seed script created for default roles and permissions
      - Database models integrated and tested in NestJS database module

- task:
    id: "PHASE-02-TASK-001"
    title: "JWT Authentication & RBAC Guards"
    agent: "backend-agent"
    priority: "P0"
    complexity: "M"
    dependencies: ["PHASE-01-TASK-003"]
    acceptance_criteria:
      - JWT Sign-in, Sign-up, token refresh, and password reset API endpoints working
      - NestJS guards for Role-Based Access Control (RBAC) and permissions validated
      - Endpoint protection verified via integration tests

- task:
    id: "PHASE-02-TASK-002"
    title: "Tenant Invitation & User Onboarding API"
    agent: "backend-agent"
    priority: "P0"
    complexity: "M"
    dependencies: ["PHASE-02-TASK-001"]
    acceptance_criteria:
      - Secure employee invite token generator endpoint
      - Invitation redemption and onboarding controller logic complete
      - Email dispatch skeleton for sending invite link

- task:
    id: "PHASE-02-TASK-003"
    title: "Authentication & Onboarding Frontend UI"
    agent: "frontend-agent"
    priority: "P0"
    complexity: "M"
    dependencies: ["PHASE-02-TASK-002"]
    acceptance_criteria:
      - Next.js login, register, reset password, and invitation claim views
      - Integration with NestJS auth endpoints
      - State persistence using Zustand store

- task:
    id: "PHASE-03-TASK-001"
    title: "Organization, Department & Designation Settings API"
    agent: "backend-agent"
    priority: "P0"
    complexity: "M"
    dependencies: ["PHASE-02-TASK-002"]
    acceptance_criteria:
      - CRUD endpoints for Organization profile, Departments, and Designations
      - Input validation and RBAC checks added
      - Verification tests for settings retrieval and updates

- task:
    id: "PHASE-03-TASK-002"
    title: "Employee Profile & Directory API"
    agent: "backend-agent"
    priority: "P0"
    complexity: "M"
    dependencies: ["PHASE-03-TASK-001"]
    acceptance_criteria:
      - Employees management endpoints (List, Update, Disable, Delete)
      - Fields: Employee ID, Joining Date, Manager, Mobile, Profile Image
      - Validated RBAC rules for directory viewing

- task:
    id: "PHASE-03-TASK-003"
    title: "Organization Settings & Directory Frontend UI"
    agent: "frontend-agent"
    priority: "P1"
    complexity: "M"
    dependencies: ["PHASE-03-TASK-002"]
    acceptance_criteria:
      - Admin view for Org Settings, Department/Designation setup lists
      - Paginated Employee directory table with status toggles
      - Invite employee dialog modal integrating backend endpoints

- task:
    id: "PHASE-04-TASK-001"
    title: "Project Management CRUD API"
    agent: "backend-agent"
    priority: "P0"
    complexity: "M"
    dependencies: ["PHASE-03-TASK-002"]
    acceptance_criteria:
      - CRUD operations for Projects (Name, Code, Client, Budget, Currency, Dates, Status)
      - Assign Project Managers and Employees endpoints
      - Verification logic ensuring user-project association works

- task:
    id: "PHASE-04-TASK-002"
    title: "Vendor Management CRUD & Linking API"
    agent: "backend-agent"
    priority: "P0"
    complexity: "M"
    dependencies: ["PHASE-04-TASK-001"]
    acceptance_criteria:
      - Vendor entity CRUD (Name, Company, GST/PAN, contact info, bank details)
      - Link vendors to organization level and/or specific project levels
      - Endpoint to query vendor projects served and expense history

- task:
    id: "PHASE-04-TASK-003"
    title: "Projects & Vendor Dashboard Frontend UI"
    agent: "frontend-agent"
    priority: "P1"
    complexity: "M"
    dependencies: ["PHASE-04-TASK-002"]
    acceptance_criteria:
      - Project list page showing status, dates, and budget health bar
      - Project member assignments manager component
      - Vendor directory view with company status, bank info, and association controls

- task:
    id: "PHASE-05-TASK-001"
    title: "Budget Schemas, Allocation & Tracking API"
    agent: "backend-agent"
    priority: "P0"
    complexity: "M"
    dependencies: ["PHASE-04-TASK-002"]
    acceptance_criteria:
      - Organization budgets & Projects budgets database schema
      - Allocation APIs with hierarchical validations (Project <= Org budget)
      - Spent vs remaining real-time calculations hook on expense verification

- task:
    id: "PHASE-05-TASK-002"
    title: "Budget Alert Notification Rules & Background Jobs"
    agent: "backend-agent"
    priority: "P1"
    complexity: "M"
    dependencies: ["PHASE-05-TASK-001"]
    acceptance_criteria:
      - Redis and BullMQ background workers initialized
      - Threshold calculation engine triggerable on new expense actions
      - Budget warnings dispatched to queue for alerts (Admin/PM notifications)

- task:
    id: "PHASE-05-TASK-003"
    title: "Budget Controls & Alerts UI"
    agent: "frontend-agent"
    priority: "P2"
    complexity: "S"
    dependencies: ["PHASE-05-TASK-002"]
    acceptance_criteria:
      - Budget allocation forms and list views in project setup
      - Alert threshold setting slider (e.g., alert at 80% usage)
      - Alert log list displaying project threshold warnings

- task:
    id: "PHASE-06-TASK-001"
    title: "Dynamic Categories & Payment Methods CRUD API"
    agent: "backend-agent"
    priority: "P0"
    complexity: "S"
    dependencies: ["PHASE-04-TASK-002"]
    acceptance_criteria:
      - CRUD for Expense Categories with dynamic rules (receipt requirement, individual limits)
      - CRUD for Payment Methods (Cash, Cards, UPI, Transfer) managed by Org Admin
      - Integration tests verifying categories and payment methods

- task:
    id: "PHASE-06-TASK-002"
    title: "Expense Claim Submission & Receipt Upload API"
    agent: "backend-agent"
    priority: "P0"
    complexity: "H"
    dependencies: ["PHASE-06-TASK-001"]
    acceptance_criteria:
      - Multipart expense creation API capturing Amount, Currency, Categories, GST, Projects, Vendors
      - AWS S3 or Local disk multipart file upload integration for receipts (PDF, Image)
      - Verification rules checking mandatory receipt requirement & category limit rules

- task:
    id: "PHASE-06-TASK-003"
    title: "Expense Claim Wizard & Receipt Uploader UI"
    agent: "frontend-agent"
    priority: "P0"
    complexity: "M"
    dependencies: ["PHASE-06-TASK-002"]
    acceptance_criteria:
      - Stepper-based Expense Claim Wizard UI
      - File drag-and-drop receipt upload UI component
      - Employee expense history list with status badges

- task:
    id: "PHASE-07-TASK-001"
    title: "Approval Workflow Rules Engine Config"
    agent: "backend-agent"
    priority: "P0"
    complexity: "M"
    dependencies: ["PHASE-06-TASK-002"]
    acceptance_criteria:
      - DB Schema representing workflow steps (e.g. Employee -> Manager -> Admin)
      - Project-specific workflow override configurations endpoints
      - Verification of workflow rule validation logic

- task:
    id: "PHASE-07-TASK-002"
    title: "Approval Engine Transitions & History API"
    agent: "backend-agent"
    priority: "P0"
    complexity: "H"
    dependencies: ["PHASE-07-TASK-001"]
    acceptance_criteria:
      - Workflow state transition engine (Submitted -> Under Review -> Approved/Rejected)
      - Auto-approval rule validations (e.g. amount < limit, auto-approve)
      - Audit trail log for approval history (Who, When, Decision, Notes)

- task:
    id: "PHASE-07-TASK-003"
    title: "Workflow Inbox & Designer Frontend UI"
    agent: "frontend-agent"
    priority: "P0"
    complexity: "H"
    dependencies: ["PHASE-07-TASK-002"]
    acceptance_criteria:
      - Manager & Admin Approval Inbox displaying pending claims with detail modal
      - Dynamic visual diagram or form UI to design the approval sequence
      - Batch approve/reject support and status logs

- task:
    id: "PHASE-08-TASK-001"
    title: "Reimbursements Batches & Payroll Ledger API"
    agent: "backend-agent"
    priority: "P1"
    complexity: "M"
    dependencies: ["PHASE-07-TASK-002"]
    acceptance_criteria:
      - Reimbursement model and payroll batch generator API
      - Mark batch as Paid with payment method, reference, and payout dates
      - Validated ledger query capabilities

- task:
    id: "PHASE-08-TASK-002"
    title: "Audit Logging System & Global Search API"
    agent: "backend-agent"
    priority: "P1"
    complexity: "H"
    dependencies: ["PHASE-08-TASK-001"]
    acceptance_criteria:
      - Middleware/Hook capturing all DB operations, logouts, logins, budget updates
      - Elastic/MongoDB text indices configured for global multi-entity searches
      - Secure endpoint serving paginated audit trails and global search results

- task:
    id: "PHASE-08-TASK-003"
    title: "Ledger, Audit Log Viewer & Global Search UI"
    agent: "frontend-agent"
    priority: "P1"
    complexity: "M"
    dependencies: ["PHASE-08-TASK-002"]
    acceptance_criteria:
      - Org Admin view for Reimbursement Ledgers and payouts management
      - Audit log timeline visualizer
      - Topbar global search input displaying matching entities (users, expenses, projects)

- task:
    id: "PHASE-09-TASK-001"
    title: "Financial Export Engine & Advanced Filters API"
    agent: "backend-agent"
    priority: "P1"
    complexity: "M"
    dependencies: ["PHASE-08-TASK-002"]
    acceptance_criteria:
      - Excel/CSV workbook generator utility using `exceljs` / `fast-csv`
      - PDF layout renderer utilizing `pdfkit` / custom templates
      - Advanced multi-filter reporting controller endpoint

- task:
    id: "PHASE-09-TASK-002"
    title: "Analytics Aggregators API"
    agent: "backend-agent"
    priority: "P1"
    complexity: "M"
    dependencies: ["PHASE-09-TASK-001"]
    acceptance_criteria:
      - MongoDB aggregation pipelines compiling total spent, project spent, category graphs
      - Cached dashboard statistics service with invalidation rules
      - Secure statistics controller endpoint

- task:
    id: "PHASE-09-TASK-003"
    title: "Admin, PM, and Employee Dashboards & Exports UI"
    agent: "frontend-agent"
    priority: "P0"
    complexity: "H"
    dependencies: ["PHASE-09-TASK-002"]
    acceptance_criteria:
      - Dashboards populated with Shadcn UI cards, charts (using Recharts or similar)
      - Filter panel to isolate views by dates, projects, and departments
      - Download report modal integrating CSV/Excel/PDF exports

- task:
    id: "PHASE-10-TASK-001"
    title: "Multi-Channel Notification Dispatcher Polish"
    agent: "backend-agent"
    priority: "P2"
    complexity: "M"
    dependencies: ["PHASE-09-TASK-002"]
    acceptance_criteria:
      - Queue dispatch templates (Nodemailer email layouts, in-app notifications)
      - Event listeners dispatching emails for Expense Submitted, Rejected, Budget Warning
      - In-app notification center dashboard component in Next.js

- task:
    id: "PHASE-10-TASK-002"
    title: "Security Enhancements (2FA, Sessions & Session Controls)"
    agent: "backend-agent"
    priority: "P1"
    complexity: "M"
    dependencies: ["PHASE-10-TASK-001"]
    acceptance_criteria:
      - Time-based One-time Password (TOTP) backend validation service (Google Authenticator)
      - Session timeouts and JWT expiration validation
      - UI dashboard components to activate 2FA and view login history

- task:
    id: "PHASE-10-TASK-003"
    title: "E2E Playwright Tests & Final Validation"
    agent: "qa-agent"
    priority: "P0"
    complexity: "H"
    dependencies: ["PHASE-10-TASK-002"]
    acceptance_criteria:
      - Complete Playwright test scenarios (Onboarding, Submission, Approval, Export)
      - Build validation and production Docker Compose test runs
      - Final release checklist confirmed
```
