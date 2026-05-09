# AAS-1 — Agent Auditability Standard

> The open standard for agent auditability. CC0 — free to implement.

**Version:** 0.1 (working draft)
**Status:** Draft for public comment — closes 31 July 2026
**Companion to:** [AIS-1 — Agent Identity Standard](https://ais-1.org)
**Website:** [aas-1.org](https://aas-1.org)

---

## What is AAS-1?

AAS-1 defines an evidentiary record format and a set of standard assertions that allow an independent reviewer — human or agent — to form assurance opinions about the activity of autonomous AI agents.

Where AIS-1 answers *who is the agent*, AAS-1 answers *what did the agent do, under whose authority, and how do we know*.

## Specification

- [`AAS-1-v0.1.md`](AAS-1-v0.1.md) — the full specification

## Schemas

- [`schemas/aas-1-class-a.schema.json`](schemas/aas-1-class-a.schema.json) — JSON Schema for Class A action records

Schemas for Classes B (Batch), C (Continuous), D (Determination) and E (Engagement) are deferred to v0.2.

## Examples

- [`examples/aas-1-example-class-a.json`](examples/aas-1-example-class-a.json) — PayAgent Class A: USDC transfer with full evidence chain

## The five record classes

| Class | Name | Issuer | Purpose |
|-------|------|--------|---------|
| A | Action | Agent / operator | Single agent action with evidence |
| B | Batch | Operator | Aggregation of Class A over a period |
| C | Continuous | Operator | Streamed entry under continuous attestation |
| D | Determination | Auditor | Auditor's finding, opinion, or exception |
| E | Engagement | Auditor | Audit engagement metadata |

## The twelve assertions

**Classical (adapted from ISA 315/330, AICPA AU-C, ISAE 3000-series):**
existence · completeness · accuracy · authorisation · cutoff · classification · presentation

**Agent-specific:**
identity · provenance · reproducibility · policy compliance · independence

## Relationship to AIS-1

Every AAS-1 record MUST reference an AIS-1 identity in `agentRef`. Class D records MUST reference an AIS-1 identity in `auditorRef`. The two standards compose — AIS-1 establishes who, AAS-1 establishes what.

## Public comment

We invite feedback from practising auditors, agent developers, blockchain engineers, legal and regulatory professionals, enterprise deployers, and standards organisations.

- Open issues at [github.com/Kadikoy1/aas-1/issues](https://github.com/Kadikoy1/aas-1/issues)
- Submit feedback at [aas-1.org/#feedback](https://aas-1.org/#feedback)
- Email: info@aiagentsservices.net

The comment period closes **31 July 2026**. A revised v0.2 will incorporate substantive feedback.

## Licence

[CC0 1.0 Universal](LICENSE). No rights reserved. Free to implement without restriction.

---

Published by **BDA AI Agent Services** · Kadikoy Limited, Bermuda
