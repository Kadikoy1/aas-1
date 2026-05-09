# AAS-1: Agent Auditability Standard

**Version:** 0.1 (working draft)
**Status:** Draft for comment
**Licence:** CC0 1.0 Universal
**Companion to:** AIS-1 (Agent Identity Standard)

---

## Abstract

AAS-1 is a technology-neutral standard for producing audit-grade evidence about autonomous agent activity. It defines a record format, a set of record classes, and a set of assertions such that an independent reviewer — human or agent — can form opinions about whether agent actions were authorised, complete, accurate, and properly classified.

AAS-1 is the audit complement to AIS-1. Where AIS-1 answers *who is the agent*, AAS-1 answers *what did the agent do, under whose authority, and how do we know*.

## 1. Status and Scope

This is v0.1, released CC0 for comment. The schema is not yet stable.

**In scope.** Record format for agent actions, batches, engagements, and auditor determinations; standard audit assertions adapted to autonomous agents; technology-neutral evidence patterns; binding to AIS-1 identities.

**Out of scope (for v0.1).** Specific cryptographic primitives (cipher-suite agnostic); regulatory mappings (deferred to annexes); audit firm engagement methodology; assurance opinion language.

## 2. Audit Assertions

AAS-1 records are designed to support the following assertions, drawn from established audit frameworks (ISA 315/330, AICPA AU-C, ISAE 3000-series):

- **Existence / Occurrence** — the recorded action actually took place
- **Completeness** — all relevant actions in scope are recorded
- **Accuracy** — inputs and outputs are faithfully captured
- **Authorisation** — the agent acted within delegated authority
- **Cutoff** — the action is recorded in the correct period
- **Classification** — the action is correctly categorised
- **Presentation** — records are presented and described accurately

AAS-1 adds five assertions specific to autonomous agents:

- **Identity** — the recorded actor is the agent of record (via AIS-1 binding)
- **Provenance** — model, tool chain, prompt context, and data sources are captured
- **Reproducibility** — sufficient state is recorded to permit re-derivation under stated determinism conditions
- **Policy Compliance** — applicable policies and the action's compliance result are recorded
- **Independence** — separation between agent action and operator override is recorded

## 3. Record Classes

AAS-1 defines five record classes:

| Class | Name | Purpose |
|-------|------|---------|
| A | Action Record | A single agent action with evidence |
| B | Batch Record | Aggregation of Class A records over a defined period |
| C | Continuous Record | A streamed log entry within a continuous attestation |
| D | Determination Record | An auditor's finding, opinion, or exception |
| E | Engagement Record | Metadata for an audit engagement |

Class A is the atomic unit. Classes B and C are aggregations. Classes D and E are auditor outputs. A complete audit trail typically comprises many Class A records, organised by Class B or Class C aggregations, with Class D determinations issued against an enclosing Class E engagement.

## 4. Core Schema — Class A (Action Record)

### Required fields

| Field | Type | Description |
|-------|------|-------------|
| `aas` | string | Standard version, e.g. `"0.1"` |
| `eventId` | string | ULID or UUID, unique within the issuer |
| `class` | string | `"A"` |
| `agentRef` | URI | AIS-1 identity (typically a DID URI) |
| `principalRef` | URI | Legal or natural person on whose behalf the agent acts |
| `timestamp` | string | RFC 3339 |
| `timestampServiceRef` | URI | Identifier of the timestamping authority (technology-neutral, mirrors AIS-1 §3.4) |
| `action` | object | See §4.1 |
| `evidence` | array | See §4.2; minimum one entry |
| `signature` | object | Issuer's signature over the canonicalised record |

### Optional fields

| Field | Type | Description |
|-------|------|-------------|
| `engagementRef` | URI | Reference to a Class E record |
| `policyRefs` | array of URI | Policies applicable to this action |
| `policyResult` | object | Compliance evaluation result |
| `materiality` | object | Monetary or risk-weighted indicator |
| `attestations` | array | Execution-environment or third-party attestations |
| `prevHash` | string | Hash of preceding record, for chain integrity |
| `delegationRef` | URI | The delegation or authorisation under which the agent acted |
| `notes` | string | Free-text issuer notes |

