# PRD to Plan Workflow

## Identity
- **Name**: PRD to Plan
- **Trigger**: New PRD submitted or updated at `doc/prd.md`
- **Owner**: Super Agent → Deep Planning Agent

## Flow

```
┌─────────────────────────┐
│    1. PRD INGESTION      │
│    Super Agent reads     │
│    doc/prd.md            │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│    2. PRD VALIDATION     │
│    Check completeness    │
│    against template      │
│    Flag missing sections │
└────────────┬────────────┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
 [Complete]     [Incomplete]
     │               │
     │               ▼
     │     ┌──────────────────┐
     │     │ Log blockers     │
     │     │ Request user     │
     │     │ input            │
     │     │ HALT until fixed │
     │     └──────────────────┘
     │
     ▼
┌─────────────────────────┐
│    3. DEEP PLANNING      │
│    Invoke Deep Planning  │
│    Agent with PRD        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│    4. ARCHITECTURE       │
│    System architecture   │
│    Database design       │
│    API design            │
│    Folder structure      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│    5. TASK BREAKDOWN     │
│    Decompose features    │
│    into atomic tasks     │
│    Assign to agents      │
│    Define dependencies   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│    6. PHASED ROADMAP     │
│    Organize tasks into   │
│    sequential phases     │
│    Estimate timelines    │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│    7. PLAN VALIDATION    │
│    Super Agent reviews   │
│    All features covered  │
│    Dependencies valid    │
│    No circular deps      │
└────────────┬────────────┘
             │
     ┌───────┴───────┐
     │               │
     ▼               ▼
 [Valid]         [Invalid]
     │               │
     │               ▼
     │     ┌──────────────────┐
     │     │ Return to Deep   │
     │     │ Planning Agent   │
     │     │ with feedback    │
     │     └──────────────────┘
     │
     ▼
┌─────────────────────────┐
│    8. SAVE ARTIFACTS     │
│    Save roadmap.md       │
│    Save decisions.md     │
│    Set current-phase.md  │
│    Update project-status │
└─────────────────────────┘
```

## Input

- `doc/prd.md` — The Product Requirements Document.
- `.ai/templates/prd-template.md` — Template for validation.

## Output

- `.ai/project-management/roadmap.md` — Complete phased roadmap with all tasks.
- `.ai/project-management/current-phase.md` — Set to Phase 1.
- `.ai/project-management/project-status.md` — Updated to "Planning Complete".
- `.ai/memory/decisions.md` — Architecture and design decisions recorded.

## Validation Rules

1. Every PRD feature maps to at least one task.
2. Every task has a unique ID, agent assignment, and acceptance criteria.
3. Task dependencies form a valid DAG (directed acyclic graph).
4. Database design supports all identified query patterns.
5. API design follows project conventions.
6. Security requirements are addressed.
7. Phase ordering respects dependency chains.

## Error Handling

- **Incomplete PRD**: Log missing sections to `blockers.md`, halt, request user input.
- **Invalid dependencies**: Return to Deep Planning Agent with specific feedback.
- **Missing security considerations**: Flag as blocker, require security plan before proceeding.

## Duration

- Expected: 5–15 minutes for a standard SaaS PRD.
- Maximum: 30 minutes before timeout and escalation.
