export type ScanType = 'message' | 'government' | 'website' | 'ocr' | 'qr';
export type Verdict = 'safe' | 'suspicious' | 'fake';
export type RiskLevel = 'Safe' | 'Medium Risk' | 'High Risk';

export interface AnalysisReason {
  label: string;
  detail: string;
  severity: 'info' | 'warning' | 'danger' | 'success';
  weight: number;
}

export interface AnalysisResult {
  verdict: Verdict;
  riskLevel: RiskLevel;
  scamProbability: number;
  trustScore: number;
  reasons: AnalysisReason[];
  entities?: { type: string; value: string }[];
  recommendation: string;
  meta?: Record<string, string | number | boolean>;
}

export interface ScanHistoryRow {
  id: string;
  user_id: string;
  scan_type: ScanType;
  input_summary: string;
  verdict: Verdict;
  risk_level: RiskLevel;
  scam_probability: number;
  trust_score: number;
  reasons: AnalysisReason[];
  recommendation: string;
  created_at: string;
}

export interface ScamReportRow {
  id: string;
  user_id: string;
  report_type: 'website' | 'notification' | 'message' | 'advertisement' | 'other';
  subject: string;
  details: string;
  evidence_url?: string | null;
  contact?: string | null;
  status: 'pending' | 'verified' | 'resolved';
  created_at: string;
}

export interface GovNotificationRow {
  id: string;
  organization: string;
  notification_number: string;
  recruitment_title: string;
  official_url: string;
  published_date: string;
  verified: boolean;
}

export interface BlacklistRow {
  id: string;
  domain: string;
  reason: string;
  added_at: string;
}

export interface GovSchemeRow {
  id: string;
  name: string;
  ministry: string;
  category: 'Employment' | 'Welfare' | 'Skill' | 'Finance' | 'Agriculture';
  eligibility: string;
  benefits: string;
  official_url: string;
  is_free: boolean;
  verified: boolean;
}
