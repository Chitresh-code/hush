# Hush Account and Secret Recovery

Status: Proposed  
Last updated: 2026-08-17  
Evidence: [ADR-004](../decisions/ADR-004-server-blind-encryption.md) and [key management](key-management.md)  
Implementation evidence: None

## 1. Product contract

Hush has two separate recovery operations:

- **Account recovery** restores the ability to authenticate to a Hush account.
- **Secret recovery** restores the ability to decrypt previously authorized secrets.

Account recovery alone does not recover secrets. Secret recovery requires an enrolled device or a verified user-held recovery kit. If every enrolled device and the recovery kit are lost, existing secrets are unrecoverable.

This statement must appear during setup, recovery-kit verification, device removal, destructive reset, and public security documentation.

## 2. Recovery cases

| Situation | Account access | Secret access | Required path |
| --- | --- | --- | --- |
| Password or identity credential lost, device remains | Recover account | Existing device retains local access | Recover account, verify device and sessions |
| Device lost, another device remains | Account unchanged | Remaining device can authorize replacement | Revoke lost device, enroll new device, rotate affected keys |
| All devices lost, recovery kit remains | Recover account if needed | Recovery kit can authorize replacement | Verify account, use kit, enroll new device, rotate keys |
| Account recovered, no device or kit | Account restored | Existing secrets unavailable | Destructive reset only |
| Recovery kit suspected stolen, device remains | Account unchanged | Device can replace recovery authority | Replace kit, rotate affected envelopes, record event |
| Account and recovery kit compromised | Attacker may meet both boundaries | Secrets at risk | Emergency session and recovery revocation, device review, key rotation |

## 3. Account recovery requirements

- Use the selected identity provider's supported recovery mechanism after it is chosen.
- Do not reveal whether an account exists through unauthenticated responses.
- Rate limit and monitor recovery attempts.
- Revoke or review active sessions after recovery.
- Require recent authentication before device, membership, role, recovery, or destructive actions.
- Notify existing trusted channels and active devices where possible.
- Record safe security events without tokens or recovery data.

Account recovery never instructs the service to create, unwrap, or return plaintext key material.

## 4. Secret recovery with an enrolled device

1. Authenticate the account on the new device.
2. Generate new device identity material locally.
3. Present a fresh enrollment request to an existing device.
4. The existing device verifies account, device, challenge, and user intent.
5. The existing device authorizes the new device and creates required key envelopes.
6. The service validates organization access and stores the envelopes.
7. The new device validates and unwraps them locally.

The exact human verification and proximity or out-of-band channel remain protocol decisions.

## 5. Secret recovery with a recovery kit

1. Recover and authenticate the account.
2. Generate new device identity material locally.
3. Read recovery material locally and verify its integrity.
4. Bind recovery approval to the account, new device, fresh challenge, and protocol version.
5. Fetch only ciphertext and envelopes still authorized by current organization membership.
6. Decrypt locally and enroll the new device.
7. Offer recovery-authority rotation when compromise or exposure is possible.

The service must not learn recovery secrets during this flow.

## 6. Unrecoverable state

When no enrolled device or valid recovery kit remains:

- State plainly that existing secrets cannot be decrypted.
- Do not offer support escalation that implies a hidden service key.
- Allow account and organization administrators to reset encrypted data only after strong confirmation and authorization.
- Preserve required billing, membership, and security-event records according to policy.
- Create new device and recovery authority for future data.
- Never present destructive reset as recovery.

## 7. Organization considerations

- Account recovery does not restore removed organization membership.
- Current organization authorization is required before returning recovery envelopes.
- Organization administrators can revoke sessions, devices, memberships, and future access but cannot decrypt user secrets merely because they are administrators.
- Another authorized organization member may regrant environment access to a recovered account through new key envelopes, subject to policy.
- Past access and future access are distinct. Revocation cannot erase data previously obtained.

## 8. User experience requirements

- Explain the recovery boundary in plain language before the first secret is stored.
- Require the user to verify recovery material, not only acknowledge that it was displayed.
- Show the number of enrolled devices and whether a verified recovery path exists.
- Warn before revoking the final device or replacing the recovery authority.
- Show which organizations will require key regrant or rotation.
- Never display recovery material in logs, support bundles, screenshots generated by Hush, or analytics.

## 9. Verification scenarios

- Recover account with and without an existing device.
- Enroll from another device using a fresh challenge.
- Recover on a clean device using only documented kit materials.
- Reject wrong, corrupted, replayed, expired, or cross-account recovery approval.
- Deny recovery envelopes after organization removal or device revocation.
- Interrupt recovery at every persistence boundary and resume safely.
- Replace a compromised kit and verify old authority no longer approves devices.
- Confirm destructive reset cannot decrypt or silently retain prior data.

