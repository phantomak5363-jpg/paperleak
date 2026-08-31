import React, { useState, useEffect } from 'react';
import {
  CheckSquare, X, Check, Eye, Star, RefreshCw,
  AlertCircle, CheckCircle2, Shuffle, Hash, Shield,
  BookOpen, Layers, ChevronDown, Lock, Users, FileText,
  Search, Columns, Sparkles, SlidersHorizontal
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

/* ── Status chips ────────────────────────────────────────── */
const STATUS_INFO = {
  DRAFT:        { color: '#64748b', bg: '#f1f5f9',  label: 'Draft',        border: '#cbd5e1' },
  SUBMITTED:    { color: '#1d4ed8', bg: '#dbeafe',  label: 'Submitted',    border: '#bfdbfe' },
  UNDER_REVIEW: { color: '#d97706', bg: '#fef3c7',  label: 'Under Review', border: '#fde68a' },
  APPROVED:     { color: '#16a34a', bg: '#dcfce7',  label: 'Approved',     border: '#bbf7d0' },
  REJECTED:     { color: '#dc2626', bg: '#fee2e2',  label: 'Rejected',     border: '#fecaca' },
  SCHEDULED:    { color: '#7c3aed', bg: '#ede9fe',  label: 'Scheduled',    border: '#ddd6fe' },
  RELEASED:     { color: '#0e7490', bg: '#cffafe',  label: 'Released',     border: '#a5f3fc' },
  PRINTED:      { color: '#0f766e', bg: '#ccfbf1',  label: 'Printed',      border: '#99f6e4' },
};

const StatusChip = ({ status }) => {
  const info = STATUS_INFO[status] || STATUS_INFO.DRAFT;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
      style={{ background: info.bg, color: info.color, border: `1px solid ${info.border}` }}>
      {info.label}
    </span>
  );
};