### 4.1 The `action` object

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | One of: `tool_call`, `decision`, `communication`, `transaction`, `policy_check`, `human_handoff`, `other` |
| `inputsHash` | string | Hash of canonicalised inputs |
| `outputsHash` | string | Hash of canonicalised outputs |
| `tools` | array | Tools or MCP servers invoked, each with `name`, `version`, `serverRef` |
| `model` | object | `{ id, version }` for the model used |
| `summary` | string | Optional human-readable summary |

### 4.2 The `evidence` array

Each entry is an object with at minimum a `type` and `value`. Recognised types:

- `signature` — cryptographic signature over the record or a specified subset
- `attestation` — attestation from an execution environment (TEE quote, MPC quorum, etc.)
- `witness` — co-signing witness
- `log` — reference to an external append-only log entry
- `hash_anchor` — content hash anchored to a public ledger or notary service
- `human` — human attestation (auditor, principal, Commissioner for Oaths, etc.)

Implementations MAY define additional types under a reverse-DNS namespace.

## 5. Class B — Batch Record

A Class B record summarises a set of Class A records over a defined period. Required fields include `periodStart`, `periodEnd`, `recordCount`, `merkleRoot` (over the canonicalised Class A records in the batch), and the same identity, signature, and evidence fields as Class A.

## 6. Class C — Continuous Record

A Class C record is a single entry in a continuously attested stream. The stream as a whole is bound by a separate stream-anchor record. Class C semantics are deferred to v0.2 but the record-level schema is reserved.

## 7. Class D — Determination Record

A Class D record captures an auditor's determination. Required fields: `auditorRef` (an AIS-1 identity, which MAY be either human or agent), `engagementRef`, `subjectRefs` (the records under examination), `finding` (one of `unmodified`, `modified`, `adverse`, `disclaimer`, or `exception`), `assertionResults` (per-assertion evaluation), and the standard identity, signature, and timestamp fields.

## 8. Class E — Engagement Record

A Class E record describes an audit engagement: scope, period, auditor identity, principal identity, applicable framework references (e.g. ISA, ISAE 3000, SOC 2, AT-C 105), engagement letter hash, materiality threshold, and the agent population in scope.

## 9. Relationship to AIS-1

Every AAS-1 record MUST reference an AIS-1 identity in `agentRef`, and Class D records MUST reference an AIS-1 identity in `auditorRef`. The two standards compose: AIS-1 establishes *who*, AAS-1 establishes *what*.

An auditor verifying a Class A record:

1. Dereferences `agentRef` to retrieve the AIS-1 identity document
2. Validates the record `signature` against keys declared in that document
3. Validates `timestampServiceRef` against the timestamping primitive defined in AIS-1 §3.4
4. Evaluates each assertion against the record and its evidence
5. Issues a Class D determination

## 10. Canonicalisation and Hashing

Records MUST be canonicalised before hashing or signing. v0.1 specifies JCS (RFC 8785) as the default canonicalisation. Hash algorithm is declared per-record in the `signature` object; SHA-256 is the default.

## 11. Open Questions for v0.2

- Standardisation of `materiality` calculation methodology for non-monetary actions
- Mapping table to ISA 315/330 risk-and-response framework
- Annex on continuous auditing semantics (Class C streams)
- Profile for Bermuda DABA Class M and Class F entities
- Profile for SOC 2 / ISAE 3402 service organisations using agents
- Profile for tax and statutory audit engagements where agents are part of management's controls
- Cross-reference to ALARGA / DASSA evidentiary requirements
- Conformance test suite

## 12. Licence

CC0 1.0 Universal. No rights reserved. Free to implement without restriction.

---

**AAS-1** — Agent Auditability Standard · v0.1 · May 2026
Published by BDA AI Agent Services · Kadikoy Limited, Bermuda

Companion to AIS-1 (Agent Identity Standard).
Comments and pull requests: github.com/Kadikoy1/aas-1

