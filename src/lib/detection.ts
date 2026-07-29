import type {
  AnalysisReason,
  AnalysisResult,
  RiskLevel,
  Verdict,
} from './types';

/* ============================================================
 * FraudGuard Detection Engine
 * NLP-style heuristic analysis + trust-score aggregation.
 * Mirrors the logic deployed in the Supabase Edge Function so the
 * UI can render an instant preview while the server does the
 * authoritative pass.
 * ============================================================ */

export const SCAM_KEYWORDS: string[] = [
  'registration fee', 'application fee', 'processing fee', 'exam fee',
  'security deposit', 'refundable fee', 'booking amount', 'form fee',
  'guaranteed job', '100% job', 'sure selection', 'confirmed selection',
  'direct recruitment', 'backdoor', 'back door', 'agent', 'consultancy',
  'paytm', 'googlepay', 'gpay', 'upi id', 'send money', 'wire transfer',
  'whatsapp number', 'telegram', 'call on this number', 'limited seats',
  'urgent hiring', 'immediate joining', 'work from home earn',
  'earn daily', 'earn 5000', 'earn 10000', 'quick money',
  'government approved', 'verified by govt', 'pm scheme', 'modi scheme',
  'free laptop', 'free mobile', 'free sim',
  'click here to apply', 'bit.ly', 'tinyurl', 'shorte.st',
  'fake company', 'rbi approved', 'sebi approved',
  'no exam', 'no interview', 'direct interview',
  'selection without exam', 'bribe', 'recommendation',
];

export const URGENCY_PHRASES: string[] = [
  'urgent', 'immediately', 'today only', 'last date', 'last chance',
  'hurry', 'limited time', 'act now', 'apply now', 'closing soon',
  'few hours left', 'tomorrow last day', 'expires today',
  'dont miss', 'dont wait', 'final reminder', 'last few seats',
];

export const GOV_ORGS: string[] = [
  'ssc', 'staff selection commission', 'upsc', 'union public service commission',
  'rrb', 'railway recruitment board', 'ibps', 'sbi', 'lic',
  'drdo', 'isro', 'barc', 'ongc', 'ntpc', 'bsnl', 'aiims',
  ' army', 'indian army', 'indian navy', 'indian air force', 'crpf', 'bsf',
  'cisf', 'itbp', 'state psc', 'mpsc', 'uppsc', 'bpsc', 'rpsc', 'kpsc',
  'tnpsc', 'appsc', 'opsc', 'hpsc', 'jharkhand psc', 'ukpsc',
];

export const GOV_DOMAINS: string[] = [
  '.gov.in', '.nic.in', 'ssc.nic.in', 'upsc.gov.in', 'rrbcdg.gov.in',
  'ibps.in', 'indianrailways.gov.in', 'joinindianarmy.nic.in',
  'joinindiannavy.gov.in', 'indianairforce.nic.in', 'drdo.gov.in',
  'isro.gov.in', 'aiims.edu', 'ongcindia.com',
];

export const PHISHING_URL_KEYWORDS: string[] = [
  'govt-job', 'gov-job', 'govtjob', 'sarkari', 'sarkri', 'sarkaari',
  'freejobalert', 'jobalert', 'rojgar', 'naukri-update', 'apply-now',
  'instant-job', 'govind', 'govjobapply', 'sarkarinaukri', 'sarkari-result',
  'job-fair', 'recruitment-apply', 'online-form', 'apply-online-free',
];

/* ---------- text helpers ---------- */

export function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function countMatches(text: string, terms: string[]): string[] {
  const lower = normalize(text);
  return terms.filter((t) => lower.includes(t));
}

