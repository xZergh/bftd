# Authentication, Authorization & Data Protection Architecture

**Status:** Draft for review
**Scope:** Identity, authentication, RBAC authorization, multi-tenancy, encryption at rest, key management, password recovery, audit logging, backups & recovery for TCMS.
**Audience:** Engineering, security reviewers, prospective enterprise customers.

---

## 1. Context

TCMS today is a **standalone, backend-first Test Case Management System**: Node 24 + GraphQL Yoga + Drizzle ORM + **SQLite** (single-file DB), with a React 19 / Tamagui / urql web client (`apps/web`). There is **no authentication, authorization, multi-tenancy, or encryption** in the codebase yet — only stub tests (`LOGIN-REQ-1/2`) exist.

We are a small (shoestring) startup, but we are selling into **enterprise** buyers. That dual reality drives every decision below: we need enterprise-grade **security, transparency, and control**, delivered with **minimal moving parts** and the ability to run **standalone** when a customer requires it.

### Goals

1. **Secure, standalone login** — self-contained local accounts that work with zero external dependencies.
2. **Maximize admin-side control** — the customer's own admin owns user lifecycle, roles, and policy; we (the platform) touch their data as little as possible and only with an audit trail.
3. **Combinable roles** — `admin`, `manager`, `tester`, `dev`, assignable in any combination.
4. **Multi-tenant** with **full org isolation** (decided: database-per-tenant).
5. **Platform superadmin** for troubleshooting, gated and fully audited.
6. **Encryption** — full-DB at rest **and** field-level encryption for the most sensitive data.
7. **Recovery** — password recovery, scheduled encrypted backups with retention, and tested restore.
8. **Audit access log** — who did what, when, across both tenant and platform planes.

### Decisions locked in this review

| Area | Decision |
|------|----------|
| Identity | **Local accounts now, pluggable SSO (OIDC/SAML) later** |
| Tenancy | **Multi-tenant, database-per-tenant** (full org isolation) + minimal shared control plane |
| Encryption | **Full-DB at rest (SQLCipher) + field-level envelope encryption** for secrets/PII |
| Key custody | **Pluggable: `FileKeyProvider` (standalone default), Azure Key Vault (SaaS default), Vault/OpenBao deferred** |
| Sessions | **Server-side opaque sessions in the control-plane DB**; Redis deferred |
| Email | **`Mailer` over SMTP submission; no self-run mail server** (customer SMTP standalone, SES/Postmark for SaaS) |
| Backups | **Built-in scheduler + retention + verified restore** |
| Audit | **Append-only audit log** on tenant and platform planes |
| Compliance | **Design toward SOC 2 now; certify post-funding** (see §15) |

---

## 2. Tenancy model: database-per-tenant + a minimal control plane

**Decision: one encrypted SQLite database per tenant (org), with its own data encryption key.** This gives the strongest isolation, the simplest "delete a customer" and "restore one customer" stories, and a natural blast-radius boundary: a bug or breach in one tenant's data path cannot read another tenant's bytes because they are in a different, separately-keyed file.

### Why we still need a small shared "control plane" DB (the question you raised)

Even with full per-tenant isolation for *org data*, a tiny shared database is unavoidable and desirable. You cannot bootstrap a login or route a request to the right tenant DB without first answering "who is this and which tenant do they belong to" — and that lookup has to live *somewhere outside* any single tenant DB. Concretely, the control plane holds only:

- **Tenant registry** — tenant id, slug, status, which DB file/connection + which key id, SSO config pointer.
- **Global identity index** — email → tenant(s) mapping, *only* enough to route login. (Credentials themselves can live in the tenant DB; see §4.4.)
- **Platform staff** — superadmins, with their own auth and step-up.
- **Platform audit log** — every superadmin action, tenant create/suspend/delete, key rotation, restore.
- **Backup/job metadata** — schedule state, last-run, retention bookkeeping (never the backup *contents*).

It deliberately holds **no QA data, no test cases, no requirements** — that is all in per-tenant DBs.

**What a "small shared DB for everything" (shared-DB, `tenant_id` column) would have bought us, and why we are not doing it:**

- *Benefits we give up:* one connection pool, one migration to run, trivially cheap cross-tenant analytics, one file to back up, and no per-tenant key orchestration. For a B2C app with millions of tiny tenants, that operational simplicity is the right call.
- *Why it loses for us:* isolation becomes a property of *application code* ("did every query remember `WHERE tenant_id = ?`"). One missed clause leaks across customers. A shared key means one stolen file exposes everyone. Per-tenant restore/delete becomes surgery on a shared table instead of a file operation. For enterprise buyers who ask "prove my data is isolated," "different file, different key" is a far stronger and more auditable answer than "we're careful with WHERE clauses."