/* ── Review Decision Modal ───────────────────────────────── */
const ReviewModal = ({ paper, onClose, onDecision }) => {
  const toast = useToast();
  const [rejectionReason, setRejectionReason] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDecision, setActiveDecision] = useState(null);

  const submit = async (dec) => {
    if (dec === 'REJECTED' && !rejectionReason.trim()) {
      toast.warning('A specific rejection reason is mandatory.', 'Missing Reason');
      return;
    }
    setLoading(true);
    setActiveDecision(dec);
    try {
      if (paper.current_status === 'SUBMITTED') {
        await api.post('/reviews', {
          paper_id: paper.id, decision: 'UNDER_REVIEW',
          rejection_reason: null,
          comments: 'Auto-transitioned to Under Review.'
        }).catch(() => {});
      }
      await api.post('/reviews', {
        paper_id: paper.id,
        decision: dec,
        rejection_reason: dec === 'REJECTED' ? rejectionReason.trim() : null,
        comments: comments.trim() || null
      });
      toast.success(`Paper has been ${dec.toLowerCase()} successfully.`, 'Review Saved');
      onDecision(dec);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to submit review.', 'Review Error');
    } finally {
      setLoading(false);
      setActiveDecision(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="rounded-3xl overflow-hidden glass-card"
          style={{ background: '#ffffff', border: '1.5px solid #bfdbfe', boxShadow: '0 25px 60px rgba(37,99,235,0.18)' }}>
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" />
          <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-blue-100">
            <div>
              <h3 className="text-base font-black text-slate-800">{paper.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500 font-mono font-bold">{paper.paper_code}</span>
                <StatusChip status={paper.current_status} />
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Subject', value: paper.subject },
                { label: 'Department', value: paper.department },
                { label: 'Created by', value: paper.creator_name },
                { label: 'SHA-256 Digest', value: paper.content_hash?.slice(0, 18) + '…' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/70">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{label}</div>
                  <div className="font-bold text-slate-800 truncate">{value || '—'}</div>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Rejection Reason <span className="text-rose-500">*</span>
                <span className="text-slate-400 font-normal ml-1">(Required if rejecting)</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                rows={2}
                className="input-field bg-white"
                placeholder="Specify reasons for rejection (e.g. syllabus mismatch, duplicate questions)..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Moderator Notes / Feedback <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                rows={2}
                className="input-field bg-slate-50"
                placeholder="Add private moderator remarks..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => submit('REJECTED')}
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-500 shadow-md shadow-rose-500/20 active:scale-95 transition-all"
              >
                {loading && activeDecision === 'REJECTED'
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <X className="w-4 h-4" />}
                Reject Paper
              </button>
              <button
                onClick={() => submit('APPROVED')}
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-500 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
              >
                {loading && activeDecision === 'APPROVED'
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <Check className="w-4 h-4" />}
                Approve Paper
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Multi-Set Parity Inspection Modal ───────────────────── */
const SetComparisonModal = ({ paperId, paperTitle, onClose }) => {
  const [paperData, setPaperData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSet, setActiveSet] = useState('A');

  useEffect(() => {
    if (paperId) {
      api.get(`/papers/${paperId}`)
        .then(r => { setPaperData(r.data); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [paperId]);

  // Parse raw encrypted or decrypted content into sets
  const sets = {};
  if (paperData?.decrypted_content) {
    const setPattern = /={5,}\s*SET\s+([A-D])\s*={5,}([\s\S]*?)(?=={5,}\s*SET\s+[A-D]|$)/gi;
    let match;
    while ((match = setPattern.exec(paperData.decrypted_content)) !== null) {
      sets[match[1].toUpperCase()] = match[2].trim();
    }
  }

  const setKeys = Object.keys(sets).length > 0 ? Object.keys(sets) : ['A', 'B', 'C', 'D'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="w-full max-w-4xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="rounded-3xl overflow-hidden glass-card" style={{ background: '#ffffff', border: '1.5px solid #bfdbfe' }}>
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" />
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-600 text-white">
                <Columns className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">Multi-Set Parity Verification</h3>
                <p className="text-xs text-slate-500">{paperTitle} • Sets A, B, C, D Shuffled View</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Set Tabs */}
            <div className="flex gap-2 p-1.5 rounded-2xl bg-blue-50/70 border border-blue-100">
              {setKeys.map(k => (
                <button
                  key={k}
                  onClick={() => setActiveSet(k)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeSet === k
                      ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Set {k} {sets[k] ? '✓' : ''}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading multi-set data...</div>
            ) : sets[activeSet] ? (
              <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs max-h-96 overflow-y-auto leading-relaxed border border-slate-800">
                <div className="text-[11px] font-bold text-cyan-400 mb-2 border-b border-slate-800 pb-1">
                  === SET {activeSet} COMPILED STREAM ===
                </div>
                <pre className="whitespace-pre-wrap">{sets[activeSet]}</pre>
              </div>
            ) : (
              <div className="p-10 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                <Lock className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                Paper sets are encrypted. Moderator view access will be decrypted at approval time.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Question Pool Tab ───────────────────────────────────── */
const EXAM_PALETTES = [
  { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  { bg: '#ede9fe', color: '#6d28d9', border: '#ddd6fe' },
  { bg: '#cffafe', color: '#0e7490', border: '#a5f3fc' },
  { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  { bg: '#fce7f3', color: '#9d174d', border: '#fbcfe8' },
];

const QuestionPoolTab = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState({});
  const [search, setSearch] = useState('');

  useEffect(() => { fetchQuestions(); }, []);

  const fetchQuestions = () => {
    setLoading(true);
    api.get('/questions')
      .then(r => {
        setQuestions(r.data);
        const firstExam = r.data[0]?.exam_name;
        if (firstExam) setOpenGroups({ [firstExam]: true });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Group by exam name with search filter
  const filtered = questions.filter(q =>
    q.exam_name.toLowerCase().includes(search.toLowerCase()) ||
    q.subject.toLowerCase().includes(search.toLowerCase()) ||
    (q.creator_name && q.creator_name.toLowerCase().includes(search.toLowerCase()))
  );

  const grouped = {};
  filtered.forEach(q => {
    if (!grouped[q.exam_name]) grouped[q.exam_name] = [];
    grouped[q.exam_name].push(q);
  });
  const groupEntries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  const toggleGroup = (name) => setOpenGroups(g => ({ ...g, [name]: !g[name] }));

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => <div key={i} className="rounded-2xl h-16 shimmer bg-slate-100" />)}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3.5">
        {[
          { label: 'Total Questions in Pool', value: questions.length, color: '#1d4ed8', bg: '#dbeafe' },
          { label: 'Active Exam Categories', value: Object.keys(grouped).length, color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Contributing Paper Setters', value: [...new Set(questions.map(q => q.creator_name))].length, color: '#0e7490', bg: '#cffafe' },
        ].map((s, i) => (
          <div key={i} className="glass-card rounded-2xl p-4 flex items-center gap-3.5">
            <div className="text-2xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] font-semibold text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search Input */}
      <div className="glass-card rounded-2xl p-3 flex items-center gap-2.5">
        <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
        <input
          type="text"
          placeholder="Filter questions by exam title, subject, or setter username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full text-xs bg-transparent border-none outline-none font-medium text-slate-700 placeholder:text-slate-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Grouped by exam */}
      {groupEntries.length === 0 ? (
        <div className="rounded-3xl p-14 text-center glass-card border-dashed border-2 border-blue-200">
          <BookOpen className="w-10 h-10 text-blue-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 mb-1">No Questions Found</h3>
          <p className="text-xs text-slate-400">Questions submitted by Paper Setters will appear here.</p>
        </div>
      ) : groupEntries.map(([examName, qs], gi) => {
        const palette = EXAM_PALETTES[gi % EXAM_PALETTES.length];
        const isOpen = !!openGroups[examName];
        const setterNames = [...new Set(qs.map(q => q.creator_name))];

        return (
          <div key={examName} className="rounded-2xl overflow-hidden glass-card"
            style={{ border: `1.5px solid ${palette.border}`, background: '#ffffff' }}>
            <button onClick={() => toggleGroup(examName)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors"
              style={{ background: isOpen ? palette.bg : '#f8fafc' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                style={{ background: palette.bg, border: `1px solid ${palette.border}` }}>
                <BookOpen className="w-5 h-5" style={{ color: palette.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-black text-slate-800 text-sm">{examName}</span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                    style={{ background: palette.bg, color: palette.color, border: `1px solid ${palette.border}` }}>
                    {qs.length} Question{qs.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Setters: {setterNames.join(', ')}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>

            {isOpen && (
              <div className="divide-y divide-slate-100">
                {qs.map((q, qi) => (
                  <div key={q.id} className="px-5 py-4 flex items-start gap-4 hover:bg-blue-50/30 transition-colors">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs shadow-sm"
                      style={{ background: palette.bg, color: palette.color, border: `1px solid ${palette.border}` }}>
                      Q{qi + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {q.paper_code && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                            🏷️ {q.paper_code}
                          </span>
                        )}
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                          {q.marks} Marks
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600">📚 {q.subject}</span>
                        <span className="text-[11px] font-medium text-slate-500">🏛️ {q.department}</span>
                        <span className="text-[11px] font-medium text-blue-600">👤 {q.creator_name}</span>
                        <StatusChip status={q.status} />
                      </div>
                      {q.decrypted_content ? (
                        <p className="text-sm text-slate-800 font-medium leading-relaxed bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          {q.decrypted_content}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                          <Lock className="w-3.5 h-3.5" />
                          <span className="font-mono text-[11px]">Encrypted Payload — Decryption granted to Moderator role</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ── Papers Review Tab ───────────────────────────────────── */
const PapersReviewTab = ({ onInspectPaper }) => {
  const toast = useToast();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingPaper, setReviewingPaper] = useState(null);
  const [comparingPaper, setComparingPaper] = useState(null);
  const [reshuffling, setReshuffling] = useState(null);

  useEffect(() => { fetchPapers(); }, []);

  const fetchPapers = () => {
    setLoading(true);
    api.get('/papers')
      .then(r => {
        setPapers(r.data.filter(p => ['SUBMITTED', 'UNDER_REVIEW'].includes(p.current_status)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleDecision = (decision) => {
    setReviewingPaper(null);
    fetchPapers();
  };

  const handleReshuffle = async (paper) => {
    setReshuffling(paper.id);
    try {
      await api.post(`/papers/${paper.id}/reshuffle`);
      toast.success(`Questions reshuffled for "${paper.title}" across Sets A, B, C, D.`, 'Reshuffle Complete');
      fetchPapers();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Reshuffle failed.', 'Reshuffle Error');
    } finally {
      setReshuffling(null);
    }
  };

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => <div key={i} className="rounded-2xl h-28 shimmer bg-slate-100" />)}
    </div>
  );

  if (papers.length === 0) return (
    <div className="rounded-3xl p-12 text-center glass-card border-dashed border-2 border-blue-200">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-blue-50 text-blue-500">
        <FileText className="w-7 h-7" />
      </div>
      <h3 className="text-base font-black text-slate-700 mb-2">No Papers Pending Review</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 leading-relaxed">
        When questions in the pool are compiled into finalized 4-set papers, they will appear here for parity verification and approval.
      </p>
      <div className="inline-flex items-start gap-3 p-4 rounded-2xl text-left bg-amber-50/80 border border-amber-200 text-amber-800 text-xs max-w-lg">
        <span className="text-base">💡</span>
        <div>
          <span className="font-bold block mb-0.5">Quick Workflow:</span>
          Admin logs in → goes to Security Dashboard → generates exam paper sets from the question pool → paper arrives here for review.
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {papers.map((paper, i) => (
        <div key={paper.id} className="rounded-2xl overflow-hidden glass-card"
          style={{
            background: '#ffffff',
            border: '1.5px solid #bfdbfe',
            animation: 'fadeInUp 0.4s ease-out both',
            animationDelay: `${i*60}ms`
          }}>
          <div className="h-1 w-full"
            style={{ background: paper.current_status === 'UNDER_REVIEW' ? 'linear-gradient(90deg,#d97706,#f59e0b)' : 'linear-gradient(90deg,#2563eb,#38bdf8)' }} />
          <div className="p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-sm font-black text-slate-800 truncate">{paper.title}</h3>
                  <StatusChip status={paper.current_status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap font-medium">
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{paper.paper_code}</span>
                  <span>📚 {paper.subject}</span>
                  <span>🏛️ {paper.department}</span>
                  <span>👤 Setter: {paper.creator_name}</span>
                </div>
                <div className="mt-2 text-[10px] font-mono text-slate-400 truncate flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-slate-400 shrink-0" />
                  SHA-256 Digest: {paper.content_hash}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  onClick={() => onInspectPaper?.(paper.id)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" /> Inspect
                </button>

                <button
                  onClick={() => setComparingPaper(paper)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all active:scale-95"
                >
                  <Columns className="w-3.5 h-3.5" /> Sets Preview
                </button>

                <button
                  onClick={() => handleReshuffle(paper)}
                  disabled={reshuffling === paper.id}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 transition-all active:scale-95"
                >
                  {reshuffling === paper.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Shuffle className="w-3.5 h-3.5" />}
                  Reshuffle Sets
                </button>

                <button
                  onClick={() => setReviewingPaper(paper)}
                  className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm"
                >
                  <Star className="w-3.5 h-3.5" /> Review Paper
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {reviewingPaper && (
        <ReviewModal
          paper={reviewingPaper}
          onClose={() => setReviewingPaper(null)}
          onDecision={handleDecision}
        />
      )}

      {comparingPaper && (
        <SetComparisonModal
          paperId={comparingPaper.id}
          paperTitle={comparingPaper.title}
          onClose={() => setComparingPaper(null)}
        />
      )}
    </div>
  );
};

/* ── Main Dashboard Component ────────────────────────────── */
export const ModeratorDashboard = ({ onInspectPaper }) => {
  const [activeTab, setActiveTab] = useState('questions');

  const TABS = [
    { id: 'questions', label: 'Question Pool Aggregator', icon: BookOpen },
    { id: 'papers',    label: 'Final Papers Review Queue', icon: Layers },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Moderation & Parity Studio
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit question pool diversity, verify difficulty parity across Sets A, B, C, D, and authorize releases
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 p-1.5 rounded-2xl glass-card">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-blue-700 shadow-sm border border-blue-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'questions'
        ? <QuestionPoolTab />
        : <PapersReviewTab onInspectPaper={onInspectPaper} />
      }
    </div>
  );
};