/* very light NER — phone numbers, emails, UPI handles, amounts, URLs */
export function extractEntities(text: string): { type: string; value: string }[] {
  const entities: { type: string; value: string }[] = [];
  const phoneMatches = text.match(/(\+?\d[\d\s-]{8,14}\d)/g) || [];
  phoneMatches.slice(0, 5).forEach((p) => entities.push({ type: 'Phone', value: p.trim() }));
  const emailMatches = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [];
  emailMatches.slice(0, 5).forEach((e) => entities.push({ type: 'Email', value: e }));
  const upiMatches = text.match(/\b[\w.\-]{2,}@(?:paytm|oksbi|okhdfcbank|ybl|apl|ibl|axisb|oksbi|upi)\b/gi) || [];
  upiMatches.slice(0, 3).forEach((u) => entities.push({ type: 'UPI', value: u }));
  const amountMatches = text.match(/(?:rs\.?|₹|inr)\s?\d[\d,]*/gi) || [];
  amountMatches.slice(0, 5).forEach((a) => entities.push({ type: 'Amount', value: a }));
  const urlMatches = text.match(/https?:\/\/[^\s]+/gi) || [];
  urlMatches.slice(0, 5).forEach((u) => entities.push({ type: 'URL', value: u }));
  return entities;
}

/* grammar / structural red flags */
export function grammarFlags(text: string): AnalysisReason[] {
  const reasons: AnalysisReason[] = [];
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return reasons;

  const allCapsWords = words.filter((w) => w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w));
  if (allCapsWords.length > words.length * 0.3) {
    reasons.push({
      label: 'Excessive capitalization',
      detail: 'Heavy use of ALL CAPS is a common urgency manipulation tactic.',
      severity: 'warning',
      weight: 8,
    });
  }

  const exclaim = (text.match(/!/g) || []).length;
  if (exclaim > 3) {
    reasons.push({
      label: 'Too many exclamation marks',
      detail: `${exclaim} exclamation marks found — typical of hype-driven scam copy.`,
      severity: 'warning',
      weight: 6,
    });
  }

  // crude typo / sms-slang detector
  const slang = ['ur', 'u r', 'pls', 'plz', 'kindly', 'wan na', 'urjent', 'recurit', 'recruitmnt'];
  const slangHits = slang.filter((s) => text.toLowerCase().includes(s));
  if (slangHits.length >= 2) {
    reasons.push({
      label: 'Unprofessional language',
      detail: `Informal/SMS slang detected (${slangHits.join(', ')}). Official notifications use formal language.`,
      severity: 'warning',
      weight: 7,
    });
  }
  return reasons;
}

/* ---------- verdict helpers ---------- */

export function verdictFromScore(scamProbability: number): Verdict {
  if (scamProbability >= 65) return 'fake';
  if (scamProbability >= 35) return 'suspicious';
  return 'safe';
}

export function riskFromScore(scamProbability: number): RiskLevel {
  if (scamProbability >= 65) return 'High Risk';
  if (scamProbability >= 35) return 'Medium Risk';
  return 'Safe';
}

export function recommendationFor(verdict: Verdict, scanType: string): string {
  if (verdict === 'fake') {
    return `This ${scanType} shows strong scam indicators. Do NOT pay any fee, share personal documents, or click any link. Report it and block the sender.`;
  }
  if (verdict === 'suspicious') {
    return `This ${scanType} has some red flags. Verify on the official .gov.in portal before taking any action. Never pay upfront fees.`;
  }
  return `This ${scanType} appears legitimate, but always cross-check with the official government portal before sharing personal information.`;
}

/* ============================================================
 * 1. Scam Message / OCR text analysis (NLP pipeline)
 * ============================================================ */