So: **hybrid by necessity** — minimal shared control plane for routing/auth/audit, full DB-per-tenant for all customer data. This is the standard enterprise SaaS shape and it keeps the shared surface tiny enough to reason about.

### Cost of this choice (be honest)

- Connection management: a small **LRU pool of open SQLite handles** keyed by tenant, opened on demand with that tenant's key, closed on idle.
- Migrations must **fan out** across all tenant DBs (a migration runner that iterates the registry; control-plane migration is separate). Drizzle migrations already exist; we add an orchestrator.
- "Noisy" cross-tenant reporting requires aggregation jobs rather than a single query — acceptable, and arguably healthier.

---

## 3. High-level architecture

```
                        ┌──────────────────────────────────────────────┐
   Browser (apps/web)   │              TCMS API (GraphQL Yoga)           │
   urql + session       │                                                │
   cookie  ───────────► │  ┌────────────┐   ┌──────────────────────┐    │
                        │  │ Auth layer │   │ Authorization layer   │    │
                        │  │ - login    │   │ - context: identity,  │    │
                        │  │ - sessions │   │   roles, tenant        │    │
                        │  │ - SSO (opt)│   │ - policy guards on     │    │
                        │  │ - recovery │   │   resolvers/mutations  │    │
                        │  └─────┬──────┘   └───────────┬────────────┘    │
                        │        │                      │                 │
                        │  ┌─────▼──────────────────────▼───────────┐     │
                        │  │  Tenant DB resolver + key provider      │     │
                        │  └─────┬───────────────────────────┬──────┘     │
                        └────────┼───────────────────────────┼────────────┘
                                 │                           │
                    ┌────────────▼─────────┐      ┌──────────▼───────────┐
                    │  Control-plane DB     │      │  Key provider (KMS / │
                    │  (tenants, identity   │      │  file) → tenant DEKs  │
                    │  index, platform      │      └──────────┬───────────┘
                    │  staff, audit, jobs)  │                 │
                    └───────────────────────┘     ┌───────────▼───────────┐
                                                   │  Per-tenant encrypted │
                                                   │  SQLite (SQLCipher)   │
                                                   │  + field-level enc.   │
                                                   └───────────┬───────────┘
                                                               │
                                                   ┌───────────▼───────────┐
                                                   │  Backup scheduler →    │
                                                   │  encrypted snapshots   │
                                                   │  (local + offsite)     │
                                                   └────────────────────────┘
```

A request flow: cookie → session lookup → resolve identity + tenant → open/borrow that tenant's keyed DB handle → run resolver under an **authorization guard** that checks the user's combined roles → every mutation writes an **audit** row.

---

## 4. Authentication

### 4.1 Principles

- **Standalone-first:** local username/password must work with no internet and no third party.
- **Passwords are never recoverable, only resettable.** We store a verifier, not the password.
- **Pluggable identity:** the login path is an interface so an org can later flip a tenant to SSO without a rewrite.

### 4.2 Password storage

- **Argon2id** (memory-hard) as the primary KDF, via `@node-rs/argon2` (native, fast, maintained). Fallback to `scrypt` (Node built-in `crypto.scrypt`) if a customer environment forbids native modules.
- Per-password random salt (handled by Argon2), tuned cost parameters stored alongside the hash so we can raise cost over time and re-hash on next successful login.
- Constant-time comparison; generic "invalid email or password" error (no user-enumeration signal).

### 4.3 Sessions

**Decision: server-side opaque sessions over a signed, HttpOnly cookie** (not stateless JWTs).

- Why: this is a GraphQL app with a SQLite backend; server-side sessions give us **instant revocation** (logout, "sign out all devices", admin force-logout, password reset invalidation) — a property enterprise security teams expect and JWTs make awkward.
- Cookie: `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict` for the admin surface), signed with a rotating server secret. No tokens in `localStorage` (XSS-resilient).
- **Decision: `SessionStore` interface, backed by `DbSessionStore` in the control-plane DB.** The cookie holds only an opaque random id; lookup is one indexed read per request. Rationale: the control-plane DB is already shared across however many API instances we run, so DB-backed sessions give us the multi-instance property *and* instant revocation with **zero new infrastructure**. A **Redis adapter** is deferred — adopted only if session read volume becomes a genuine hotspot under horizontal scale; the interface makes that a contained swap. (In-memory is rejected: lost on restart, broken across instances. JWT is rejected: no pre-expiry revocation without rebuilding a server-side list anyway.)
- **Control-plane, not tenant DB:** a consultant may belong to multiple tenants; one sessions table means "sign out everywhere" / admin force-logout / revoke-on-reset is a single `UPDATE ... SET revokedAt = now`, not a fan-out across tenant DBs.
- Session record: `id (random 256-bit)`, `userId`, `tenantId`, `roles snapshot`, `createdAt`, `expiresAt`, `lastSeenAt`, `ip`, `userAgent`, `revokedAt`. A periodic cleanup job (folded into the backup scheduler) prunes expired rows.
- Idle timeout + absolute timeout; sliding renewal. Configurable per tenant by the org admin (admin-side control).
- **CSRF:** because we use cookies, add a double-submit CSRF token or rely on `SameSite` + a custom header check that urql sends. (GraphQL over POST + `SameSite=Lax` + required custom header is a pragmatic, well-understood defense.)

