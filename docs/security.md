# Security & Cryptographic Design

## 1. Cryptographic Principles

### A. AES-256 Symmetric Paper Content Encryption
Question paper text contents are encrypted prior to insertion into the database table `papers`:
- **Cipher**: AES-256-GCM / Fernet specification (`cryptography.fernet`).
- **Key Storage**: Environment variable `PAPER_ENCRYPTION_KEY`. Encryption keys are never written to database tables or source code.
- **Decryption Protocol**: Content is decrypted dynamically in memory only when an authorized HTTP request satisfies all 5 security gates.

### B. SHA-256 Integrity Checksums
Each question paper record maintains a SHA-256 cryptographic hash (`content_hash`) computed over its raw content prior to encryption. Any tampering with encrypted storage or database records invalidates checksum matching.

### C. Password Security
Passwords are hashed using `passlib[bcrypt]` with automatically managed salt parameters. Plaintext passwords are never stored or logged.

### D. JWT Session Authentication
Authenticated sessions use JSON Web Tokens (JWT) signed with HMAC-SHA256 (`HS256`). Tokens include:
- `sub`: Username
- `role`: Role enum value
- `exp`: UTC expiration timestamp

---

## 2. Security Gatekeeper Protocol (Printing Portal)

Before question paper content is decrypted for printing, the system executes 5 sequential security checks:

```
    HTTP Request to /api/v1/printing/verify-and-access
                         │
                         ▼
        ┌──────────────────────────────────┐
        │ 1. User Authenticated via JWT?   │ ── NO ──► Deny (401)
        └────────────────┬─────────────────┘
                         │ YES
                         ▼
        ┌──────────────────────────────────┐
        │ 2. Role in [PRINTING, ADMIN]?    │ ── NO ──► Deny (403) & Audit
        └────────────────┬─────────────────┘
                         │ YES
                         ▼
        ┌──────────────────────────────────┐
        │ 3. Paper Status == RELEASED?     │ ── NO ──► Deny (403) & Audit
        └────────────────┬─────────────────┘
                         │ YES
                         ▼
        ┌──────────────────────────────────┐
        │ 4. Current Time >= Release Time? │ ── NO ──► Deny (403) & Security Alert
        └────────────────┬─────────────────┘
                         │ YES
                         ▼
        ┌──────────────────────────────────┐
        │ 5. SHA-256 Integrity Check Match?│ ── NO ──► Deny (500) & Critical Alert
        └────────────────┬─────────────────┘
                         │ YES
                         ▼
             Decrypt & Grant Access
```