export function analyzeMessage(text: string): AnalysisResult {
  const reasons: AnalysisReason[] = [];
  let scamScore = 0;

  if (!text || text.trim().length < 5) {
    return {
      verdict: 'safe',
      riskLevel: 'Safe',
      scamProbability: 0,
      trustScore: 100,
      reasons: [],
      entities: [],
      recommendation: 'Enter a message to analyze.',
    };
  }

  const keywordHits = countMatches(text, SCAM_KEYWORDS);
  if (keywordHits.length) {
    scamScore += Math.min(45, keywordHits.length * 9);
    reasons.push({
      label: `${keywordHits.length} scam keyword${keywordHits.length > 1 ? 's' : ''} detected`,
      detail: `Found: ${keywordHits.slice(0, 6).join(', ')}${keywordHits.length > 6 ? '…' : ''}`,
      severity: 'danger',
      weight: Math.min(45, keywordHits.length * 9),
    });
  }

  const urgencyHits = countMatches(text, URGENCY_PHRASES);
  if (urgencyHits.length) {
    scamScore += Math.min(18, urgencyHits.length * 6);
    reasons.push({
      label: 'Urgency / pressure tactics',
      detail: `Pressure phrases: ${urgencyHits.slice(0, 4).join(', ')}`,
      severity: 'warning',
      weight: Math.min(18, urgencyHits.length * 6),
    });
  }

  const feeHits = countMatches(text, ['fee', 'deposit', 'payment', 'pay rs', 'pay ₹', 'send money', 'upi', 'transfer']);
  const entities = extractEntities(text);
  const upiEntity = entities.find((e) => e.type === 'UPI');
  const amountEntity = entities.find((e) => e.type === 'Amount');
  if (feeHits.length || upiEntity || amountEntity) {
    scamScore += 15;
    reasons.push({
      label: 'Money / payment request',
      detail: upiEntity
        ? `UPI handle detected: ${upiEntity.value}. Genuine government recruitment never asks for payment via personal UPI.`
        : amountEntity
          ? `Payment amount referenced: ${amountEntity.value}.`
          : 'Payment-related language detected.',
      severity: 'danger',
      weight: 15,
    });
  }

  const orgHits = countMatches(text, GOV_ORGS);
  if (orgHits.length) {
    const hasPersonalContact = entities.some((e) => e.type === 'Phone' || e.type === 'Email') && upiEntity;
    if (hasPersonalContact) {
      scamScore += 10;
      reasons.push({
        label: 'Government name used with private contact',
        detail: `Mentions ${orgHits[0]} but routes you to a personal phone/UPI — official bodies never do this.`,
        severity: 'danger',
      weight: 10,
      });
    } else {
      reasons.push({
        label: 'Recognised government organisation',
        detail: `References ${orgHits[0]} — cross-verify on its official portal.`,
        severity: 'info',
        weight: 0,
      });
    }
  } else if (entities.some((e) => e.type === 'Phone' || e.type === 'Email')) {
    scamScore += 8;
    reasons.push({
      label: 'No recognised government body',
      detail: 'Recruitment message mentions contact details but no verifiable government organisation.',
      severity: 'warning',
      weight: 8,
    });
  }

  const urlEntities = entities.filter((e) => e.type === 'URL');
  if (urlEntities.length) {
    const suspicious = urlEntities.some((u) => /bit\.ly|tinyurl|t\.me|shorte\.st/i.test(u.value));
    if (suspicious) {
      scamScore += 12;
      reasons.push({
        label: 'Shortened / untrusted link',
        detail: 'Shortened URLs hide the real destination and are common in phishing.',
        severity: 'danger',
        weight: 12,
      });
    } else if (!/\.gov\.in|\.nic\.in/i.test(urlEntities[0].value)) {
      scamScore += 6;
      reasons.push({
        label: 'Non-government link',
        detail: 'Link does not point to an official .gov.in / .nic.in domain.',
        severity: 'warning',
        weight: 6,
      });
    }
  }

  reasons.push(...grammarFlags(text));

  // Deduplicate reasons and sum weights for the final scam score.
  let totalWeight = 0;
  const seen = new Set<string>();
  const deduped: AnalysisReason[] = [];
  for (const r of reasons) {
    if (seen.has(r.label)) continue;
    seen.add(r.label);
    deduped.push(r);
    totalWeight += r.weight;
  }
  const scamProbability = Math.min(98, totalWeight);
  const trustScore = Math.max(2, 100 - scamProbability);
  const verdict = verdictFromScore(scamProbability);
  const riskLevel = riskFromScore(scamProbability);

  if (verdict === 'safe') {
    reasons.push({
      label: 'No major red flags',
      detail: 'Message reads like a normal notification. Still verify on the official portal before acting.',
      severity: 'success',
      weight: 0,
    });
  }

  return {
    verdict,
    riskLevel,
    scamProbability,
    trustScore,
    reasons: deduped,
    entities,
    recommendation: recommendationFor(verdict, 'message'),
  };
}

/* ============================================================
 * 2. Government notification verification
 * ============================================================ */