### 4.4 Where credentials live

Credentials live in the **tenant DB** (`users` table), so a tenant's identity data is isolated and travels with that tenant's backup/restore/delete. The **control plane** keeps only an `email → tenantId` routing index (and, where a user belongs to multiple tenants, the list). This keeps the shared surface to a routing hint, not a credential store.

### 4.5 Hardening

- **Rate limiting / lockout:** per-account and per-IP throttling with exponential backoff; temporary lockout after N failures; all configurable by the org admin.
- **MFA (TOTP)** as a fast-follow: `otplib`-based TOTP with encrypted secret (field-level, §6.3) and one-time recovery codes. Enterprise buyers will ask; design the schema for it now even if shipped in phase 2.
- **Optional SSO (pluggable):** an `AuthProvider` interface (`local`, `oidc`, `saml`). For OIDC use `openid-client`; for SAML `@node-saml/node-saml`. A tenant's admin configures their IdP; the app maps IdP claims → local user + roles (SCIM/just-in-time provisioning later). When SSO is enabled for a tenant, local password login can be disabled per policy.

---

## 5. Authorization (RBAC)

### 5.1 Role model

Four **combinable** roles, assigned per user **per tenant** (a user may belong to more than one tenant with different roles in each):

| Role | Intent | Representative capabilities |
|------|--------|------------------------------|
| `admin` | Org owner | Manage users & role assignments, tenant settings, SSO config, security policy, backups/restore, view audit log. Full data access. |
| `manager` | QA lead | Create/edit projects, test plans, runs; assign work; read all data; no user/security admin. |
| `tester` | Executes tests | Create/edit test cases & results within assigned projects; run execution; no admin. |
| `dev` | Engineering | Read test data, link requirements/automation, manage automated-test imports; typically read-mostly on manual QA artifacts. |

- **Combinable:** roles are a *set*. Effective permission = union of grants across held roles. Example: a user can be `manager + dev`.
- **Permissions, not just roles:** internally we map roles → a fixed set of **permissions** (e.g. `testcase:write`, `user:manage`, `audit:read`, `backup:run`). Guards check *permissions*; roles are bundles of permissions. This lets us add a custom role later without touching guard code.
- **Project-scoped access (phase 2):** `tester`/`dev` can be scoped to specific projects within a tenant. Schema supports an optional `projectId` on the role assignment; phase 1 treats null = all projects.

### 5.2 Platform superadmin (separate plane)

- Lives in the **control plane**, never in tenant role tables. A superadmin is *not* an org admin and does not get implicit data access.
- **Break-glass access:** to read a tenant's data for troubleshooting, a superadmin performs **step-up auth (MFA) + reason capture**, which mints a **time-boxed, scoped** access grant. Every such access is written to the **platform audit log** and (recommended) surfaced to the org admin ("platform staff accessed your workspace on …"). This is the "transparency and control" enterprise buyers want.
- Default posture: superadmins can manage tenant lifecycle (create/suspend/delete), run platform jobs, and rotate keys — but **cannot silently read tenant content**.

### 5.3 Enforcement point

- Authorization is centralized in the **GraphQL context + a guard layer**, not scattered in resolvers.
- `createApp` builds a per-request context: `{ session, user, tenantId, roles, permissions, db (tenant-scoped handle), audit }`. Today `context: { service }` — we extend it.
- Guards: a small `requirePermission('testcase:write')` helper wrapping resolvers (or a GraphQL schema directive `@auth(requires: ...)`). Deny-by-default: any resolver without an explicit public marker requires an authenticated session.
- **Tenant scoping is structural, not query-level:** because the handed-in `db` handle *is* the tenant's database, there is no `tenant_id` to forget. This is a direct security benefit of DB-per-tenant.

---

## 6. Encryption & key management

Defense in depth: **two layers**, with **pluggable key custody**.

### 6.1 Layer 1 — Full database at rest (SQLCipher)

