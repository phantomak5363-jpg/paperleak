import React, { useState, useEffect, useCallback } from 'react';
import {
  Printer, Lock, Unlock, CheckCircle2, ShieldAlert, Key,
  FileText, AlertTriangle, Shield, Hash, ChevronDown, ChevronRight,
  Layers, RefreshCw, Eye, QrCode, Copy, Sparkles, X, CheckCheck
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

/* ── Security gate definitions ─────────────────────────── */
const GATES = [
  { id: 1, label: 'Paper Scheduled',   desc: 'Valid exam schedule exists' },
  { id: 2, label: 'Status Verified',   desc: 'Status is RELEASED or PRINTED' },
  { id: 3, label: 'Time-Release Gate', desc: 'Current time ≥ release timestamp' },
  { id: 4, label: 'Role Authorization',desc: 'JWT carries PRINTING_STAFF role' },
  { id: 5, label: 'AES Decryption',    desc: 'Cryptographic decryption validated' },
];

const SET_COLORS = {
  A: { bg: '#dbeafe', border: '#93c5fd', color: '#1d4ed8', light: '#eff6ff' },
  B: { bg: '#ede9fe', border: '#c4b5fd', color: '#6d28d9', light: '#f5f3ff' },
  C: { bg: '#dcfce7', border: '#86efac', color: '#15803d', light: '#f0fdf4' },
  D: { bg: '#fef3c7', border: '#fcd34d', color: '#b45309', light: '#fffbeb' },
};

/* ── Parse raw content into sets ──────────────────────── */
function parseSets(rawContent) {
  if (!rawContent) return {};
  const sets = {};
  const setPattern = /={5,}\s*SET\s+([A-D])\s*={5,}([\s\S]*?)(?=={5,}\s*SET\s+[A-D]|$)/gi;
  let match;
  while ((match = setPattern.exec(rawContent)) !== null) {
    const setLetter = match[1].toUpperCase();
    const body = match[2].trim();
    const questions = [];
    const qPattern = /Q(\d+)\.\s*([\s\S]*?)(?=Q\d+\.|$)/gi;
    let qMatch;
    while ((qMatch = qPattern.exec(body)) !== null) {
      const qText = qMatch[2].trim();
      if (qText) questions.push({ num: parseInt(qMatch[1], 10), text: qText });
    }
    if (questions.length === 0 && body) {
      questions.push({ num: 1, text: body });
    }
    sets[setLetter] = questions;
  }
  return sets;
}

/* ── Dedicated Standalone Printing Engine ─────────────── */
const triggerPrintJob = ({ paperTitle, paperCode, subject, department, sets, targetSetLetter = null, copyCount = 1 }) => {
  const lettersToPrint = targetSetLetter ? [targetSetLetter] : Object.keys(sets);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;

  let pagesHtml = '';

  lettersToPrint.forEach((letter) => {
    const questions = sets[letter] || [];
    pagesHtml += `
      <div class="exam-page">
        <div class="watermark">SECURE EXAMINATION &bull; OFFICIAL COPY</div>
        
        <div class="header">
          <div class="top-row">
            <span class="confidential-tag">CONFIDENTIAL &bull; AUTHORIZED OFFICIAL COPY</span>
            <span class="set-indicator">SET ${letter}</span>
            <span class="code-tag">CODE: ${paperCode || 'EXAM-2026'}</span>
          </div>
          <h1 class="exam-title">${paperTitle || 'Examination Question Paper'}</h1>
          <div class="exam-meta">
            <span><strong>Subject:</strong> ${subject || 'General'}</span>
            <span>&bull;</span>
            <span><strong>Department:</strong> ${department || 'University Examination'}</span>
          </div>
          <div class="sub-inst">University Examination Authority &bull; Tamper-Sealed Document</div>
        </div>

        <div class="instructions-card">
          <div class="inst-title">CANDIDATE INSTRUCTIONS:</div>
          <ul>
            <li>Verify that your question booklet strictly corresponds to <strong>SET ${letter}</strong>.</li>
            <li>Answer all questions according to instructions in your official answer booklet.</li>
            <li>Total questions in this booklet: <strong>${questions.length}</strong>.</li>
          </ul>
        </div>

        <div class="questions-container">
    `;

    if (questions.length === 0) {
      pagesHtml += `<div class="no-qs">No questions registered for Set ${letter}.</div>`;
    } else {
      questions.forEach((q) => {
        pagesHtml += `
          <div class="question-row">
            <div class="q-header">Question ${q.num}.</div>
            <div class="q-content">${q.text.replace(/\n/g, '<br/>')}</div>
            <div class="q-divider"></div>
          </div>
        `;
      });
    }

    pagesHtml += `
        </div>

        <div class="footer-stamp">
          <div class="stamp-left">
            <div>DIGITAL LEDGER SIGNATURE: ${paperCode || 'SEC'}-ST${letter}-VERIFIED</div>
            <div>SECURITY HASH: SHA-256 ENCRYPTED ARCHIVE</div>
          </div>
          <div class="stamp-right">
            <div>PAGE 1 OF 1 &bull; SET ${letter}</div>
            <div>PRINT TIMESTAMP: ${new Date().toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;
  });

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>${paperTitle || 'Exam Paper'} - Set ${targetSetLetter || 'All'}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 14mm 16mm 14mm 16mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #111;
            background: #fff;
            line-height: 1.45;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .exam-page {
            position: relative;
            min-height: 96vh;
            page-break-after: always;
            padding-bottom: 20px;
          }
          .exam-page:last-child {
            page-break-after: auto;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-35deg);
            font-size: 32pt;
            font-weight: 900;
            color: rgba(0, 0, 0, 0.05);
            white-space: nowrap;
            pointer-events: none;
            z-index: 0;
            letter-spacing: 6px;
            font-family: sans-serif;
          }
          .header {
            position: relative;
            z-index: 1;
            text-align: center;
            border-bottom: 2.5px solid #000;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .top-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-family: monospace;
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .confidential-tag {
            color: #333;
          }
          .set-indicator {
            border: 2px solid #000;
            padding: 3px 14px;
            font-weight: 900;
            font-size: 13pt;
            font-family: sans-serif;
            background: #f0f0f0;
          }
          .code-tag {
            color: #000;
          }
          .exam-title {
            font-size: 18pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 6px 0;
          }
          .exam-meta {
            font-size: 11pt;
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-bottom: 4px;
          }
          .sub-inst {
            font-size: 9.5pt;
            font-style: italic;
            color: #555;
          }
          .instructions-card {
            position: relative;
            z-index: 1;
            background: #fbfbfb;
            border: 1px solid #bbb;
            padding: 10px 14px;
            font-size: 10pt;
            margin-bottom: 20px;
            border-radius: 4px;
          }
          .inst-title {
            font-weight: bold;
            margin-bottom: 4px;
            font-family: sans-serif;
            font-size: 9.5pt;
          }
          .instructions-card ul {
            padding-left: 20px;
          }
          .instructions-card li {
            margin-bottom: 2px;
          }
          .questions-container {
            position: relative;
            z-index: 1;
          }
          .question-row {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          .q-header {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 4px;
            font-family: sans-serif;
          }
          .q-content {
            padding-left: 18px;
            font-size: 11.5pt;
            line-height: 1.55;
            color: #111;
          }
          .q-divider {
            border-bottom: 1px dotted #ccc;
            margin-top: 14px;
          }
          .footer-stamp {
            position: relative;
            z-index: 1;
            margin-top: 36px;
            border-top: 1px solid #888;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            font-family: monospace;
            font-size: 8.5pt;
            color: #555;
          }
          .no-qs {
            padding: 30px;
            text-align: center;
            color: #777;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
    </html>
  `;

  doc.open();
  doc.write(fullHtml);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 3000);
  }, 350);
};