export interface GovVerifyInput {
  organization: string;
  notificationNumber: string;
  recruitmentTitle: string;
  records: { notification_number: string; recruitment_title: string; organization: string; official_url: string; verified: boolean }[];
}

export function analyzeGovernment(input: GovVerifyInput): AnalysisResult {
  const reasons: AnalysisReason[] = [];
  let scamScore = 0;
  const org = input.organization.trim().toLowerCase();
  const num = input.notificationNumber.trim().toLowerCase();
  const title = input.recruitmentTitle.trim().toLowerCase();

  if (!org && !num && !title) {
    return {
      verdict: 'safe', riskLevel: 'Safe', scamProbability: 0, trustScore: 100,
      reasons: [], recommendation: 'Enter at least one field to verify.',
    };
  }

  const match = input.records.find(
    (r) =>
      r.organization.toLowerCase() === org &&
      (r.notification_number.toLowerCase() === num ||
        r.recruitment_title.toLowerCase() === title)
  );
  const partial = input.records.find(
    (r) =>
      r.organization.toLowerCase() === org &&
      (r.notification_number.toLowerCase().includes(num) ||
        r.recruitment_title.toLowerCase().includes(title))
  );

  if (match) {
    reasons.push({
      label: 'Found in official records',
      detail: `Matches ${match.organization} — notification ${match.notification_number}.`,
      severity: 'success',
      weight: 0,
    });
    return {
      verdict: 'safe',
      riskLevel: 'Safe',
      scamProbability: 4,
      trustScore: 96,
      reasons,
      recommendation: `Verified. Confirm details on ${match.official_url} before applying.`,
      meta: { officialUrl: match.official_url, matchedTitle: match.recruitment_title },
    };
  }

  if (partial) {
    scamScore += 25;
    reasons.push({
      label: 'Partial match only',
      detail: 'A similar record exists but the notification number or title does not match exactly.',
      severity: 'warning',
      weight: 25,
    });
  } else {
    scamScore += 45;
    reasons.push({
      label: 'Not found in trusted records',
      detail: 'No matching notification in SSC / UPSC / RRB / State PSC reference data.',
      severity: 'danger',
      weight: 45,
    });
  }

  const knownOrg = GOV_ORGS.some((g) => org.includes(g));
  if (!knownOrg && org) {
    scamScore += 15;
    reasons.push({
      label: 'Unrecognised organisation',
      detail: `"${input.organization}" is not in the list of known government recruiting bodies.`,
      severity: 'warning',
      weight: 15,
    });
  }

  // notification number format sanity: most use letters+digits e.g. "Advt. No. 12/2024"
  if (num && !/[a-z0-9]/i.test(num)) {
    scamScore += 10;
    reasons.push({ label: 'Unusual notification number', detail: 'Format does not look like a government advertisement number.', severity: 'warning', weight: 10 });
  }

  const scamProbability = Math.min(95, scamScore);
  const trustScore = Math.max(5, 100 - scamProbability);
  const verdict = verdictFromScore(scamProbability);
  return {
    verdict,
    riskLevel: riskFromScore(scamProbability),
    scamProbability,
    trustScore,
    reasons,
    recommendation: recommendationFor(verdict, 'notification'),
  };
}

/* ============================================================
 * 3. Website / URL scam detection
 * ============================================================ */

