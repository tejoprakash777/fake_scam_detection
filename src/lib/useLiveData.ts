import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import type { ScanHistoryRow, ScamReportRow } from './types';

/**
 * useLiveScans — subscribes to scan_history realtime changes.
 * Equivalent to a Firestore snapshot listener: the dashboard
 * re-renders automatically whenever the user inserts/updates/deletes a scan.
 */
export function useLiveScans(): { scans: ScanHistoryRow[]; loading: boolean } {
  const [scans, setScans] = useState<ScanHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const load = async () => {
      const { data } = await supabase
        .from('scan_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (mounted.current) {
        setScans((data ?? []) as unknown as ScanHistoryRow[]);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel('scan_history_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scan_history' },
        () => { load(); },
      )
      .subscribe();

    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { scans, loading };
}

/**
 * useLiveReports — same pattern for scam_reports.
 */
export function useLiveReports(): { reports: ScamReportRow[]; loading: boolean } {
  const [reports, setReports] = useState<ScamReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const load = async () => {
      const { data } = await supabase
        .from('scam_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (mounted.current) {
        setReports((data ?? []) as unknown as ScamReportRow[]);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel('scam_reports_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scam_reports' },
        () => { load(); },
      )
      .subscribe();

    return () => {
      mounted.current = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { reports, loading };
}
