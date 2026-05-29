# How to Use SaaS AI Factory (.ai)

Welcome to the **SaaS AI Factory**! This workspace utilizes an autonomous, multi-agent development pipeline designed to take your Product Requirements Document (PRD) and automatically build, test, review, and deploy a complete SaaS application.

Because the system is driven entirely by cooperative AI agents, **you do not need to run local shell commands or execute scripts manually.** The AI agents act as the strategic planners and software engineers.

Here is the exact step-by-step process to utilize this factory.

---

## 🚀 The Development Workflow

### Step 1: Complete the PRD Document
Open and complete the Product Requirements Document located at:
👉 **[doc/prd.md](../doc/prd.md)**

Ensure you fill in all sections thoroughly. The quality and specificity of your feature requirements, user roles, data entities, and acceptance criteria directly correlate to the quality of the generated codebase.

### Step 2: Save the File
Make sure the completed file is saved at `doc/prd.md`.

### Step 3: Trigger Ingestion & Planning
Message the AI Assistant (Master Orchestrator / Super Agent) in the chat:
> *"I have completed my PRD. Please ingest doc/prd.md and start code generation."*

---

## 🛠️ Behind the Scenes (Autonomous Pipeline)

Once triggered, the Cooperating Agents will execute the following workflows:

```
┌─────────────────────────────────┐
│       1. PRD Ingestion          │
│  Super Agent reads and checks   │
│  doc/prd.md for completeness.   │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│       2. Deep Planning          │
│  Designs database schemas, APIs,│
│  architecture, & roadmap.       │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│       3. Task Breakdown         │
│  Roadmap is saved as tasks in   │
│  .ai/project-management/        │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     4. Phase Execution          │
│  Backend and Frontend agents    │
│  write the code phase-by-phase. │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│      5. QA & Review             │
│  QA Agent runs tests; Reviewer  │
│  audits code quality & security.│
└─────────────────────────────────┘
```

---

## 📊 Monitoring Progress

You can watch the build progress and review logs at any time by inspecting the status files in the **`.ai/project-management/`** directory:
* **[roadmap.md](file:///d:/Umang/provenpeak/saasAi/.ai/project-management/roadmap.md)**: View the generated technical plan and structured phase checklist.
* **[project-status.md](file:///d:/Umang/provenpeak/saasAi/.ai/project-management/project-status.md)**: Check the high-level project status (Awaiting PRD, Planning, In Progress, Blocked, Completed).
* **[progress.md](file:///d:/Umang/provenpeak/saasAi/.ai/project-management/progress.md)**: Track the active task list showing which agent is working on what task, along with success/failure logs.
