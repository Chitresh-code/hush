# Hush Terminology

Status: Accepted  
Last updated: 2026-08-17  
Evidence: [Product requirements](PRD.md) and [ADR-005](../decisions/ADR-005-organization-scoped-collaboration.md)

| Term | Meaning |
| --- | --- |
| User | A person's authenticated Hush identity. The service does not hold decryption keys on the user's behalf. |
| Organization | The top-level ownership and authorization boundary for collaborative Hush resources. |
| Organization membership | The relationship that grants a user the `admin` or `member` role in an organization. |
| Project membership | The collaborator relationship that grants an active organization member the `co_owner`, `editor`, or `viewer` role in one project. |
| Device | An enrolled Hush client with device-held key material used to decrypt authorized secrets. |
| Recovery kit | User-held material that can enroll a replacement device when no enrolled device remains. Hush does not retain a decryptable copy. |
| Project | An application or service whose environments belong to one organization. |
| Environment | A named configuration context within a project, such as development or production. Names are user-defined. |
| Entry | One named configuration value stored in an environment. Values are treated as secret unless explicitly classified otherwise in a future design. |
| Version | An immutable accepted state used for history, synchronization, and restore. |
| Local vault | The encrypted data held on an enrolled device. |
| Sync service | The service that authenticates accounts, enforces organization access, and stores encrypted payloads and required metadata. It cannot decrypt secret values. |
| Account recovery | Restoration of user authentication. It does not restore secret decryption capability. |
| Secret recovery | Restoration of decryption capability through an enrolled device or recovery kit. |

Use "account recovery" and "secret recovery" separately. Saying only "recovery" can mislead users about whether their secrets can be restored.
