// FraudGuard AI/NLP analysis Edge Function.
// Replaces the Flask/FastAPI backend described in the project spec.
// Endpoints (all POST /analyze-scam with { task, ...payload }):
//   task: "message"  -> analyze pasted recruitment text
//   task: "ocr"      -> analyze text extracted from an ad image/PDF
//   task: "government" -> verify against gov_notifications reference table
//   task: "website"  -> analyze a recruitment URL (https, domain, blacklist, age)
//   task: "qr"       -> analyze decoded QR text (routes to website or message)
//   task: "reference" -> return reference data (gov notifications + blacklist)
//   GET  /analyze-scam/health -> liveness check

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ---------- detection constants (mirror src/lib/detection.ts) ----------
const SCAM_KEYWORDS = [
  "registration fee", "application fee", "processing fee", "exam fee",
  "security deposit", "refundable fee", "booking amount", "form fee",
  "guaranteed job", "100% job", "sure selection", "confirmed selection",
  "direct recruitment", "backdoor", "back door", "agent", "consultancy",
  "paytm", "googlepay", "gpay", "upi id", "send money", "wire transfer",
  "whatsapp number", "telegram", "call on this number", "limited seats",
  "urgent hiring", "immediate joining", "work from home earn",
  "earn daily", "earn 5000", "earn 10000", "quick money",
  "government approved", "verified by govt", "pm scheme", "modi scheme",
  "free laptop", "free mobile", "free sim",
  "click here to apply", "bit.ly", "tinyurl", "shorte.st",
  "fake company", "rbi approved", "sebi approved",
  "no exam", "no interview", "direct interview",
  "selection without exam", "bribe", "recommendation",
];
const URGENCY_PHRASES = [
  "urgent", "immediately", "today only", "last date", "last chance",
  "hurry", "limited time", "act now", "apply now", "closing soon",
  "few hours left", "tomorrow last day", "expires today",
  "dont miss", "dont wait", "final reminder", "last few seats",
];
const GOV_ORGS = [
  "ssc", "staff selection commission", "upsc", "union public service commission",
  "rrb", "railway recruitment board", "ibps", "sbi", "lic",
  "drdo", "isro", "barc", "ongc", "ntpc", "bsnl", "aiims",
  " army", "indian army", "indian navy", "indian air force", "crpf", "bsf",
  "cisf", "itbp", "state psc", "mpsc", "uppsc", "bpsc", "rpsc", "kpsc",
  "tnpsc", "appsc", "opsc", "hpsc", "jharkhand psc", "ukpsc",
];
const GOV_DOMAINS = [
  ".gov.in", ".nic.in", "ssc.nic.in", "upsc.gov.in", "rrbcdg.gov.in",
  "ibps.in", "indianrailways.gov.in", "joinindianarmy.nic.in",
  "joinindiannavy.gov.in", "indianairforce.nic.in", "drdo.gov.in",
  "isro.gov.in", "aiims.edu", "ongcindia.com",
];
const PHISHING_URL_KEYWORDS = [
  "govt-job", "gov-job", "govtjob", "sarkari", "sarkri", "sarkaari",
  "freejobalert", "jobalert", "rojgar", "naukri-update", "apply-now",
  "instant-job", "govind", "govjobapply", "sarkarinaukri", "sarkari-result",
  "job-fair", "recruitment-apply", "online-form", "apply-online-free",
];

// ---------- helpers ----------
function normalize(t: string): string {
  return t.toLowerCase().replace(/\s+/g, " ").trim();
}
function countMatches(text: string, terms: string[]): string[] {
  const lower = normalize(text);
  return terms.filter((t) => lower.includes(t));
}
function extractEntities(text: string) {
  const out: { type: string; value: string }[] = [];
  const phone = text.match(/(\+?\d[\d\s-]{8,14}\d)/g) || [];
  phone.slice(0, 5).forEach((p) => out.push({ type: "Phone", value: p.trim() }));
  const emails = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || [];
  emails.slice(0, 5).forEach((e) => out.push({ type: "Email", value: e }));
  const upi = text.match(/\b[\w.\-]{2,}@(?:paytm|oksbi|okhdfcbank|ybl|apl|ibl|axisb|upi)\b/gi) || [];
  upi.slice(0, 3).forEach((u) => out.push({ type: "UPI", value: u }));
  const amounts = text.match(/(?:rs\.?|₹|inr)\s?\d[\d,]*/gi) || [];
  amounts.slice(0, 5).forEach((a) => out.push({ type: "Amount", value: a }));
  const urls = text.match(/https?:\/\/[^\s]+/gi) || [];
  urls.slice(0, 5).forEach((u) => out.push({ type: "URL", value: u }));
  return out;
}
function verdictFromScore(p: number) {
  return p >= 65 ? "fake" : p >= 35 ? "suspicious" : "safe";
}
function riskFromScore(p: number) {
  return p >= 65 ? "High Risk" : p >= 35 ? "Medium Risk" : "Safe";
}
function recommendationFor(verdict: string, t: string) {
  if (verdict === "fake")
    return `This ${t} shows strong scam indicators. Do NOT pay any fee, share personal documents, or click any link. Report it and block the sender.`;
  if (verdict === "suspicious")
    return `This ${t} has some red flags. Verify on the official .gov.in portal before taking any action. Never pay upfront fees.`;
  return `This ${t} appears legitimate, but always cross-check with the official government portal before sharing personal information.`;
}

