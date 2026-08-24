# SecureDocs: Secure Digital Document Management System

## 1. Overview and Main Purpose
**SecureDocs** is a specialized, enterprise-grade digital document and case management system designed specifically for the **Ministry of Home Affairs (MHA)** or similar law enforcement and government entities. 

Its **main purpose** is to provide a highly secure, strictly audited, and role-segregated environment where sensitive cases and their digital evidence (documents) can be uploaded, reviewed, approved, and securely archived. The platform ensures that classified information is only accessible to authorized personnel on a "need-to-know" basis.

---

## 2. Why We Created It
### The Problem:
Law enforcement and government agencies handle highly sensitive digital files (evidence, case reports, legal briefs). Using standard file-sharing systems or emails for these documents introduces massive security risks, including:
- **Unauthorized Access:** Personnel viewing documents outside their jurisdiction or clearance level.
- **Lack of Accountability:** Inability to track exactly *who* viewed or modified a file and *when*.
- **Scattered Workflows:** Inefficient processes where investigating officers, reviewers, and legal teams use different disconnected systems.

### The Solution (SecureDocs):
We built SecureDocs to centralize this workflow under a cryptographic and strict Role-Based Access Control (RBAC) umbrella. Every action is meticulously logged, and document access is programmatically enforced based on the user's role, their assigned cases, and their specific department.

---

## 3. Core Features

### 🔐 Granular Role-Based Access Control (RBAC)
Access is not just based on who you are, but what you are assigned to. The system enforces both global role permissions (e.g., "Can this role upload?") and document-level permissions (e.g., "Is this officer assigned to the specific case this document belongs to?").

### 📁 Advanced Case Management
- **Case Creation & Assignment:** Cases are created with specific priority levels (Low, Medium, High, Critical) and tagged by department.
- **Officer Assignment:** specific Investigating Officers (IOs) are assigned to cases. An IO can *only* see cases they are assigned to.

### 📄 Document Lifecycle Management
Documents flow through a strict approval pipeline:
`Draft` ➔ `UnderReview` ➔ `Approved` ➔ `Rejected` ➔ `Archived`
- **Secure File Handling:** Documents are securely uploaded and stored.
- **Soft & Permanent Deletion:** Features a recycle bin mechanism where documents are soft-deleted and can be restored by an Admin, or permanently deleted if legally required.

### 🕵️ Immutable Audit Trails & Activity Logging
- **Audit Logs:** The `audit.service` records every single interaction (Logins, Unauthorized Access Attempts, Document Views, Status Changes) along with the user's IP Address and User Agent.
- **Case Activities:** A timeline of activities is maintained for every case, ensuring complete transparency.

### 🛡️ Enterprise Security Measures
- **Rate Limiting:** Redis-backed rate limiting protects sensitive endpoints (like login or file downloads) from brute-force or DDoS attacks.
- **JWT Authentication:** Secure, stateless session management.

---

## 4. User Roles Breakdown

| Role | Responsibilities & Access Level |
| :--- | :--- |
| **Admin** | Full system access. Can manage users, roles, restore deleted documents, and view all audit logs. |
| **IO (Investigating Officer)** | Can only view and upload documents to cases they are explicitly assigned to. Cannot change final document statuses. |
| **Reviewer** | Assigned to specific departments. Reviews documents uploaded by IOs and can change their status (e.g., Approve or Reject). Cannot upload new documents. |
| **Legal Liaison** | Can only view and download documents that have successfully reached the `Approved` status. Used for court proceedings or legal review. |
| **Auditor** | Has strictly limited access. Can view case and document metadata (who uploaded it, when, audit logs) for compliance checks, but **cannot** view or download the actual file contents. |

---

## 5. Example Workflow in Action

Let's walk through a real-world scenario of how a piece of evidence is processed in SecureDocs:

1. **Case Creation (Admin):** 
   An Admin creates a new case `CASE-9942` (Financial Fraud) in the Cybercrime department and assigns it to **IO Smith**.
   
2. **Evidence Upload (IO):** 
   **IO Smith** logs in. He only sees `CASE-9942`. He uploads a seized bank statement (PDF) as evidence. The document is automatically marked as `Draft` or `UnderReview`.
   *Audit Log: Records IO Smith's IP address and timestamp of the upload.*
   
3. **Review Process (Reviewer):** 
   **Reviewer Patel** (who oversees the Cybercrime department) logs in. He goes to his case list, sees the new document in `CASE-9942`, clicks the "Eye" icon to view it, verifies the evidence, and changes the status to `Approved`.
   
4. **Legal Handoff (Legal Liaison):** 
   The **Legal Liaison** logs in to prepare for a court hearing. Because the document is now `Approved`, it appears in their dashboard. They download the document to submit to the prosecutor.
   *Audit Log: Records that the Legal Liaison downloaded the file.*
   
5. **Compliance Check (Auditor):** 
   Six months later, an **Auditor** logs in to ensure protocols were followed. They check the `CASE-9942` timeline. They can see that Smith uploaded it, Patel approved it, and the Liaison downloaded it, but the Auditor themselves is blocked by the system from opening the bank statement.

---

## 6. Technical Stack
- **Frontend:** React.js, Tailwind CSS, Zustand (State), Vite.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB (Mongoose) for structured document/case data.
- **Security/Cache:** Redis (for rate limiting), JWT, bcrypt.