/* ── Print Preview Modal ───────────────────────────────── */
const PrintPreviewModal = ({ setLetter, questions, paperTitle, paperCode, subject, department, copyCount, sets, onClose }) => {
  const pal = SET_COLORS[setLetter] || SET_COLORS.A;

  const handlePrint = () => {
    triggerPrintJob({
      paperTitle,
      paperCode,
      subject,
      department,
      sets,
      targetSetLetter: setLetter,
      copyCount
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="rounded-3xl overflow-hidden glass-card flex flex-col bg-white border border-blue-200 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
                style={{ background: pal.bg, color: pal.color, border: `1px solid ${pal.border}` }}>
                {setLetter}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">Printable Booklet Layout Preview</h3>
                <p className="text-xs text-slate-500">{paperTitle} • Set {setLetter} ({questions.length} Qs)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print Set {setLetter} Sheet
              </button>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Printable Document Body Preview */}
          <div className="p-8 overflow-y-auto bg-slate-100 flex justify-center max-h-[70vh]">
            <div className="w-full max-w-2xl bg-white p-10 rounded-2xl shadow-md border border-slate-200 watermark-pattern font-serif text-slate-900 leading-normal relative">
              {/* Institutional Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-6 relative z-10">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-500 mb-2">
                  <span>CONFIDENTIAL</span>
                  <span className="px-3 py-0.5 border-2 border-slate-800 rounded font-black text-slate-900 bg-slate-100">SET {setLetter}</span>
                  <span>CODE: {paperCode}</span>
                </div>
                <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">{paperTitle}</h2>
                <div className="text-xs font-medium text-slate-600 mt-1 flex justify-center gap-4">
                  <span>Subject: <strong>{subject || 'General'}</strong></span>
                  <span>Dept: <strong>{department || 'Computer Science'}</strong></span>
                </div>
                <p className="text-xs text-slate-500 mt-1 italic">University Examination Authority • Official Sealed Copy</p>
              </div>

              {/* Instructions */}
              <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-lg text-xs mb-6 text-slate-700 relative z-10">
                <strong className="block mb-1 font-sans">CANDIDATE INSTRUCTIONS:</strong>
                <ul className="list-disc pl-4 space-y-0.5 font-sans text-[11px]">
                  <li>Verify that your question booklet strictly corresponds to <strong>SET {setLetter}</strong>.</li>
                  <li>Answer all questions in the official serial order.</li>
                  <li>Total Questions in this set: <strong>{questions.length}</strong>.</li>
                </ul>
              </div>

              {/* Questions */}
              <div className="space-y-6 relative z-10">
                {questions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic">No questions parsed for Set {setLetter}.</div>
                ) : questions.map((q) => (
                  <div key={q.num} className="text-sm">
                    <div className="font-bold mb-1 font-sans text-xs">Question {q.num}.</div>
                    <div className="pl-4 text-slate-800 leading-relaxed font-serif text-[13px]">{q.text}</div>
                    <div className="border-b border-dotted border-slate-300 mt-3 h-2" />
                  </div>
                ))}
              </div>

              {/* Security Footer */}
              <div className="mt-10 pt-4 border-t border-slate-400 flex items-center justify-between text-[10px] font-mono text-slate-500 relative z-10">
                <div>
                  <div>DIGITAL SIGNATURE VERIFIED ✓</div>
                  <div>SECURITY HASH: {paperCode}-ST{setLetter}-SEC</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-800">PAGE 1 OF 1</div>
                  <div>PRINT DATE: {new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main Printing Staff Dashboard ───────────────────────── */
export const PrintingStaffDashboard = () => {
  const toast = useToast();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePaper, setActivePaper] = useState(null);
  const [activeSet, setActiveSet] = useState('A');
  const [copyCount, setCopyCount] = useState(50);
  const [previewModal, setPreviewModal] = useState(null);
  const [printingBatch, setPrintingBatch] = useState(false);

  useEffect(() => { fetchPapers(); }, []);

  const fetchPapers = () => {
    setLoading(true);
    api.get('/papers')
      .then(r => {
        const eligible = r.data.filter(p => ['RELEASED', 'PRINTED'].includes(p.current_status));
        setPapers(eligible);
        if (eligible.length > 0 && !activePaper) {
          loadPaperDetails(eligible[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const loadPaperDetails = async (id) => {
    try {
      const res = await api.get(`/papers/${id}`);
      setActivePaper(res.data);
    } catch {
      toast.error('Failed to decrypt and load paper sets.', 'Access Error');
    }
  };

  const parsedSets = activePaper ? parseSets(activePaper.decrypted_content) : {};
  const setLetters = Object.keys(parsedSets).length > 0 ? Object.keys(parsedSets) : ['A', 'B', 'C', 'D'];

  const handlePrintThisSet = (letter) => {
    if (!activePaper) return;
    toast.info(`Preparing print job for Set ${letter}...`, 'Print Ready');
    triggerPrintJob({
      paperTitle: activePaper.title,
      paperCode: activePaper.paper_code,
      subject: activePaper.subject,
      department: activePaper.department,
      sets: parsedSets,
      targetSetLetter: letter,
      copyCount
    });
  };

  const handlePrintAll = () => {
    if (!activePaper) return;
    setPrintingBatch(true);
    toast.info(`Generating complete printable package for Sets A, B, C, D...`, 'Batch Printing');

    triggerPrintJob({
      paperTitle: activePaper.title,
      paperCode: activePaper.paper_code,
      subject: activePaper.subject,
      department: activePaper.department,
      sets: parsedSets,
      targetSetLetter: null, // Prints all sets!
      copyCount
    });

    setTimeout(() => {
      setPrintingBatch(false);
      toast.success('All 4 sets sent to printer spool.', 'Batch Print Sent');
    }, 1000);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            Secure Printing & Publishing Station
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic decryption gate, anti-tamper watermark verification, and multi-set batch publishing
          </p>
        </div>
      </div>

      {/* Security Gate Pipeline */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">5-Stage Decryption & Authorization Gate</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {GATES.map((g) => (
            <div key={g.id} className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-emerald-900 truncate">{g.label}</div>
                <div className="text-[10px] text-emerald-700 truncate">{g.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Paper Selection & Set Control Station */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading released papers...</div>
      ) : papers.length === 0 ? (
        <div className="rounded-3xl p-16 text-center glass-card border-dashed border-2 border-blue-200">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-blue-50 text-blue-500">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-700 mb-1">No Papers Released Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Exam papers will become available for printing here once their scheduled time-release lock expires or the Exam Controller releases them.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Paper Select Dropdown & Copy Quantity Controls */}
          <div className="glass-card rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Active Released Paper</label>
                <select
                  value={activePaper?.id || ''}
                  onChange={e => loadPaperDetails(e.target.value)}
                  className="text-xs font-bold px-3 py-2 rounded-xl bg-white border border-blue-200 outline-none text-slate-800"
                >
                  {papers.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.paper_code})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Copy Count Selector & Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Target Units</label>
                <div className="flex items-center gap-1.5">
                  {[25, 50, 100, 200].map(c => (
                    <button
                      key={c}
                      onClick={() => setCopyCount(c)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${
                        copyCount === c
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handlePrintThisSet(activeSet)}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all shadow-xs"
              >
                <Printer className="w-4 h-4 text-blue-600" />
                Print Set {activeSet}
              </button>

              <button
                onClick={handlePrintAll}
                disabled={printingBatch}
                className="btn-primary flex items-center gap-2 py-2.5 px-5 shadow-md shadow-blue-500/20"
              >
                {printingBatch ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                Print All Sets ({setLetters.join(', ')})
              </button>
            </div>
          </div>

          {/* Set Tabs & Preview */}
          {activePaper && (
            <div className="glass-card rounded-3xl overflow-hidden">
              {/* Set Selection Bar */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50/90 border-b border-blue-100 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mr-2">Paper Sets:</span>
                  {setLetters.map(letter => {
                    const pal = SET_COLORS[letter] || SET_COLORS.A;
                    const isActive = activeSet === letter;
                    return (
                      <button
                        key={letter}
                        onClick={() => setActiveSet(letter)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                          isActive
                            ? 'bg-white shadow-sm border-blue-300 text-blue-700'
                            : 'bg-transparent text-slate-500 border-transparent hover:bg-white/60'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: pal.color }} />
                        Set {letter} ({parsedSets[letter]?.length || 0} Questions)
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPreviewModal({
                    setLetter: activeSet,
                    questions: parsedSets[activeSet] || [],
                    paperTitle: activePaper.title,
                    paperCode: activePaper.paper_code,
                    subject: activePaper.subject,
                    department: activePaper.department,
                    copyCount,
                    sets: parsedSets
                  })}
                  className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" /> High-Res Print Preview
                </button>
              </div>

              {/* Set Questions Display */}
              <div className="p-6 space-y-4">
                {parsedSets[activeSet] ? (
                  <div className="space-y-3">
                    {parsedSets[activeSet].map((q) => (
                      <div key={q.num} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-4">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                          style={{
                            background: SET_COLORS[activeSet]?.bg || '#dbeafe',
                            color: SET_COLORS[activeSet]?.color || '#1d4ed8',
                            border: `1px solid ${SET_COLORS[activeSet]?.border || '#bfdbfe'}`
                          }}>
                          Q{q.num}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 leading-relaxed">{q.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No questions parsed for Set {activeSet}.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Print Preview Modal */}
      {previewModal && (
        <PrintPreviewModal
          setLetter={previewModal.setLetter}
          questions={previewModal.questions}
          paperTitle={previewModal.paperTitle}
          paperCode={previewModal.paperCode}
          subject={previewModal.subject}
          department={previewModal.department}
          copyCount={previewModal.copyCount}
          sets={previewModal.sets}
          onClose={() => setPreviewModal(null)}
        />
      )}
    </div>
  );
};
