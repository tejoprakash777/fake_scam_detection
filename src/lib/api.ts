import { supabase } from './supabase';
import type { AnalysisResult, ScanType, Verdict, RiskLevel, AnalysisReason, GovSchemeRow } from './types';
import { analyzeMessage, analyzeGovernment, analyzeWebsite, analyzeQr } from './detection';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-scam`;
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
});

/* Call the deployed edge function for authoritative server-side analysis.
   Falls back to the local engine on network error so the UI still works. */
async function callEdge(task: string, payload: Record<string, unknown>): Promise<AnalysisResult | null> {
  try {
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ task, ...payload }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.verdict === 'string') return data as AnalysisResult;
    return null;
  } catch {
    return null;
  }
}

export async function analyzeMessageApi(text: string): Promise<AnalysisResult> {
  const remote = await callEdge('message', { text });
  return remote ?? analyzeMessage(text);
}

export async function analyzeOcrApi(text: string): Promise<AnalysisResult> {
  const remote = await callEdge('ocr', { text });
  return remote ?? analyzeMessage(text);
}

export async function analyzeWebsiteApi(url: string, blacklist: string[]): Promise<AnalysisResult> {
  const remote = await callEdge('website', { url });
  if (remote) return remote;
  return analyzeWebsite(url, { blacklist });
}

export async function analyzeQrApi(decoded: string, blacklist: string[]): Promise<AnalysisResult> {
  const remote = await callEdge('qr', { text: decoded });
  if (remote) return remote;
  return analyzeQr(decoded, blacklist);
}

export interface GovRecord {
  organization: string;
  notification_number: string;
  recruitment_title: string;
  official_url: string;
  verified: boolean;
}

export async function fetchReferenceData(): Promise<{ notifications: GovRecord[]; blacklist: string[] }> {
  const remote = await callEdge('reference', {});
  if (remote && (remote as unknown as { notifications?: GovRecord[] }).notifications) {
    const r = remote as unknown as { notifications: GovRecord[]; blacklist: string[] };
    return { notifications: r.notifications, blacklist: r.blacklist ?? [] };
  }
  // fallback: direct Supabase reads (works because reference tables are public-read)
  const [{ data: n }, { data: b }] = await Promise.all([
    supabase.from('gov_notifications').select('organization,notification_number,recruitment_title,official_url,verified').eq('verified', true),
    supabase.from('blacklisted_domains').select('domain'),
  ]);
  return {
    notifications: (n ?? []) as GovRecord[],
    blacklist: (b ?? []).map((x) => (x as { domain: string }).domain),
  };
}

export async function analyzeGovernmentApi(input: {
  organization: string;
  notificationNumber: string;
  recruitmentTitle: string;
}, records: GovRecord[]): Promise<AnalysisResult> {
  const remote = await callEdge('government', input);
  if (remote) return remote;
  return analyzeGovernment({
    organization: input.organization,
    notificationNumber: input.notificationNumber,
    recruitmentTitle: input.recruitmentTitle,
    records,
  });
}

/* ---- government schemes directory ---- */
export async function fetchSchemes(): Promise<GovSchemeRow[]> {
  const { data, error } = await supabase
    .from('gov_schemes')
    .select('id,name,ministry,category,eligibility,benefits,official_url,is_free,verified')
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as GovSchemeRow[];
}

/* ---- scan history persistence ---- */
export async function saveScan(args: {
  scanType: ScanType;
  inputSummary: string;
  result: AnalysisResult;
}): Promise<void> {
  const { scanType, inputSummary, result } = args;
  const payload = {
    scan_type: scanType,
    input_summary: inputSummary.slice(0, 500),
    verdict: result.verdict as Verdict,
    risk_level: result.riskLevel as RiskLevel,
    scam_probability: Math.round(result.scamProbability),
    trust_score: Math.round(result.trustScore),
    reasons: result.reasons as AnalysisReason[],
    recommendation: result.recommendation,
  };
  const { error } = await supabase.from('scan_history').insert(payload);
  if (error) throw error;
}

export async function fetchHistory(): Promise<{ id: string; scan_type: ScanType; input_summary: string; verdict: Verdict; risk_level: RiskLevel; scam_probability: number; trust_score: number; reasons: AnalysisReason[]; recommendation: string; created_at: string }[]> {
  const { data, error } = await supabase
    .from('scan_history')
    .select('id,scan_type,input_summary,verdict,risk_level,scam_probability,trust_score,reasons,recommendation,created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as { id: string; scan_type: ScanType; input_summary: string; verdict: Verdict; risk_level: RiskLevel; scam_probability: number; trust_score: number; reasons: AnalysisReason[]; recommendation: string; created_at: string }[];
}

export async function deleteScan(id: string): Promise<void> {
  const { error } = await supabase.from('scan_history').delete().eq('id', id);
  if (error) throw error;
}

export async function clearHistory(): Promise<void> {
  const { error } = await supabase.from('scan_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

/* ---- scam reports ---- */
export async function submitReport(args: {
  report_type: 'website' | 'notification' | 'message' | 'advertisement' | 'other';
  subject: string;
  details: string;
  evidence_url?: string;
  contact?: string;
}): Promise<void> {
  const { error } = await supabase.from('scam_reports').insert(args);
  if (error) throw error;
}

export async function fetchReports(): Promise<{ id: string; report_type: string; subject: string; details: string; status: string; created_at: string }[]> {
  const { data, error } = await supabase
    .from('scam_reports')
    .select('id,report_type,subject,details,status,created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as { id: string; report_type: string; subject: string; details: string; status: string; created_at: string }[];
}
