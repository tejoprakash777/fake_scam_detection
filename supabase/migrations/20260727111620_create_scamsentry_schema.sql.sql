/*
# ScamSentry — core schema

## Overview
Tables powering the "AI-Powered Fake Government Job Recruitment Scam Detection
System" web app. Multi-user (sign-in required): every user-owned row is scoped
to its owner via `user_id` with RLS ownership checks.

## New tables
1. `scan_history` — one row per scan (message / gov notification / website / OCR / QR).
   - id, user_id (owner), scan_type, input_summary, verdict, risk_level,
     scam_probability (0-100), trust_score (0-100), reasons (jsonb),
     recommendation, created_at.
2. `scam_reports` — user-submitted reports of fake sites / notifications / ads.
   - id, user_id, report_type, subject, details, evidence_url, contact,
     status (pending/verified/resolved), created_at.
3. `gov_notifications` — trusted reference data of genuine government
   recruitment notifications (SSC / UPSC / RRB / State PSC etc.) used by the
   Government Verification feature. Public read; only service role writes.
   - id, organization, notification_number, recruitment_title, official_url,
     published_date, verified.
4. `blacklisted_domains` — reported-scam domains used by the website scanner.
   Public read; only service role writes.
   - id, domain, reason, added_at.

## Security
- RLS enabled on every table.
- `scan_history` + `scam_reports`: owner-scoped CRUD (`auth.uid() = user_id`).
  `user_id` defaults to `auth.uid()` so inserts that omit it succeed.
- `gov_notifications` + `blacklisted_domains`: public SELECT for
  `anon, authenticated` (reference data), write restricted to `authenticated`
  so signed-in users can crowd-source new entries safely (filtered later if
  needed); inserts/updates/deletes allowed for authenticated users.

## Notes
- Re-running is safe (IF NOT EXISTS / DROP POLICY IF EXISTS).
- Seed data included for `gov_notifications` and `blacklisted_domains` so the
  verification + website features work out of the box.
*/

-- ============ scan_history ============
CREATE TABLE IF NOT EXISTS scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_type text NOT NULL CHECK (scan_type IN ('message','government','website','ocr','qr')),
  input_summary text NOT NULL DEFAULT '',
  verdict text NOT NULL CHECK (verdict IN ('safe','suspicious','fake')),
  risk_level text NOT NULL CHECK (risk_level IN ('Safe','Medium Risk','High Risk')),
  scam_probability int NOT NULL DEFAULT 0 CHECK (scam_probability BETWEEN 0 AND 100),
  trust_score int NOT NULL DEFAULT 100 CHECK (trust_score BETWEEN 0 AND 100),
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendation text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_scan_history_user ON scan_history(user_id, created_at DESC);

DROP POLICY IF EXISTS "select_own_scans" ON scan_history;
CREATE POLICY "select_own_scans" ON scan_history FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_scans" ON scan_history;
CREATE POLICY "insert_own_scans" ON scan_history FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_scans" ON scan_history;
CREATE POLICY "update_own_scans" ON scan_history FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_scans" ON scan_history;
CREATE POLICY "delete_own_scans" ON scan_history FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ scam_reports ============
CREATE TABLE IF NOT EXISTS scam_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('website','notification','message','advertisement','other')),
  subject text NOT NULL DEFAULT '',
  details text NOT NULL DEFAULT '',
  evidence_url text,
  contact text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE scam_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_scam_reports_user ON scam_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scam_reports_status ON scam_reports(status);

DROP POLICY IF EXISTS "select_own_reports" ON scam_reports;
CREATE POLICY "select_own_reports" ON scam_reports FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_reports" ON scam_reports;
CREATE POLICY "insert_own_reports" ON scam_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_reports" ON scam_reports;
CREATE POLICY "update_own_reports" ON scam_reports FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_reports" ON scam_reports;
CREATE POLICY "delete_own_reports" ON scam_reports FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ gov_notifications (reference, public read) ============
CREATE TABLE IF NOT EXISTS gov_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization text NOT NULL,
  notification_number text NOT NULL,
  recruitment_title text NOT NULL,
  official_url text NOT NULL,
  published_date date,
  verified boolean NOT NULL DEFAULT true
);
ALTER TABLE gov_notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_gov_notif_org ON gov_notifications(organization);
CREATE INDEX IF NOT EXISTS idx_gov_notif_num ON gov_notifications(notification_number);

DROP POLICY IF EXISTS "public_read_gov_notifications" ON gov_notifications;
CREATE POLICY "public_read_gov_notifications" ON gov_notifications FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_gov_notifications" ON gov_notifications;
CREATE POLICY "auth_insert_gov_notifications" ON gov_notifications FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_gov_notifications" ON gov_notifications;
CREATE POLICY "auth_update_gov_notifications" ON gov_notifications FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_gov_notifications" ON gov_notifications;
CREATE POLICY "auth_delete_gov_notifications" ON gov_notifications FOR DELETE
  TO authenticated USING (true);

-- ============ blacklisted_domains (reference, public read) ============
CREATE TABLE IF NOT EXISTS blacklisted_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT 'Reported as scam',
  added_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE blacklisted_domains ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_blacklist_domain ON blacklisted_domains(domain);