- Each tenant SQLite file is encrypted with **SQLCipher** (AES-256, transparent page-level encryption). Protects against **theft of the DB file / disk / backup**.
- Implementation: swap `better-sqlite3` for a **SQLCipher-capable build** (e.g. `better-sqlite3-multiple-ciphers`), opened with the tenant's **Data Encryption Key (DEK)**. The Drizzle/SQL layer is unchanged — encryption is transparent below it.
- The control-plane DB is likewise encrypted with its own key.

### 6.2 Layer 2 — Field-level envelope encryption (sensitive columns)

For the **most sensitive fields**, encrypt at the application layer *in addition* to SQLCipher, so the plaintext is never in a page even transiently and so blast radius is per-field:

- Targets: MFA/TOTP secrets, SSO client secrets, integration API tokens (e.g. Anthropic/BrowserStack keys), password-reset tokens (stored hashed anyway), and any column we classify as PII.
- Scheme: **AES-256-GCM** (authenticated) using a per-tenant or per-purpose **DEK**; ciphertext stored as `iv || tag || ciphertext` (base64 in a `text` column). A small `encrypted(value)` / `decrypt(value)` helper in the data layer; columns annotated in schema.
- **PII discipline (org constraint):** never log decrypted sensitive fields; never return PII in error messages or API responses unless explicitly authorized.

### 6.3 Key hierarchy (envelope encryption)

```
   Key Provider (KMS or file)
        │  holds / wraps
        ▼
   KEK  (Key-Encryption Key, per platform or per tenant)
        │  wraps
        ▼
   DEK  (Data-Encryption Key, per tenant)  ──►  used for SQLCipher + AES-GCM fields
```

- DEKs are generated per tenant, stored **wrapped (encrypted) by the KEK** in the control plane. The plaintext DEK exists only in memory when a tenant DB is open.
- **Rotation:** KEK rotation re-wraps DEKs (cheap, no data rewrite). DEK rotation re-encrypts that tenant's DB (heavier; backgrounded). Both are superadmin-audited operations.

### 6.4 Pluggable key provider (decided)

The provider only ever does **two operations — wrap and unwrap a KEK** — so the interface is tiny and the backend is swappable. DEKs are wrapped/unwrapped; key material and data never leave our process to a third party beyond the KEK wrap call.

```
interface KeyProvider {
  wrap(dekPlaintext): Promise<wrappedDek>    // encrypt a data key with the KEK
  unwrap(wrappedDek): Promise<dekPlaintext>  // decrypt it (KEK never exposed to us for KMS)
}
```

Adapters, in build order:

1. **`FileKeyProvider` — standalone default.** KEK from an operator-supplied secret (env var or secret file, optionally passphrase-wrapped). Zero external infra, works air-gapped. This is the **default for self-hosted installs**. Trade-off: escrow + rotation are the operator's responsibility (we refuse to start without a configured key, and document a required escrow step).
2. **`AzureKeyVaultProvider` — SaaS default.** KEK in **Azure Key Vault** (standard = software-protected; **Managed HSM** = FIPS 140-2 L3 for buyers who require it). Auth via Entra ID managed identity. Managed rotation, auditable access, no key-server to operate. Covers Microsoft-aligned enterprise customers.
3. **`VaultProvider` — deferred, on customer demand.** HashiCorp Vault **or** OpenBao (API-identical Transit engine) for customers who require a **cloud-agnostic, self-hostable KMS**. Built only when a deal needs it; AWS/GCP KMS adapters slot into the same interface just as easily.

**Why not run a key server (Vault/OpenBao) by default:** both mean *you operate a key server* (unseal, HA, upgrades, its own backups) — heavy ops for a small team, and unjustified just to wrap KEKs. Azure KV (managed, no ops) for SaaS and `FileKeyProvider` (no infra) for standalone cover the common cases. When a Vault-family adapter is needed, pick **OpenBao** if licensing/redistribution matters (MPL-2.0, no HashiCorp BSL), or **HashiCorp Vault** if the customer wants the recognized name + managed HCP option. Decision is made at that point, not now — the adapter code is the same either way.

This satisfies **Microsoft ✅, free/independent ✅, standalone ✅** without forking the codebase.

---

## 7. Password recovery & account recovery

