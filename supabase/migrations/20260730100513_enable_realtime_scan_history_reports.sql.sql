-- Enable Supabase Realtime on user-scoped tables so the dashboard
-- auto-updates when scans or reports change (equivalent to Firestore
-- snapshot listeners). Realtime broadcasts INSERT/UPDATE/DELETE events
-- to subscribed clients; RLS still governs which rows each user sees.

ALTER PUBLICATION supabase_realtime ADD TABLE scan_history;
ALTER PUBLICATION supabase_realtime ADD TABLE scam_reports;