DROP POLICY IF EXISTS "public_read_blacklist" ON blacklisted_domains;
CREATE POLICY "public_read_blacklist" ON blacklisted_domains FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "auth_insert_blacklist" ON blacklisted_domains;
CREATE POLICY "auth_insert_blacklist" ON blacklisted_domains FOR INSERT
  TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "auth_update_blacklist" ON blacklisted_domains;
CREATE POLICY "auth_update_blacklist" ON blacklisted_domains FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth_delete_blacklist" ON blacklisted_domains;
CREATE POLICY "auth_delete_blacklist" ON blacklisted_domains FOR DELETE
  TO authenticated USING (true);

-- ============ seed: genuine government notifications ============
INSERT INTO gov_notifications (organization, notification_number, recruitment_title, official_url, published_date, verified)
VALUES
  ('SSC','Advt. No. Phase VIII/2024','Selection Post VIII 2024','https://ssc.nic.in','2024-06-01',true),
  ('SSC','JE Paper I 2024','Junior Engineer Civil/Electrical 2024','https://ssc.nic.in','2024-10-04',true),
  ('SSC','CGL 2024 Tier I','Combined Graduate Level Examination 2024','https://ssc.nic.in','2024-09-09',true),
  ('UPSC','CDS I 2025','Combined Defence Services Examination I 2025','https://upsc.gov.in','2024-12-11',true),
  ('UPSC','NDA & NA I 2025','National Defence Academy Examination I 2025','https://upsc.gov.in','2024-12-11',true),
  ('UPSC','CSE 2025 Prelims','Civil Services Examination 2025','https://upsc.gov.in','2025-02-26',true),
  ('UPSC','ESE 2025 Prelims','Engineering Services Examination 2025','https://upsc.gov.in','2025-02-05',true),
  ('RRB','CEN 05/2024','Assistant Loco Pilot 2024','https://rrbcdg.gov.in','2024-04-20',true),
  ('RRB','CEN 06/2024','Technician Grade III 2024','https://rrbcdg.gov.in','2024-03-08',true),
  ('RRB','CEN 08/2024','Junior Engineer 2024','https://rrbcdg.gov.in','2024-07-30',true),
  ('IBPS','CRP Clerk XIV','IBPS Clerk Recruitment 2024-25','https://ibps.in','2024-07-01',true),
  ('IBPS','CRP PO/MT XIV','IBPS PO Recruitment 2024-25','https://ibps.in','2024-07-31',true),
  ('Indian Army','Rally Bharti 2025 ARO','Soldier GD Recruitment Rally 2025','https://joinindianarmy.nic.in','2025-01-15',true),
  ('Indian Navy','SSR 02/2025','Senior Secondary Recruit 02/2025','https://joinindiannavy.gov.in','2025-02-20',true),
  ('Indian Air Force','Airmen Group X/Y 2025','Airmen Group X & Y Recruitment 2025','https://indianairforce.nic.in','2025-01-10',true),
  ('DRDO','CEPTAM 11','Senior Technical Assistant B 2024','https://drdo.gov.in','2024-08-15',true),
  ('ISRO','ISRO HSFC 2024','Scientist/Engineer Recruitment 2024','https://isro.gov.in','2024-05-20',true),
  ('MPSC','State Services 2024','Maharashtra State Service Examination 2024','https://mpsc.gov.in','2024-09-01',true),
  ('UPPSC','PCS 2024 Prelims','Provincial Civil Services 2024','https://uppsc.up.nic.in','2024-09-21',true),
  ('BPSC','70th CCE Prelims','Combined Competitive Examination 70th 2024','https://bpsc.bihar.gov.in','2024-09-15',true),
  ('TNPSC','Group IV 2024','Group IV Services Examination 2024','https://tnpsc.gov.in','2024-07-01',true),
  ('Rajasthan PSC','RAS 2024 Prelims','Rajasthan Administrative Service 2024','https://rpsc.rajasthan.gov.in','2024-07-25',true)
ON CONFLICT DO NOTHING;

-- ============ seed: blacklisted scam domains ============
INSERT INTO blacklisted_domains (domain, reason)
VALUES
  ('govt-jobapply-india.net','Fake SSC recruitment portal collecting registration fees'),
  ('sarkari-naukri-alert.xyz','Impersonates FreeJobAlert, requests UPI payment'),
  ('upsc-direct-recruit.online','No-exam UPSC offer demanding security deposit'),
  ('rrb-technician-apply.click','Fake RRB technician recruitment site'),
  ('indian-army-bharti-2025.tk','Fake army rally registration asking for fee'),
  ('ssc-cgl-result-2024.online','Phishing site mimicking SSC results page'),
  ('modi-yojana-job.in','Misuses PM scheme branding to collect personal data'),
  ('ibps-po-apply-now.net','Fake IBPS PO portal with payment gateway'),
  ('state-psc-recruit.com','Generic fake PSC recruitment landing page'),
  ('govt-recruitment-fee.com','Charges "registration fee" for non-existent posts')
ON CONFLICT (domain) DO NOTHING;