- **Self-service password reset:** user requests reset → we generate a **high-entropy token**, store only its **hash** (+ short TTL, single-use) in the tenant DB, and send a reset link. On reset: set new Argon2id hash, **revoke all active sessions**, write audit. Generic responses prevent user enumeration.
- **Email transport — decision: `Mailer` interface over SMTP submission; no bundled mail server.** Running our own internet-facing MTA (Postfix/Exim) is a deliberate non-goal — fresh-IP reputation, blocklists, blocked port 25, and ongoing patching make self-run delivery a liability for tiny transactional volume. Instead:
  - **Standalone / self-hosted →** customer points us at **their own SMTP** (M365/Exchange/Google Workspace). Mail comes from *their* domain and reputation; we operate zero email infra.
  - **SaaS →** one provider via SMTP submission — **Amazon SES** (cheapest) or **Postmark** (best transactional deliverability). Tiny volume (resets/MFA/invites) ⇒ near-zero cost. Provider chosen at signup; not an architecture decision.
  - Either way, deliverability depends on **SPF + DKIM + DMARC** on the sending domain — DNS config, not code. `SmtpMailer` (nodemailer) is the universal transport; an API adapter is optional.
- **MFA recovery:** one-time recovery codes (hashed) issued at MFA enrollment; using one consumes it and is audited.
- **Admin-assisted recovery:** org `admin` can trigger a reset / unlock for a user in their tenant (audited). Org admins are recovered by **another org admin**; the *last* admin is recovered via a superadmin break-glass flow (audited, transparent to the tenant).
- **Lost encryption key recovery:** because DEKs are wrapped by the KEK in KMS, a lost *host* does not lose data — restore the backup and unwrap via KMS. For `FileKeyProvider`, recovery depends on the operator's KEK escrow; we document a required escrow step and refuse to start without a configured key.

---

## 8. Audit log (transparency)

- **Append-only, tamper-evident.** Two logs: **tenant audit** (in each tenant DB — user/role changes, data mutations of interest, logins, resets) and **platform audit** (control plane — tenant lifecycle, superadmin break-glass, key rotation, backup/restore).
- Each entry: `id, ts, actorId, actorType (user|admin|superadmin|system), action, targetType, targetId, tenantId, ip, userAgent, metadata(json)`. **No PII or secret values** in `metadata` (org constraint).
- Tamper-evidence (phase 2): hash-chain each entry (`prevHash`) so deletion/edit is detectable. Export to SIEM (syslog/JSON) for enterprise customers.
- Org admins can **read their tenant's audit log**; superadmins read the platform log. This is the "transparency" pillar.

---

## 9. Backups & recovery

**Decision: built-in scheduler + retention + verified restore.**

