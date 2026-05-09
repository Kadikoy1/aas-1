/**
 * AAS-1 Verification SDK
 * ──────────────────────
 * Reference verification for AAS-1 Class A Action Records.
 * Implements the verification flow described in AAS-1 v0.1 §7.3.
 *
 * Repository:  https://github.com/Kadikoy1/aas-1
 * Spec:        https://aas-1.org
 * Companion:   https://ais-1.org  (AIS-1 — Agent Identity Standard)
 * License:     CC0 1.0 Universal — Kadikoy Limited, Bermuda
 *
 * Dependencies (suggested):
 *   - canonicalize  (RFC 8785 JCS)
 *   - jsonschema    (Class A schema validation)
 *   - node:crypto   (signature verification)
 */

import canonicalize from 'canonicalize';
import { Validator } from 'jsonschema';
import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto';

// ─── Standard assertion catalogue ─────────────────────────────────────────────
export const AAS1_ASSERTIONS = {
  CLASSICAL: [
    'existence', 'completeness', 'accuracy', 'authorisation',
    'cutoff', 'classification', 'presentation'
  ],
  AGENT_SPECIFIC: [
    'identity', 'provenance', 'reproducibility',
    'policy_compliance', 'independence'
  ],
  ALL() { return [...this.CLASSICAL, ...this.AGENT_SPECIFIC]; }
};

// ─── Result type ──────────────────────────────────────────────────────────────
const FINDING = Object.freeze({
  SATISFIED: 'satisfied',
  EXCEPTION: 'exception',
  REQUIRES_AUDITOR_JUDGEMENT: 'requires_auditor_judgement'
});

/**
 * Verify a Class A Action Record.
 *
 * Performs structural checks (schema, signature, identity binding, optional
 * bond status, optional secondary timestamp) and returns a per-assertion
 * findings map. Assertions that require auditor judgement (sampling,
 * materiality, completeness across a population) are returned as
 * `requires_auditor_judgement` and must be evaluated by the auditor.
 *
 * @param {object} record - The AAS-1 Class A record to verify.
 * @param {object} options
 * @param {object}   options.schema           - The Class A JSON Schema.
 * @param {Function} options.resolveIdentity  - async (agentRef) => DID Document
 * @param {Function} [options.verifyBond]     - async (bondId)   => { valid, amlStatus }
 * @param {Function} [options.verifyTimestamp]- async (ref, ts)  => boolean
 * @returns {Promise<{
 *   valid: boolean,
 *   exceptions: string[],
 *   findings: Record<string, 'satisfied'|'exception'|'requires_auditor_judgement'>
 * }>}
 */
export async function verifyClassA(record, options) {
  const exceptions = [];
  const findings = {};

  // 1. Schema
  if (options.schema) {
    const result = new Validator().validate(record, options.schema);
    if (!result.valid) {
      for (const err of result.errors) exceptions.push(`schema:${err.path.join('.')}:${err.message}`);
    }
  } else {
    if (record.aas !== '0.1') exceptions.push('schema:wrong_version');
    if (record.class !== 'A') exceptions.push('schema:not_class_A');
  }

  // 2. Resolve actor identity via AIS-1
  let identity;
  try {
    identity = await options.resolveIdentity(record.agentRef);
    if (!identity) throw new Error('not_found');
  } catch (e) {
    exceptions.push(`identity:resolution_failed:${e.message}`);
    findings.identity = FINDING.EXCEPTION;
  }

  // 3. Verify the signature
  const sigOk = identity ? verifySignature(record, identity) : false;
  findings.identity = sigOk ? FINDING.SATISFIED : FINDING.EXCEPTION;
  if (!sigOk && identity) exceptions.push('signature:invalid');

  // 4. Optional: confirm AIS-1 bond is active
  if (options.verifyBond && identity?.bondId) {
    const bond = await options.verifyBond(identity.bondId);
    if (!bond?.valid) {
      exceptions.push('identity:bond_not_active');
      findings.authorisation = FINDING.EXCEPTION;
    }
  }

  // 5. Optional: verify the secondary timestamp service
  if (options.verifyTimestamp && record.timestampServiceRef) {
    const tsOk = await options.verifyTimestamp(record.timestampServiceRef, record.timestamp);
    findings.cutoff = tsOk ? FINDING.SATISFIED : FINDING.EXCEPTION;
    if (!tsOk) exceptions.push('cutoff:timestamp_verification_failed');
  }

  // 6. Structural assertions the SDK can confirm from the record alone
  if (record.action?.inputsHash && record.action?.outputsHash) {
    findings.accuracy = FINDING.REQUIRES_AUDITOR_JUDGEMENT;
    findings.reproducibility = FINDING.REQUIRES_AUDITOR_JUDGEMENT;
  } else {
    findings.accuracy = FINDING.EXCEPTION;
    exceptions.push('accuracy:missing_action_hashes');
  }
  if (record.action?.model || record.action?.tools) {
    findings.provenance = FINDING.SATISFIED;
  } else {
    findings.provenance = FINDING.EXCEPTION;
    exceptions.push('provenance:missing_model_and_tools');
  }
  if (record.policyRefs && record.policyResult) {
    findings.policy_compliance = record.policyResult.outcome === 'compliant'
      ? FINDING.SATISFIED : FINDING.EXCEPTION;
  } else {
    findings.policy_compliance = FINDING.REQUIRES_AUDITOR_JUDGEMENT;
  }

  // 7. Anything not yet decided requires auditor judgement
  for (const a of AAS1_ASSERTIONS.ALL()) {
    if (!(a in findings)) findings[a] = FINDING.REQUIRES_AUDITOR_JUDGEMENT;
  }

  return { valid: exceptions.length === 0, exceptions, findings };
}

/**
 * Verify a record's signature against the verification method declared in
 * the AIS-1 DID Document. Uses RFC 8785 JCS for canonicalisation.
 */
function verifySignature(record, didDocument) {
  const sig = record.signature;
  if (!sig) return false;

  const vm = (didDocument.verificationMethod || []).find(m => m.id === sig.keyRef);
  if (!vm) return false;

  // Canonicalise the record without its signature (RFC 8785 JCS)
  const { signature, ...rest } = record;
  const canonical = canonicalize(rest);

  // Hash
  const hashAlg = (sig.hashAlg || 'SHA-256').toLowerCase().replace('-', '');
  const digest = createHash(hashAlg).update(canonical).digest();

  // Verify
  try {
    const publicKey = createPublicKey({
      key: vm.publicKeyJwk || vm.publicKeyMultibase,
      format: vm.publicKeyJwk ? 'jwk' : 'pem'
    });
    return cryptoVerify(null, digest, publicKey, Buffer.from(sig.value, 'base64url'));
  } catch {
    return false;
  }
}

export default { verifyClassA, AAS1_ASSERTIONS };