function grammarFlags(text: string) {
  const r: any[] = [];
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return r;
  const caps = words.filter((w) => w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w));
  if (caps.length > words.length * 0.3)
    r.push({ label: "Excessive capitalization", detail: "Heavy use of ALL CAPS is a common urgency manipulation tactic.", severity: "warning", weight: 8 });
  const exclaim = (text.match(/!/g) || []).length;
  if (exclaim > 3)
    r.push({ label: "Too many exclamation marks", detail: `${exclaim} exclamation marks found — typical of hype-driven scam copy.`, severity: "warning", weight: 6 });
  const slang = ["ur", "u r", "pls", "plz", "kindly", "wan na", "urjent", "recurit", "recruitmnt"];
  const hits = slang.filter((s) => text.toLowerCase().includes(s));
  if (hits.length >= 2)
    r.push({ label: "Unprofessional language", detail: `Informal/SMS slang detected (${hits.join(", ")}). Official notifications use formal language.`, severity: "warning", weight: 7 });
  return r;
}

function analyzeText(text: string) {
  if (!text || text.trim().length < 5)
    return { verdict: "safe", riskLevel: "Safe", scamProbability: 0, trustScore: 100, reasons: [], entities: [], recommendation: "Enter text to analyze." };
  const reasons: any[] = [];
  let score = 0;

  const kw = countMatches(text, SCAM_KEYWORDS);
  if (kw.length) {
    score += Math.min(45, kw.length * 9);
    reasons.push({ label: `${kw.length} scam keyword${kw.length > 1 ? "s" : ""} detected`, detail: `Found: ${kw.slice(0, 6).join(", ")}${kw.length > 6 ? "…" : ""}`, severity: "danger", weight: Math.min(45, kw.length * 9) });
  }
  const urg = countMatches(text, URGENCY_PHRASES);
  if (urg.length) {
    score += Math.min(18, urg.length * 6);
    reasons.push({ label: "Urgency / pressure tactics", detail: `Pressure phrases: ${urg.slice(0, 4).join(", ")}`, severity: "warning", weight: Math.min(18, urg.length * 6) });
  }
  const entities = extractEntities(text);
  const upi = entities.find((e) => e.type === "UPI");
  const amount = entities.find((e) => e.type === "Amount");
  const feeHits = countMatches(text, ["fee", "deposit", "payment", "pay rs", "pay ₹", "send money", "upi", "transfer"]);
  if (feeHits.length || upi || amount) {
    score += 15;
    reasons.push({
      label: "Money / payment request",
      detail: upi ? `UPI handle detected: ${upi.value}. Genuine government recruitment never asks for payment via personal UPI.`
        : amount ? `Payment amount referenced: ${amount.value}.` : "Payment-related language detected.",
      severity: "danger", weight: 15,
    });
  }
  const orgHits = countMatches(text, GOV_ORGS);
  if (orgHits.length) {
    const personal = entities.some((e) => e.type === "Phone" || e.type === "Email") && upi;
    if (personal) {
      score += 10;
      reasons.push({ label: "Government name used with private contact", detail: `Mentions ${orgHits[0]} but routes you to a personal phone/UPI — official bodies never do this.`, severity: "danger", weight: 10 });
    } else {
      reasons.push({ label: "Recognised government organisation", detail: `References ${orgHits[0]} — cross-verify on its official portal.`, severity: "info", weight: 0 });
    }
  } else if (entities.some((e) => e.type === "Phone" || e.type === "Email")) {
    score += 8;
    reasons.push({ label: "No recognised government body", detail: "Recruitment message mentions contact details but no verifiable government organisation.", severity: "warning", weight: 8 });
  }
  const urlE = entities.filter((e) => e.type === "URL");
  if (urlE.length) {
    const suspicious = urlE.some((u) => /bit\.ly|tinyurl|t\.me|shorte\.st/i.test(u.value));
    if (suspicious) { score += 12; reasons.push({ label: "Shortened / untrusted link", detail: "Shortened URLs hide the real destination and are common in phishing.", severity: "danger", weight: 12 }); }
    else if (!/\.gov\.in|\.nic\.in/i.test(urlE[0].value)) { score += 6; reasons.push({ label: "Non-government link", detail: "Link does not point to an official .gov.in / .nic.in domain.", severity: "warning", weight: 6 }); }
  }
  reasons.push(...grammarFlags(text));

  const seen = new Set<string>();
  const deduped: any[] = [];
  let total = 0;
  for (const r of reasons) {
    if (seen.has(r.label)) continue;
    seen.add(r.label); deduped.push(r); total += r.weight;
  }
  const scamProbability = Math.min(98, total);
  const verdict = verdictFromScore(scamProbability);
  if (verdict === "safe")
    deduped.push({ label: "No major red flags", detail: "Message reads like a normal notification. Still verify on the official portal before acting.", severity: "success", weight: 0 });
  return {
    verdict, riskLevel: riskFromScore(scamProbability), scamProbability,
    trustScore: Math.max(2, 100 - scamProbability), reasons: deduped, entities,
    recommendation: recommendationFor(verdict, "message"),
  };
}

