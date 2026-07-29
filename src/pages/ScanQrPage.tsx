import { useEffect, useRef, useState } from 'react';
import { QrCode, Loader2, Camera, CameraOff, Image as ImageIcon, Sparkles, X } from 'lucide-react';
import { analyzeQrApi, fetchReferenceData, saveScan } from '@/lib/api';
import type { AnalysisResult } from '@/lib/types';
import { ResultPanel } from '@/components/ResultPanel';
import { PageHeader } from './ScanMessagePage';
import { toast } from '@/components/Notifications';

// html5-qrcode is imported dynamically so it only loads when the user opens this page.
type Html5Qrcode = {
  start: (camId: string, cfg: { fps: number; qrbox: unknown }, onSuccess: (d: string) => void, onError: (e: unknown) => void) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => Promise<void>;
  scanFile: (file: File, showImage?: boolean) => Promise<string>;
};
interface CameraDevice { id: string; label: string; }
interface Html5QrcodeClass {
  new (id: string): Html5Qrcode;
  getCameras: () => Promise<CameraDevice[]>;
}
type Html5QrcodeModule = {
  Html5Qrcode: Html5QrcodeClass;
};

export function ScanQrPage() {
  const [decoded, setDecoded] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [activeCam, setActiveCam] = useState<string | null>(null);
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => { fetchReferenceData().then((r) => setBlacklist(r.blacklist)).catch(() => {}); }, []);

  useEffect(() => {
    return () => { stopCamera().catch(() => {}); };
  }, []);

  const startCamera = async () => {
    try {
      const mod = (await import('html5-qrcode')) as unknown as Html5QrcodeModule;
      const cams = await mod.Html5Qrcode.getCameras();
      if (!cams.length) { toast('error', 'No camera found on this device.'); return; }
      setCameras(cams);
      const back = cams.find((c) => /back|rear|environment/i.test(c.label)) ?? cams[0];
      const scanner = new mod.Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        back.id,
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (data) => { handleDecoded(data); stopCamera(); },
        () => {},
      );
      setActiveCam(back.id);
      setScanning(true);
    } catch {
      toast('error', 'Could not access camera. Allow camera permission or upload an image instead.');
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); await scannerRef.current.clear(); } catch { /* already stopped */ }
      scannerRef.current = null;
    }
    setScanning(false);
    setActiveCam(null);
  };

  const handleDecoded = async (data: string) => {
    setDecoded(data);
    toast('success', 'QR code decoded. Analysing…');
    setBusy(true);
    try {
      const r = await analyzeQrApi(data, blacklist);
      setResult(r);
      setSaved(false);
      if (r.verdict === 'fake') toast('error', 'High-risk QR content detected.');
      else if (r.verdict === 'suspicious') toast('warning', 'Some red flags found.');
      else toast('success', 'QR content appears safe.');
    } catch { toast('error', 'Analysis failed.'); }
    finally { setBusy(false); }
  };

  const onFile = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast('warning', 'Please select an image file.'); return; }
    setBusy(true);
    try {
      const mod = (await import('html5-qrcode')) as unknown as Html5QrcodeModule;
      const scanner = new mod.Html5Qrcode('qr-reader-file');
      const text = await scanner.scanFile(f, false);
      handleDecoded(text);
    } catch {
      toast('error', 'No QR code found in the image. Try a clearer image.');
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await saveScan({ scanType: 'qr', inputSummary: decoded, result });
      setSaved(true);
      toast('success', 'Saved to history.');
    } catch { toast('error', 'Could not save.'); }
    finally { setSaving(false); }
  };

  const reset = () => { setResult(null); setDecoded(''); setSaved(false); };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={QrCode}
        title="Scan QR Code"
        desc="Scan a QR code from a recruitment advertisement or poster using your camera, or upload an image containing a QR code. The decoded content is analysed as a URL or message."
      />

      {!result && (
        <div className="card p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Camera */}
            <div>
              <h3 className="font-display text-base font-semibold text-ink-900 mb-2">Live camera</h3>
              <div id="qr-reader" className="w-full aspect-square rounded-xl overflow-hidden bg-ink-900 relative">
                {!scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70">
                    <CameraOff size={32} className="mb-2" />
                    <p className="text-sm">Camera off</p>
                  </div>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {!scanning ? (
                  <button onClick={startCamera} disabled={busy} className="btn-primary text-sm">
                    <Camera size={15} /> Start camera
                  </button>
                ) : (
                  <button onClick={stopCamera} className="btn-ghost text-sm">
                    <CameraOff size={15} /> Stop
                  </button>
                )}
                {scanning && cameras.length > 1 && (
                  <select value={activeCam ?? ''} onChange={async (e) => { await stopCamera(); startCamera(); setActiveCam(e.target.value); }}
                    className="input-field text-sm py-2 w-auto">
                    {cameras.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* Upload */}
            <div>
              <h3 className="font-display text-base font-semibold text-ink-900 mb-2">Upload QR image</h3>
              <div id="qr-reader-file" className="hidden" />
              <label className="block border-2 border-dashed border-ink-300 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/40 transition">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 mx-auto flex items-center justify-center mb-2">
                  <ImageIcon size={22} />
                </div>
                <p className="text-sm font-medium text-ink-700">Choose an image</p>
                <p className="text-xs text-ink-400 mt-0.5">PNG, JPG with a visible QR code</p>
              </label>

              {decoded && !result && (
                <div className="mt-4 rounded-xl bg-ink-50 border border-ink-200 p-3">
                  <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-1">Decoded content</p>
                  <p className="text-sm text-ink-800 font-mono break-all">{decoded}</p>
                </div>
              )}

              {busy && (
                <div className="mt-4 flex items-center gap-2 text-sm text-primary-600">
                  <Loader2 size={16} className="animate-spin-slow" /> Analysing…
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {result && (
        <>
          {decoded && (
            <div className="card p-4">
              <div className="flex items-start gap-3">
                <span className="chip bg-primary-100 text-primary-700">Decoded</span>
                <p className="text-sm text-ink-700 font-mono break-all flex-1">{decoded}</p>
                <button onClick={reset} className="text-ink-400 hover:text-ink-600"><X size={16} /></button>
              </div>
            </div>
          )}
          <ResultPanel
            result={result}
            entities={result.entities}
            onSave={onSave}
            saving={saving}
            saved={saved}
            onReset={reset}
          />
        </>
      )}
    </div>
  );
}
