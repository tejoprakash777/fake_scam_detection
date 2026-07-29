import { useRef, useState } from 'react';
import { ScanText, Loader2, Upload, FileImage, Sparkles, X } from 'lucide-react';
import { analyzeOcrApi, saveScan } from '@/lib/api';
import type { AnalysisResult } from '@/lib/types';
import { ResultPanel } from '@/components/ResultPanel';
import { PageHeader } from './ScanMessagePage';
import { toast } from '@/components/Notifications';

export function ScanOcrPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (!/image\/(png|jpeg|jpg|webp|bmp)|application\/pdf/.test(f.type)) {
      toast('warning', 'Please upload an image or PDF file.');
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast('warning', 'File too large (max 8MB).');
      return;
    }
    setFile(f);
    setExtractedText('');
    setResult(null);
    setSaved(false);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const extract = async () => {
    if (!file) return;
    setBusy(true);
    setStage('Loading OCR engine…');
    try {
      let imagesToOcr: string[] = [];
      if (file.type === 'application/pdf') {
        setStage('Rendering PDF pages…');
        imagesToOcr = await renderPdfToImages(file);
      } else {
        imagesToOcr = preview ? [preview] : [];
      }
      if (!imagesToOcr.length) throw new Error('Could not read the file.');

      setStage('Extracting text with OCR…');
      const { default: Tesseract } = await import('tesseract.js');
      let fullText = '';
      for (let i = 0; i < imagesToOcr.length; i++) {
        setStage(`Extracting text… (page ${i + 1}/${imagesToOcr.length})`);
        const { data } = await Tesseract.recognize(imagesToOcr[i], 'eng');
        fullText += (data.text || '') + '\n';
      }
      const clean = fullText.replace(/\s+\n/g, '\n').trim();
      setExtractedText(clean);
      if (clean.length < 5) {
        toast('warning', 'Could not extract readable text. Try a clearer image.');
        setBusy(false);
        setStage('');
        return;
      }
      setStage('Analysing extracted text…');
      const r = await analyzeOcrApi(clean);
      setResult(r);
      setSaved(false);
      if (r.verdict === 'fake') toast('error', 'High scam probability in this advertisement.');
      else if (r.verdict === 'suspicious') toast('warning', 'Some red flags found.');
      else toast('success', 'No major red flags.');
    } catch (err) {
      toast('error', 'OCR failed. Please try a clearer image.');
    } finally {
      setBusy(false);
      setStage('');
    }
  };

  const onSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await saveScan({ scanType: 'ocr', inputSummary: extractedText.slice(0, 200) || file?.name || 'OCR scan', result });
      setSaved(true);
      toast('success', 'Saved to history.');
    } catch { toast('error', 'Could not save.'); }
    finally { setSaving(false); }
  };

  const reset = () => {
    setFile(null); setPreview(null); setExtractedText(''); setResult(null); setSaved(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        icon={ScanText}
        title="OCR Advertisement Scanner"
        desc="Upload a job advertisement image, poster, screenshot or PDF. OCR extracts the text, then the AI engine analyses it for scam keywords, fee requests, fake contacts and more."
      />

      {!result && (
        <>
          <div className="card p-6">
            {!file ? (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0] ?? null); }}
                className="block border-2 border-dashed border-ink-300 rounded-2xl p-10 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50/40 transition"
              >
                <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
                <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 mx-auto flex items-center justify-center mb-3">
                  <Upload size={26} />
                </div>
                <p className="font-display text-base font-semibold text-ink-900">Drop a file or click to upload</p>
                <p className="text-sm text-ink-500 mt-1">PNG, JPG, WebP, BMP or PDF — up to 8MB</p>
              </label>
            ) : (
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="sm:w-48 shrink-0">
                  <div className="relative rounded-xl overflow-hidden border border-ink-200 bg-ink-50 aspect-square flex items-center justify-center">
                    {preview ? (
                      <img src={preview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-ink-400 p-4">
                        <FileImage size={32} className="mx-auto mb-2" />
                        <p className="text-xs">PDF document</p>
                      </div>
                    )}
                    <button onClick={() => { setFile(null); setPreview(null); setExtractedText(''); if (inputRef.current) inputRef.current.value = ''; }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 shadow flex items-center justify-center text-ink-600 hover:text-danger-600">
                      <X size={14} />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-ink-500 truncate">{file.name}</p>
                  <p className="text-xs text-ink-400">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <button onClick={extract} disabled={busy} className="btn-primary">
                      {busy ? <Loader2 size={16} className="animate-spin-slow" /> : <Sparkles size={16} />}
                      {busy ? stage || 'Working…' : 'Extract & analyse'}
                    </button>
                    {!busy && <button onClick={() => { setFile(null); setPreview(null); setExtractedText(''); }} className="btn-ghost">Choose another</button>}
                  </div>
                  {busy && (
                    <div className="rounded-xl bg-primary-50 border border-primary-200 p-3 text-sm text-primary-700 animate-pulse-ring">
                      {stage}…
                    </div>
                  )}
                  {extractedText && !busy && (
                    <div>
                      <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-2">Extracted text</p>
                      <div className="rounded-xl bg-ink-50 border border-ink-200 p-3 max-h-48 overflow-y-auto text-sm text-ink-700 whitespace-pre-wrap font-mono text-[12px] leading-relaxed">
                        {extractedText}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="card p-5 bg-ink-50/50">
            <p className="text-sm text-ink-600">
              <span className="font-semibold text-ink-800">Tip:</span> For best results, use a clear, well-lit
              image with readable text. Cropped screenshots of WhatsApp forwards work well.
            </p>
          </div>
        </>
      )}

      {result && (
        <ResultPanel
          result={result}
          entities={result.entities}
          onSave={onSave}
          saving={saving}
          saved={saved}
          onReset={reset}
        />
      )}
    </div>
  );
}

/* Render a PDF's pages to PNG data URLs using the browser canvas + pdf.js. */
async function renderPdfToImages(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  // @ts-expect-error pdfjsLib loaded at runtime from CDN
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error('PDF library not available');
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];
  const maxPages = Math.min(pdf.numPages, 5);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL('image/png'));
  }
  return images;
}