- **What:** per-tenant **encrypted snapshots**. SQLite is backed up safely via the **online backup API / `VACUUM INTO`** (consistent copy without downtime). The snapshot inherits SQLCipher encryption; we additionally verify integrity (`PRAGMA integrity_check`) on the copy.
- **Scheduler:** an in-process job runner (e.g. lightweight cron via `croner`) or external cron calling a CLI. Per-tenant schedule + global default, configurable by org admin within platform-allowed bounds.
- **Targets:** local volume **and** offsite (pluggable storage: filesystem now, S3/GCS adapter for SaaS) — encrypted in transit and at rest. Keys are **not** stored next to backups; restore requires the key provider (KMS/file), so a stolen backup bucket is useless alone.
- **Retention:** configurable GFS-style policy (e.g. keep N daily, M weekly, K monthly); old snapshots pruned by the scheduler; pruning audited.
- **Restore:** admin/superadmin-triggered restore via CLI/admin UI, with **dry-run + verification** before swap. Per-tenant restore is a **file operation** (a key payoff of DB-per-tenant). We will add a periodic **automated restore test** in CI/ops to prove backups are restorable (a backup you've never restored is a hope, not a backup).
- **Tenant deletion:** "right to be forgotten" = delete the tenant DB file + its snapshots + revoke its DEK. Clean and verifiable.

---

## 10. Technology summary

| Concern | Choice | Notes |
|---------|--------|-------|
| Password hashing | **Argon2id** (`@node-rs/argon2`), scrypt fallback | Memory-hard; tunable cost |
| Sessions | **Server-side opaque + signed HttpOnly cookie** | Instant revocation |
| CSRF | `SameSite` + custom header / double-submit token | Cookie-based defense |
| MFA | **TOTP** (`otplib`) + recovery codes | Phase 2, schema now |
| SSO (optional) | **OIDC** (`openid-client`), **SAML** (`@node-saml/node-saml`) | Pluggable `AuthProvider` |
| Authorization | Permission-based RBAC, guard layer + GraphQL context | Deny-by-default |
| Full-DB encryption | **SQLCipher** via `better-sqlite3-multiple-ciphers` | Transparent, AES-256 |
| Field encryption | **AES-256-GCM** envelope | Sensitive columns only |
| Key custody | **Pluggable**: `FileKeyProvider` (standalone default) → `AzureKeyVaultProvider` (SaaS default) → Vault/OpenBao (deferred) | KEK→DEK envelope; tiny wrap/unwrap interface |
| Sessions | `SessionStore` → **`DbSessionStore` (control-plane DB)**; Redis deferred | Opaque id cookie; instant revocation, multi-instance-safe, no new infra |
| Backups | Online backup / `VACUUM INTO` + `croner` scheduler | Encrypted, offsite, retained |
| Mail | **`Mailer` over SMTP submission**; customer SMTP (standalone) / SES or Postmark (SaaS) | No bundled MTA; SPF/DKIM/DMARC required |
| Audit | Append-only tables, optional hash-chain + SIEM export | Tenant + platform planes |

All choices keep the **standalone** path intact (local accounts, file key provider, SMTP, local backups) while enabling the **enterprise** path (SSO, KMS, offsite backups, SIEM) by configuration, not code fork.

---

## 11. Data model changes (sketch)

**Control plane DB (new):**

- `tenants` — `id, slug, name, status, dbRef, kekId, ssoEnabled, createdAt, …`
- `tenant_keys` — `tenantId, dekWrapped, kekId, algo, rotatedAt`
- `identity_index` — `email, tenantId` (+ unique per (email, tenant))
- `platform_staff` — `id, email, hash, mfaSecretEnc, role(superadmin), …`
- `platform_audit` — append-only (§8)
- `backup_jobs` — schedule/retention/last-run metadata

**Per-tenant DB (added to existing schema):**

- `users` — `id, email, passwordHash, hashParams, status, mfaEnabled, mfaSecretEnc, createdAt, …`
- `role_assignments` — `userId, role, projectId(nullable for phase 2 scoping)`
- `sessions` — `id, userId, expiresAt, revokedAt, ip, userAgent, …` (or control-plane sessions)
- `password_reset_tokens` — `userId, tokenHash, expiresAt, usedAt`
- `mfa_recovery_codes` — `userId, codeHash, usedAt`
- `audit_log` — append-only tenant audit (§8)

Existing tables (`projects`, `requirements`, `testCases`, …) are unchanged structurally — they simply now live inside a keyed, per-tenant DB.

---

## 12. Threat model (what each control buys)

| Threat | Mitigation |
|--------|------------|
| Stolen DB file / disk / backup | SQLCipher full-DB encryption; backups encrypted; keys held separately (KMS/file) |
| Cross-tenant data leak | DB-per-tenant (structural isolation, no shared key, no `tenant_id` to forget) |
| Credential theft / offline cracking | Argon2id; no plaintext; field-encrypted secrets |
| Session hijack / XSS token theft | HttpOnly cookies (no JS token), CSRF defense, instant server-side revocation |
| Brute force / credential stuffing | Rate limiting, lockout, optional MFA |
| Insider / platform overreach | Superadmins cannot silently read tenant data; break-glass is step-up + reason + audited + tenant-visible |
| User enumeration | Generic auth/reset responses |
| Lost keys / disaster | KMS-wrapped DEKs + tested restore; documented escrow for file provider |
| Tampered audit trail | Append-only + hash-chain (phase 2) + SIEM export |
| PII exposure (org rule) | Field encryption + "no PII in logs/errors/responses" discipline |

---

## 13. Implementation plan (phased)

**Phase 0 — Foundations (control plane + context)**
- Add control-plane DB + migrations; tenant registry; tenant DB resolver + handle pool.
- Extend `createApp`/GraphQL context to carry `{ session, user, tenantId, roles, permissions, tenantDb, audit }`.
- `KeyProvider` interface + `FileKeyProvider` (unblocks everything; KMS later).

**Phase 1 — Local auth + RBAC (MVP, satisfies `LOGIN-REQ-*`)**
- `users`, `role_assignments`, `sessions`, Argon2id hashing, login/logout mutations.
- Server-side sessions + cookies + CSRF.
- Permission-based guard layer; deny-by-default; map the 4 roles → permissions.
- Org admin user-management UI + screens; seed a first admin per tenant.
- Tenant + platform audit log (basic).
- Rate limiting / lockout.
- Fill in the stubbed login unit/integration/e2e tests.

**Phase 2 — Encryption at rest + key management**
- SQLCipher (full-DB) for tenant + control-plane DBs; DEK/KEK envelope; `AzureKeyVaultProvider` (SaaS) layered on the `FileKeyProvider` from Phase 0.
- Field-level AES-GCM helpers; encrypt sensitive columns; rotation tooling.

**Phase 3 — Recovery & backups**
- Password reset + Mailer; MFA (TOTP) + recovery codes.
- Backup scheduler + retention + offsite adapter + restore CLI + automated restore test.

**Phase 4 — Enterprise**
- Superadmin break-glass + step-up + tenant-visible notifications.
- Pluggable SSO (OIDC/SAML), JIT/SCIM provisioning.
- Project-scoped roles; audit hash-chain + SIEM export.

---

## 14. Resolved decisions & remaining assumptions

**Resolved in review:**
- **KMS order** → `FileKeyProvider` (standalone default) → **Azure Key Vault** (SaaS default) → Vault/OpenBao deferred to customer demand. (§6.4)
- **Email** → `Mailer` over SMTP submission, **no self-run mail server**; customer SMTP for standalone, SES/Postmark for SaaS. (§7)
- **Sessions** → control-plane `DbSessionStore`, Redis deferred. (§4.3)
- **SOC 2** → design toward now, certify post-funding. (§15)

**Remaining assumptions / to confirm:**
1. **Cross-tenant users** — one person in multiple tenants (consultants)? Affects the identity index + login tenant-selection UX. **Assumed yes.**
2. **SaaS email provider** — SES vs Postmark. Signup-time choice, not architecture.
3. **`better-sqlite3` → SQLCipher build** — validate `better-sqlite3-multiple-ciphers` against Node 24 / native-module CI before committing (a build/CI risk, see §16).

---

## 15. SOC 2 readiness (design-toward now, certify post-funding)

We are **not** certifying yet, but we are designing so that certification is later a process/evidence exercise, not a re-architecture. SOC 2 is an auditor's attestation against the Trust Service Criteria; ~80% of the effort is policy + evidence, ~20% engineering. This architecture already covers most of the engineering for the mandatory **Security** criterion:

| Trust Services control area | Covered by this architecture | Gap to close at certification time |
|------------------------------|------------------------------|-------------------------------------|
| Logical access / least privilege | Permission-based RBAC, deny-by-default guards, structural tenant isolation (§5) | Periodic access reviews (process) |
| Authentication | Argon2id, server-side sessions, lockout, MFA, optional SSO (§4) | Documented password/MFA policy |
| Encryption at rest & in transit | SQLCipher + field-level AES-GCM (§6), TLS | Documented data-classification policy |
| Key management | Envelope KEK→DEK, pluggable provider, rotation (§6.3–6.4) | Documented key-rotation cadence |
| Audit / monitoring | Append-only tenant + platform audit; hash-chain + SIEM export planned (§8) | Centralized log retention + alerting |
| Availability / DR | Scheduled encrypted backups + **verified restore** (§9) | Documented RPO/RTO + DR test cadence |
| Privacy / confidentiality | "No PII in logs/errors/responses," field encryption (§6.2, org rule) | Retention/disposal policy, DPA templates |
| Change management | Existing CI hardening (typecheck, lint, arch boundaries, tests, schema checks), PR review | Documented SDLC + change-approval policy |
| Vendor / sub-processor risk | Few sub-processors by design (Azure KV, one email provider, one backup target) | Vendor risk register |

**Certification path when funded:** adopt a compliance-automation platform (**Vanta / Drata / Secureframe**, ~$7–25k/yr) to auto-collect evidence, write the policy set, engage a CPA firm (~$10–40k for Type II), then run the observation window. **Type I** (~2–3 months) is a reasonable first milestone; **Type II** adds the observation period (~6 months end-to-end). Design rule until then: **don't make choices that contradict the table above** — every decision in this doc already respects it.

---

## 16. Cost optimization (shoestring-startup posture)

The architecture is deliberately cheap to run; this section makes the cost levers explicit and flags the few places spend can creep. Costs fall into **infra/runtime**, **CI/CD**, **third-party services**, and **the AI test-drafting agent** (`src/ai/`).

### 16.1 Architectural choices that already save money

- **SQLite, not a managed DB.** No RDS/Cloud SQL bill. Database-per-tenant is just files on a volume — the marginal cost of a new tenant is ~nothing, vs per-database charges on managed engines. This is the single biggest saving and it scales to a lot of small tenants on one small box.
- **In-process scheduler & sessions (no Redis, no queue service).** `croner` + `DbSessionStore` mean **zero extra managed services** until scale genuinely forces them. Both are interfaces, so adopting Redis/a queue later is a contained change — pay only when revenue justifies it.
- **`FileKeyProvider` default + Azure KV only for SaaS.** KMS wrap/unwrap calls are sub-cent and rare (per tenant-DB open, cacheable for the handle's lifetime). No always-on key server (Vault) to host. Standalone installs cost us **$0** in key infra.
- **No self-run mail server.** Avoids an MTA host + its maintenance; transactional volume on SES is effectively free (first ~3k/mo free via the AWS free-ish tiers; cents thereafter).
- **Single-node, single-binary deploy.** The whole API is one Node process + a volume. It runs on the smallest VM tier or a cheap container host; **no Kubernetes** is warranted at this stage.

### 16.2 Runtime sizing & operating costs

- **Right-size the box.** Start on the smallest VM/container that holds the working set; SQLite is memory-frugal. Scale **vertically first** — far cheaper and simpler than horizontal + Redis.
- **Backups: cheap object storage + lifecycle rules.** Send encrypted snapshots to S3/Azure Blob **Standard-IA or cold tiers**, and let **retention/GFS pruning** (already in §9) plus storage lifecycle policies expire old objects automatically. Compress before upload (SQLite compresses well). Egress is the cost to watch — keep backups in the same region/cloud as compute.
- **Tenant DB handle pool with idle eviction** (already in §2) keeps memory flat as tenant count grows — you don't pay for RAM proportional to *total* tenants, only *active* ones.
- **Avoid premature multi-region.** One region until a customer contractually requires data residency; then spin a second single-node deployment rather than a globally-distributed system.

### 16.3 CI/CD costs (concrete, from the current repo)

The repo's CI (`.github/workflows/ci.yml`) is the most immediate controllable spend. Observations and savings:

- **Mutation testing (Stryker, `timeout-minutes: 120`)** is already correctly gated to **`workflow_dispatch` only** — good; it does not run per-push. Keep it manual/scheduled, not per-PR.
- **The nightly `schedule: "0 2 * * *"` cron** runs CI every day even with no changes. **Saving:** skip the nightly on a repo with no new commits (guard with an activity check), or move it to weekly — daily full runs on a low-commit repo are wasted minutes.
- **`fast-checks` and `e2e-web` both run on every PR and every `feature/**` push.** E2E in the Playwright container is the priciest job. **Savings:** (a) ensure `npm ci` uses the **`cache: npm`** already configured (it is) so installs are warm; (b) consider running full E2E only on PRs (not every feature-branch push) — push-time can run `@smoke` only via the existing `e2e:smoke` script, full suite on PR; (c) keep the prebuilt Playwright container (already done — avoids `playwright install` minutes).
- **Concurrency cancellation.** Add a `concurrency:` group keyed on branch to auto-cancel superseded runs when you push twice quickly — pure waste eliminated.
- **Self-hosted runner** only if GitHub-hosted minutes become the bottleneck; not worth the ops overhead yet.

### 16.4 The AI test-drafting agent (`src/ai/`) — watch this one

`src/ai/agent.ts` uses the Anthropic SDK (tool-use loop: `get_requirements` → `validate_requirements` → `draft_test_cases`) to generate the login test stubs we saw. Token spend here can dominate all other costs if it runs in loops or in CI. Cost controls:

- **Model tiering — the biggest lever.** Test-stub drafting is a routine, well-structured task: default it to **Haiku 4.5** (cheapest, fast) and reserve Opus/Sonnet only for genuinely hard generation. A correct model choice here can cut agent cost ~10–20× vs always using a top-tier model.
- **Prompt caching.** The tool definitions + system prompt + requirements context are large and reused across calls — mark them with **`cache_control`** so repeated runs hit the Anthropic prompt cache (cached input tokens are ~10% the price). High-leverage for an agent that re-sends the same tool schema every turn.
- **Cap the tool-use loop.** Enforce a max-iterations / max-tokens budget per drafting run so a misbehaving loop can't run away. Set `max_tokens` tightly to the expected stub size.
- **Keep it out of automatic CI.** Run the agent **on demand / locally**, not on every push, so API spend is bounded by human action, not CI triggers. (It currently appears to be a dev tool, which is correct — keep it that way.)
- **Batch requests** if you ever draft for many modules at once; reuse one cached context across them.

### 16.5 Cost levers summary

| Lever | Action | Why it saves |
|-------|--------|--------------|
| DB | Stay on SQLite + DB-per-tenant | No managed-DB bill; ~free per tenant |
| Services | Defer Redis / queue / Vault until forced | No idle managed-service spend |
| Keys | File provider default; Azure KV only for SaaS | KMS calls are sub-cent and rare; no key-server host |
| Mail | No self-run MTA; SES/customer SMTP | Near-zero transactional cost, no MTA upkeep |
| Backups | Cold object-storage tier + lifecycle pruning + same-region | Cheap storage, minimal egress |
| Compute | Vertical-scale one node; no k8s | Smallest viable footprint |
| CI | Gate mutation (done), trim nightly, smoke-on-push/full-on-PR, add concurrency cancel | Fewer wasted runner minutes |
| **AI agent** | **Haiku default + prompt caching + token caps + on-demand only** | **Largest variable-cost risk; 10–20× swing** |

---

*Next step: confirm the §14 remaining assumptions, then I can turn Phase 0–1 into concrete tickets and schema/migration PRs — and, if useful, open a small CI-cost PR (concurrency cancellation + nightly trim) independently since it pays for itself immediately.*
