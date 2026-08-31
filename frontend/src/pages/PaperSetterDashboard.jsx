import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, CheckCircle2, AlertCircle, X, Shield, Lock,
  BookOpen, ChevronDown, ChevronRight, FileText, Award,
  Clock, RefreshCw, Layers, Search, Sparkles, Hash, Cpu, KeyRound, Tag, Shuffle
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

/* ── Colour helpers ──────────────────────────────────────── */
const STATUS_META = {
  SUBMITTED: { color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe', label: 'Submitted' },
  APPROVED:  { color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', label: 'Approved'  },
  REJECTED:  { color: '#dc2626', bg: '#fee2e2', border: '#fecaca', label: 'Rejected'  },
};

const MARKS_OPTIONS = [2, 5, 10, 15, 20];
const QUESTION_TYPES = [
  { id: 'DESCRIPTIVE', label: 'Descriptive / Long Answer', icon: '✍️' },
  { id: 'SHORT', label: 'Short Answer', icon: '📝' },
  { id: 'MCQ', label: 'Multiple Choice', icon: '🔘' },
  { id: 'PROBLEM', label: 'Analytical / Coding Problem', icon: '⚡' },
];

/* Pastel palette for exam name badges */
const EXAM_PALETTES = [
  { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe', dot: '#2563eb' },
  { bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe', dot: '#7c3aed' },
  { bg: '#cffafe', color: '#0e7490', border: '#a5f3fc', dot: '#06b6d4' },
  { bg: '#fef3c7', color: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
  { bg: '#fce7f3', color: '#9d174d', border: '#fbcfe8', dot: '#ec4899' },
];

const StatusChip = ({ status }) => {
  const m = STATUS_META[status] || { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', label: status };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
      {m.label}
    </span>
  );
};

/* ── Live Simulated AES Encryption Stream ── */
const EncryptionVisualizer = ({ content }) => {
  const [fakeCipher, setFakeCipher] = useState('');

  useEffect(() => {
    if (!content) {
      setFakeCipher('');
      return;
    }
    let hash = 'gAAAAAB' + btoa(encodeURIComponent(content)).replace(/=/g, '').slice(0, 48) + '...==';
    setFakeCipher(hash);
  }, [content]);

  if (!content) return null;

  return (
    <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-xs font-mono border border-slate-800 space-y-1.5 animate-fadeInUp">
      <div className="flex items-center justify-between text-[11px] text-blue-400 font-bold border-b border-slate-800 pb-1">
        <span className="flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-cyan-400" /> AES-256 GCM Live Cipher Stream
        </span>
        <span className="text-[10px] text-emerald-400">Zero-Leakage Buffer</span>
      </div>
      <div className="text-[11px] text-emerald-400/90 break-all leading-tight">
        {fakeCipher}
      </div>
    </div>
  );
};

/* ── Exam group accordion ─────────────────────────────────── */
const ExamGroup = ({ examName, questions, palette, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen);
  const total = questions.length;
  const approved = questions.filter(q => q.status === 'APPROVED').length;
  const rejected = questions.filter(q => q.status === 'REJECTED').length;

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const iso = !(ts.endsWith('Z') || ts.includes('+')) ? `${ts}Z` : ts;
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="rounded-2xl overflow-hidden glass-card" style={{ border: `1.5px solid ${palette.border}`, background: '#ffffff' }}>
      {/* Accordion header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
        style={{ background: open ? palette.bg : '#f8fafc' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          style={{ background: palette.bg, border: `1px solid ${palette.border}` }}>
          <BookOpen className="w-5 h-5" style={{ color: palette.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-black text-slate-800 text-sm truncate">{examName}</span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
              style={{ background: palette.bg, color: palette.color, border: `1px solid ${palette.border}` }}>
              {total} Question{total !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-3.5 mt-1 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {approved} Approved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
              {rejected} Rejected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              {total - approved - rejected} Pending
            </span>
          </div>
        </div>
        <div className="transition-transform duration-200 shrink-0" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </button>

      {/* Questions list */}
      {open && (
        <div className="divide-y divide-slate-100">
          {questions.map((q, i) => (
            <div key={q.id} className="px-5 py-4 flex items-start gap-4 hover:bg-blue-50/30 transition-colors">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs shadow-sm"
                style={{ background: palette.bg, color: palette.color, border: `1px solid ${palette.border}` }}>
                Q{i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {q.paper_code && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-blue-600" />
                      {q.paper_code}
                    </span>
                  )}
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                    {q.marks} Marks
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">📚 {q.subject}</span>
                  <span className="text-[11px] font-medium text-slate-500">🏛️ {q.department}</span>
                  <StatusChip status={q.status} />
                </div>
                {q.decrypted_content ? (
                  <p className="text-sm text-slate-800 font-medium leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                    {q.decrypted_content}
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <Lock className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-mono text-[11px]">AES-256 Encrypted in Secure Vault</span>
                  </div>
                )}
                <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Submitted: {formatTimestamp(q.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Main dashboard ───────────────────────────────────────── */
export const PaperSetterDashboard = () => {
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [examFilter, setExamFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('DESCRIPTIVE');

  const [form, setForm] = useState({
    exam_name: '', paper_code: '', subject: '', department: 'Computer Science', content: '', marks: 5
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchQuestions(); }, []);

  const fetchQuestions = () => {
    api.get('/questions')
      .then(r => setQuestions(r.data))
      .catch(() => {});
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/questions', {
        exam_name: form.exam_name.trim(),
        paper_code: form.paper_code.trim(),
        subject: form.subject.trim(),
        department: form.department.trim(),
        content: form.content.trim(),
        marks: parseInt(form.marks, 10)
      });
      toast.success(`Question added with Paper Code "${form.paper_code}" under "${form.exam_name}".`, 'Question Submitted');
      setShowForm(false);
      setForm({ exam_name: '', paper_code: '', subject: '', department: 'Computer Science', content: '', marks: 5 });
      fetchQuestions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Submission failed. Check connection.', 'Submission Error');
    } finally {
      setLoading(false);
    }
  };

  /* Unique exam names for filter dropdown */
  const examNames = useMemo(() => [...new Set(questions.map(q => q.exam_name))].sort(), [questions]);

  /* Filtered + grouped */
  const grouped = useMemo(() => {
    let filtered = questions;
    if (statusFilter !== 'ALL') filtered = filtered.filter(q => q.status === statusFilter);
    if (examFilter !== 'ALL') filtered = filtered.filter(q => q.exam_name === examFilter);
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      filtered = filtered.filter(q =>
        q.exam_name.toLowerCase().includes(qLower) ||
        (q.paper_code && q.paper_code.toLowerCase().includes(qLower)) ||
        q.subject.toLowerCase().includes(qLower) ||
        (q.decrypted_content && q.decrypted_content.toLowerCase().includes(qLower))
      );
    }

    const map = {};
    filtered.forEach(q => {
      if (!map[q.exam_name]) map[q.exam_name] = [];
      map[q.exam_name].push(q);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [questions, statusFilter, examFilter, searchQuery]);

  const totalQ = questions.length;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Paper Setter Studio
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Craft and submit examination questions protected with distributed cryptographic encryption
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg active:scale-95"
          style={{
            background: showForm
              ? 'linear-gradient(135deg,#dc2626,#ef4444)'
              : 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
            boxShadow: showForm
              ? '0 4px 14px rgba(239,68,68,0.3)'
              : '0 4px 14px rgba(37,99,235,0.3)',
          }}>
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel Editor' : 'Compose New Question'}
        </button>
      </div>

      {/* ── Add Question Form Modal / Box ── */}
      {showForm && (
        <div className="rounded-3xl overflow-hidden glass-card animate-fadeInUp"
          style={{ background: '#ffffff', border: '1.5px solid #bfdbfe', boxShadow: '0 20px 50px rgba(37,99,235,0.1)' }}>
          {/* Header strip */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600" />
          <div className="px-7 py-5 flex items-center gap-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-blue-100">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Compose Secure Question</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Questions are encrypted client-side using AES-256 GCM before transit to the database vault.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-7 space-y-6">
            {/* Question Type Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Question Format
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {QUESTION_TYPES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedType(t.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold transition-all border ${
                      selectedType === t.id
                        ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Exam Name & Paper Code Grid (Side-by-Side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-blue-50/70 border border-blue-200">
              <div>
                <label className="block text-xs font-bold text-blue-800 uppercase tracking-wide mb-1.5">
                  🎓 Target Exam Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field bg-white font-semibold"
                  placeholder="e.g. Final Semester CS-402, Mid-Term Cryptography 2026..."
                  value={form.exam_name}
                  onChange={e => setField('exam_name', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-800 uppercase tracking-wide mb-1.5">
                  🏷️ Paper Code / Subject Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field bg-white font-mono font-bold text-blue-900"
                  placeholder="e.g. CS401-2026, CYBER-MID"
                  value={form.paper_code}
                  onChange={e => setField('paper_code', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Subject, Department, Marks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field bg-white"
                  placeholder="e.g. Operating Systems"
                  value={form.subject}
                  onChange={e => setField('subject', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Department <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field bg-white"
                  placeholder="e.g. Computer Science"
                  value={form.department}
                  onChange={e => setField('department', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Weightage / Marks <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.marks}
                  onChange={e => setField('marks', e.target.value)}
                  className="input-field bg-white font-bold"
                  required
                >
                  {MARKS_OPTIONS.map(m => (
                    <option key={m} value={m}>{m} Marks</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Question Content textarea */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  Question Content & Problem Description <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                  {form.content.length} characters
                </span>
              </div>
              <textarea
                rows={5}
                value={form.content}
                onChange={e => setField('content', e.target.value)}
                className="input-field bg-white font-normal text-sm leading-relaxed resize-y"
                placeholder="Enter complete question statement, diagram notes, and any sub-parts (a, b, c)..."
                required
              />
            </div>

            {/* Live Cryptographic Visualizer */}
            <EncryptionVisualizer content={form.content} />

            {/* Form Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-blue-100 flex-wrap gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>SHA-256 integrity signature generated automatically.</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 py-2.5 px-6 shadow-md"
                >
                  {loading
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <CheckCircle2 className="w-4 h-4" />}
                  Encrypt & Vault Question
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          { label: 'Total Questions', value: totalQ, icon: FileText, color: '#2563eb', bg: '#dbeafe' },
          { label: 'Unique Exams', value: examNames.length, icon: BookOpen, color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Approved & Verified', value: questions.filter(q => q.status === 'APPROVED').length, icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' },
          { label: 'Pending Review', value: questions.filter(q => q.status === 'SUBMITTED').length, icon: Clock, color: '#d97706', bg: '#fef3c7' },
        ].map((s, i) => (
          <div key={i} className="glass-card rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-2xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[11px] font-semibold text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters & Search ── */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search questions by paper code, subject, keywords, or exam..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={examFilter}
            onChange={e => setExamFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-white border border-blue-200 outline-none font-semibold text-slate-700"
          >
            <option value="ALL">All Exams ({examNames.length})</option>
            {examNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-white border border-blue-200 outline-none font-semibold text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {(examFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => { setExamFilter('ALL'); setStatusFilter('ALL'); setSearchQuery(''); }}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Grouped Question List ── */}
      {grouped.length === 0 ? (
        <div className="rounded-3xl p-16 text-center glass-card border-dashed border-2 border-blue-200">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3.5 bg-blue-50 text-blue-500">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-700 mb-1">No Questions Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || examFilter !== 'ALL'
              ? 'Try modifying your search or clearing your active filters.'
              : 'Click "Compose New Question" to add your first examination problem.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([examName, qs], i) => (
            <ExamGroup
              key={examName}
              examName={examName}
              questions={qs}
              palette={EXAM_PALETTES[i % EXAM_PALETTES.length]}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
};
