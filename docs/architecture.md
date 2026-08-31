# System Architecture Documentation

## 1. Overview
SecureExam is a full-stack, enterprise-grade academic security platform and research framework designed to securely manage the complete lifecycle of examination question papers, prevent unauthorized access/leaks, record granular audit logs, and detect suspicious activity using rule-based and machine-learning anomaly detection algorithms under normal, abnormal, and evasive access scenarios.

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           React Frontend UI                                 │
│  (Tailwind CSS + Lucide Icons + Recharts + Glassmorphism Aesthetic)          │
│                                                                             │
│  ├── Administrator Dashboard & Audit Portal                                 │
│  ├── Paper Setter Workspace & Revision Editor                               │
│  ├── Moderator Approval & Rejection Drawer                                  │
│  ├── Examination Controller Release Scheduler & Countdown Timers            │
│  └── Authorized Printing Staff Schedule-Locked Portal                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ REST API (HTTPS / JWT Bearer)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            FastAPI Backend Engine                           │
│                                                                             │
│  ├── Auth & Role-Based Access Control (RBAC Middleware)                     │
│  ├── Cryptography Engine (AES-256-GCM Encryption / SHA-256 Integrity)        │
│  ├── Paper State Machine Engine (Strict Status Transition Validation)       │
│  ├── Release-Time Access Gatekeeper (Time-bound Lock)                       │
│  └── Audit Logger & Security Alert Engine                                   │
└──────────────┬──────────────────────────────────────────────┬───────────────┘
               │ SQLAlchemy ORM                               │ Event Logs / Features
┌──────────────▼──────────────┐                 ┌─────────────▼──────────────┐
│     Relational Database     │                 │   Detection & ML Framework │
│  - Users & Roles            │                 │  - Synthetic Generator     │
│  - Question Papers          │                 │  - Rule-Based Baseline     │
│  - Versions & Reviews       │                 │  - Supervised ML (LogReg,RF)│
│  - Schedules & Release Logs │                 │  - Isolation Forest (Unsup)│
│  - Audit Logs & Alerts      │                 │  - Evasive Scenario Engine │
└─────────────────────────────┘                 └────────────────────────────┘
```

---

## 3. Paper Lifecycle State Machine Graph

```
 [Paper Setter]
      │ Prepare & Upload
      ▼
   DRAFT ──────────────► SUBMITTED
                           │
                           │ [Moderator Review]
                           ▼
                      UNDER_REVIEW
                     /            \
       Rejection    /              \   Approval
     (Reason Req.) /                \
                  ▼                  ▼
              REJECTED            APPROVED
                  │                  │
   Paper Setter   │                  │ [Exam Controller]
   Revises &      │                  ▼
   Resubmits ─────┘              SCHEDULED
                                     │
                                     │ Scheduled Time Reached &
                                     │ Controller Authorization
                                     ▼
                                 RELEASED
                                     │
                                     │ [Printing Staff Verified Access]
                                     ▼
                                  PRINTED (Terminal State)
```

### Invalid State Transitions Enforced by Backend Engine
- **Printing REJECTED paper**: Strictly forbidden (HTTP 403 / Audit Logged).
- **Printing APPROVED paper before SCHEDULED release time**: Denied & Alert Created.
- **Releasing REJECTED paper**: Forbidden by State Machine.
- **Accessing paper before release timestamp**: Blocked by Time-Release Access Gatekeeper.

---

## 4. User Roles & Permitted Operations

| Role | Permitted Actions | Restricted Actions |
| :--- | :--- | :--- |
| **Administrator** | User mgmt, view all audit logs, manage security alerts, inspect ML metrics, system config. | Cannot modify question paper content directly without audit record. |
| **Paper Setter** | Prepare paper, upload paper, revise rejected paper, view own paper status. | Cannot approve own paper, schedule paper, or print papers. |
| **Moderator** | Review assigned papers, approve paper, reject paper with mandatory reason. | Cannot edit paper content or schedule exam release. |
| **Examination Controller** | Receive approved papers, set exam date & release time, initiate scheduled release. | Cannot modify paper text or bypass moderator rejection. |
| **Authorized Printing Staff** | Access and print RELEASED papers at or after scheduled release time. | Cannot view unreleased papers or modify paper states. |