function analyzeWebsite(url: string, blacklist: string[]) {
  if (!url || url.trim().length < 4)
    return { verdict: "safe", riskLevel: "Safe", scamProbability: 0, trustScore: 100, reasons: [], entities: [], recommendation: "Enter a URL to analyse." };
  let parsed: URL;
  try { parsed = new URL(url.startsWith("http") ? url : `https://${url}`); }
  catch { return { verdict: "fake", riskLevel: "High Risk", scamProbability: 90, trustScore: 10, reasons: [{ label: "Invalid URL", detail: "The provided text is not a valid web address.", severity: "danger", weight: 90 }], entities: [], recommendation: "Could not parse the URL. Do not interact with it." }; }
  const host = parsed.hostname.toLowerCase();
  const reasons: any[] = [];
  let score = 0;
  if (parsed.protocol === "https:") reasons.push({ label: "Uses HTTPS", detail: "Secure transport layer is present.", severity: "success", weight: 0 });
  else { score += 15; reasons.push({ label: "No HTTPS", detail: "Site does not use an encrypted connection.", severity: "danger", weight: 15 }); }
  const isGov = GOV_DOMAINS.some((d) => host.endsWith(d));
  if (isGov) reasons.push({ label: "Official government domain", detail: `Ends in a trusted suffix (${host}).`, severity: "success", weight: 0 });
  else { score += 20; reasons.push({ label: "Not a .gov.in / .nic.in domain", detail: "Genuine government recruitment portals use official .gov.in or .nic.in domains.", severity: "warning", weight: 20 }); }
  const phish = countMatches(host + parsed.pathname, PHISHING_URL_KEYWORDS);
  if (phish.length) { score += Math.min(25, phish.length * 8); reasons.push({ label: "Phishing-style keywords in URL", detail: `Found: ${phish.slice(0, 4).join(", ")}`, severity: "danger", weight: Math.min(25, phish.length * 8) }); }
  if (url.length > 75) { score += 8; reasons.push({ label: "Unusually long URL", detail: `Length ${url.length} chars — long URLs can hide redirects.`, severity: "warning", weight: 8 }); }
  const parts = host.split(".").length;
  if (parts > 4) { score += 8; reasons.push({ label: "Many subdomains", detail: `${parts} dot-separated parts — sometimes used to mimic official sites.`, severity: "warning", weight: 8 }); }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) { score += 20; reasons.push({ label: "Raw IP address", detail: "Legitimate recruiters use domain names, not raw IPs.", severity: "danger", weight: 20 }); }
  if (blacklist.some((b) => host === b || host.endsWith(`.${b}`))) { score += 35; reasons.push({ label: "Domain is blacklisted", detail: "This domain appears in the reported-scam blacklist.", severity: "danger", weight: 35 }); }
  // Domain age heuristic: TLD patterns that scammers favour are often newly registered.
  const tld = host.split(".").pop() || "";
  if (["xyz", "top", "click", "online", "tk", "ml", "ga", "cf", "gq", "work", "live", "buzz"].includes(tld)) {
    score += 12; reasons.push({ label: "High-abuse TLD", detail: `.${tld} is frequently used by newly-registered scam domains.`, severity: "warning", weight: 12 });
  }
  const scamProbability = Math.min(97, score);
  const verdict = verdictFromScore(scamProbability);
  return {
    verdict, riskLevel: riskFromScore(scamProbability), scamProbability,
    trustScore: Math.max(3, 100 - scamProbability), reasons,
    entities: [{ type: "Domain", value: host }],
    recommendation: recommendationFor(verdict, "website"),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 200, headers: corsHeaders });

  const url = new URL(req.url);

  if (req.method === "GET" && url.pathname.endsWith("/health"))
    return new Response(JSON.stringify({ status: "ok", service: "fraudguard-analyze" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method !== "POST")
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json();
    const task: string = body?.task;
    if (!task)
      return new Response(JSON.stringify({ error: "Missing 'task' field" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Reference data fetcher
    if (task === "reference") {
      const [{ data: notif }, { data: bl }] = await Promise.all([
        supabase.from("gov_notifications").select("organization,notification_number,recruitment_title,official_url,verified").eq("verified", true).limit(200),
        supabase.from("blacklisted_domains").select("domain,reason"),
      ]);
      return new Response(JSON.stringify({ notifications: notif ?? [], blacklist: (bl ?? []).map((b: any) => b.domain) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (task === "message" || task === "ocr") {
      const text: string = body?.text ?? "";
      const result = analyzeText(text);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (task === "website" || task === "qr") {
      let target: string = body?.url ?? body?.text ?? "";
      if (task === "qr" && !/^https?:\/\//i.test(target)) {
        const r = analyzeText(target);
        return new Response(JSON.stringify(r), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: bl } = await supabase.from("blacklisted_domains").select("domain");
      const blacklist = (bl ?? []).map((b: any) => b.domain);
      const result = analyzeWebsite(target, blacklist);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (task === "government") {
      const { organization, notificationNumber, recruitmentTitle } = body ?? {};
      const org = (organization ?? "").trim().toLowerCase();
      const num = (notificationNumber ?? "").trim().toLowerCase();
      const title = (recruitmentTitle ?? "").trim().toLowerCase();
      if (!org && !num && !title)
        return new Response(JSON.stringify({ error: "Provide at least one field" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: records } = await supabase
        .from("gov_notifications").select("organization,notification_number,recruitment_title,official_url,verified");
      const list = (records ?? []) as any[];
      const match = list.find((r) => r.organization.toLowerCase() === org && (r.notification_number.toLowerCase() === num || r.recruitment_title.toLowerCase() === title));
      if (match) {
        return new Response(JSON.stringify({
          verdict: "safe", riskLevel: "Safe", scamProbability: 4, trustScore: 96,
          reasons: [{ label: "Found in official records", detail: `Matches ${match.organization} — notification ${match.notification_number}.`, severity: "success", weight: 0 }],
          recommendation: `Verified. Confirm details on ${match.official_url} before applying.`,
          meta: { officialUrl: match.official_url, matchedTitle: match.recruitment_title },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const partial = list.find((r) => r.organization.toLowerCase() === org && (r.notification_number.toLowerCase().includes(num) || r.recruitment_title.toLowerCase().includes(title)));
      const reasons: any[] = [];
      let score = 0;
      if (partial) { score += 25; reasons.push({ label: "Partial match only", detail: "A similar record exists but the notification number or title does not match exactly.", severity: "warning", weight: 25 }); }
      else { score += 45; reasons.push({ label: "Not found in trusted records", detail: "No matching notification in SSC / UPSC / RRB / State PSC reference data.", severity: "danger", weight: 45 }); }
      const knownOrg = GOV_ORGS.some((g) => org.includes(g));
      if (!knownOrg && org) { score += 15; reasons.push({ label: "Unrecognised organisation", detail: `"${organization}" is not in the list of known government recruiting bodies.`, severity: "warning", weight: 15 }); }
      const scamProbability = Math.min(95, score);
      const verdict = verdictFromScore(scamProbability);
      return new Response(JSON.stringify({
        verdict, riskLevel: riskFromScore(scamProbability), scamProbability,
        trustScore: Math.max(5, 100 - scamProbability), reasons,
        recommendation: recommendationFor(verdict, "notification"),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `Unknown task: ${task}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message ?? "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