export function analyzeWebsite(url: string, opts: { blacklist: string[]; domainAgeDays?: number } = { blacklist: [] }): AnalysisResult {
  const reasons: AnalysisReason[] = [];
  let scamScore = 0;
  const entities: { type: string; value: string }[] = [];

  if (!url || url.trim().length < 4) {
    return { verdict: 'safe', riskLevel: 'Safe', scamProbability: 0, trustScore: 100, reasons: [], recommendation: 'Enter a URL to analyse.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return {
      verdict: 'fake', riskLevel: 'High Risk', scamProbability: 90, trustScore: 10,
      reasons: [{ label: 'Invalid URL', detail: 'The provided text is not a valid web address.', severity: 'danger', weight: 90 }],
      recommendation: 'Could not parse the URL. Do not interact with it.',
    };
  }

  const host = parsed.hostname.toLowerCase();
  entities.push({ type: 'Domain', value: host });

  // HTTPS
  if (parsed.protocol === 'https:') {
    reasons.push({ label: 'Uses HTTPS', detail: 'Secure transport layer is present.', severity: 'success', weight: 0 });
  } else {
    scamScore += 15;
    reasons.push({ label: 'No HTTPS', detail: 'Site does not use an encrypted connection.', severity: 'danger', weight: 15 });
  }

  // government domain
  const isGov = GOV_DOMAINS.some((d) => host.endsWith(d));
  if (isGov) {
    reasons.push({ label: 'Official government domain', detail: `Ends in a trusted suffix (${host}).`, severity: 'success', weight: 0 });
  } else {
    scamScore += 20;
    reasons.push({ label: 'Not a .gov.in / .nic.in domain', detail: 'Genuine government recruitment portals use official .gov.in or .nic.in domains.', severity: 'warning', weight: 20 });
  }

  // phishing keywords in host/path
  const phishHits = countMatches(host + parsed.pathname, PHISHING_URL_KEYWORDS);
  if (phishHits.length) {
    scamScore += Math.min(25, phishHits.length * 8);
    reasons.push({ label: 'Phishing-style keywords in URL', detail: `Found: ${phishHits.slice(0, 4).join(', ')}`, severity: 'danger', weight: Math.min(25, phishHits.length * 8) });
  }

  // URL length
  if (url.length > 75) {
    scamScore += 8;
    reasons.push({ label: 'Unusually long URL', detail: `Length ${url.length} chars — long URLs can hide redirects.`, severity: 'warning', weight: 8 });
  }

  // subdomain count
  const subParts = host.split('.').length;
  if (subParts > 4) {
    scamScore += 8;
    reasons.push({ label: 'Many subdomains', detail: `${subParts} dot-separated parts — sometimes used to mimic official sites.`, severity: 'warning', weight: 8 });
  }

  // IP-as-host
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    scamScore += 20;
    reasons.push({ label: 'Raw IP address', detail: 'Legitimate recruiters use domain names, not raw IPs.', severity: 'danger', weight: 20 });
  }

  // blacklist
  if (opts.blacklist.some((b) => host === b || host.endsWith(`.${b}`))) {
    scamScore += 35;
    reasons.push({ label: 'Domain is blacklisted', detail: 'This domain appears in the reported-scam blacklist.', severity: 'danger', weight: 35 });
  }

  // domain age (when provided by edge fn)
  if (typeof opts.domainAgeDays === 'number') {
    if (opts.domainAgeDays < 30) {
      scamScore += 18;
      reasons.push({ label: 'Very new domain', detail: `Registered ${opts.domainAgeDays} days ago — most scams use freshly created domains.`, severity: 'danger', weight: 18 });
    } else if (opts.domainAgeDays < 180) {
      scamScore += 8;
      reasons.push({ label: 'Recently registered', detail: `Domain age ${opts.domainAgeDays} days.`, severity: 'warning', weight: 8 });
    } else {
      reasons.push({ label: 'Established domain', detail: `Registered ${Math.round(opts.domainAgeDays / 365)}+ years ago.`, severity: 'success', weight: 0 });
    }
  }

  const scamProbability = Math.min(97, scamScore);
  const trustScore = Math.max(3, 100 - scamProbability);
  const verdict = verdictFromScore(scamProbability);
  return {
    verdict,
    riskLevel: riskFromScore(scamProbability),
    scamProbability,
    trustScore,
    reasons,
    entities,
    recommendation: recommendationFor(verdict, 'website'),
  };
}

/* ============================================================
 * 4. QR code analysis (treat decoded text as URL or message)
 * ============================================================ */

export function analyzeQr(decoded: string, blacklist: string[]): AnalysisResult {
  if (!decoded) {
    return { verdict: 'safe', riskLevel: 'Safe', scamProbability: 0, trustScore: 100, reasons: [], recommendation: 'Scan a QR code to analyse.' };
  }
  if (/^https?:\/\//i.test(decoded)) return analyzeWebsite(decoded, { blacklist });
  return analyzeMessage(decoded);
}
