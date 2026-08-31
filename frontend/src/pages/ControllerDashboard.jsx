import React, { useState, useEffect } from 'react';
import {
  Calendar, Lock, Unlock, CheckCircle2, AlertCircle,
  X, Timer, FileText, RefreshCw, Eye, Shield, Clock,
  KeyRound, Sparkles, CheckCheck
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

/* ── Status chip ─────────────────────────────────────────── */
const STATUS_META = {
  APPROVED:  { color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', label: 'Approved' },
  SCHEDULED: { color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe', label: 'Scheduled & Locked' },
  RELEASED:  { color: '#0e7490', bg: '#cffafe', border: '#a5f3fc', label: 'Released to Print' },
  PRINTED:   { color: '#0f766e', bg: '#ccfbf1', border: '#99f6e4', label: 'Printed & Archived' },
  SUBMITTED: { color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe', label: 'Submitted' },
  DRAFT:     { color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', label: 'Draft' },
};

const StatusChip = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.DRAFT;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
      {m.label}
    </span>
  );
};

/* ── Live countdown with accurate UTC parse ──────────────── */
const Countdown = ({ targetTime }) => {
  const [diff, setDiff] = useState(null);

  useEffect(() => {
    const calc = () => {
      if (!targetTime) return;
      const iso = !(targetTime.endsWith('Z') || targetTime.includes('+')) ? `${targetTime}Z` : targetTime;
      setDiff(new Date(iso).getTime() - Date.now());
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [targetTime]);

  if (diff === null) return null;
  if (diff <= 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
      ⚡ Released / Unlocked
    </span>
  );

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
      <Timer className="w-3.5 h-3.5 text-purple-600 animate-spin" style={{ animationDuration: '6s' }} />
      <span>{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>
    </div>
  );
};

/* ── Main Controller Dashboard ───────────────────────────── */
export const ControllerDashboard = ({ onInspectPaper, initialFilter }) => {
  const toast = useToast();
  const [papers, setPapers] = useState([]);
  const [filter, setFilter] = useState(initialFilter || 'ALL');
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [loading, setLoading] = useState(false);

  const [examDate, setExamDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [releaseTimeStr, setReleaseTimeStr] = useState('');
  const [accessWindow, setAccessWindow] = useState(180);

  useEffect(() => {
    fetchPapers();
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    setReleaseTimeStr(now.toISOString().slice(0, 16));
  }, []);

  useEffect(() => { if (initialFilter) setFilter(initialFilter); }, [initialFilter]);

  const fetchPapers = () => {
    setLoading(true);
    api.get('/papers')
      .then(r => {
        setPapers(r.data.filter(p => ['APPROVED','SCHEDULED','RELEASED','PRINTED'].includes(p.current_status)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dt = new Date(releaseTimeStr);
      await api.post('/schedules', {
        paper_id: selectedPaper.id,
        exam_date: examDate,
        scheduled_release_time: dt.toISOString(),
        access_window_minutes: parseInt(accessWindow, 10)
      });
      toast.success(`"${selectedPaper.title}" scheduled for ${dt.toLocaleString()}.`, 'Schedule Locked');
      setSelectedPaper(null);
      fetchPapers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Scheduling failed.', 'Schedule Error');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseNow = async (paperId) => {
    try {
      await api.post(`/schedules/${paperId}/release`);
      toast.success('Paper officially RELEASED to printing staff portal.', 'Paper Unlocked');
      fetchPapers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Release blocked.', 'Access Blocked');
    }
  };

  const filteredPapers = filter === 'ALL' ? papers : papers.filter(p => p.current_status === filter);
  const approved  = papers.filter(p => p.current_status === 'APPROVED');
  const scheduled = papers.filter(p => p.current_status === 'SCHEDULED');
  const released  = papers.filter(p => ['RELEASED','PRINTED'].includes(p.current_status));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Exam Controller Command Center
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage cryptographic time-locks, configure access windows, and monitor exam release schedules
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Awaiting Schedule', value: approved.length, color: '#16a34a', bg: '#dcfce7', icon: '📋' },
          { label: 'Time-Locked & Active', value: scheduled.length, color: '#7c3aed', bg: '#ede9fe', icon: '🔒' },
          { label: 'Released / In Print', value: released.length, color: '#0e7490', bg: '#cffafe', icon: '🔓' },
        ].map((s, i) => (
          <div key={i} className="glass-card rounded-2xl p-5 flex items-center gap-4">
            <div className="text-3xl p-2 rounded-2xl bg-white shadow-sm border border-slate-100">{s.icon}</div>
            <div>
              <div className="text-2xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs font-semibold text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Time-Lock Configuration Form Modal */}
      {selectedPaper && (
        <div className="rounded-3xl overflow-hidden glass-card animate-fadeInUp"
          style={{ background: '#ffffff', border: '1.5px solid #ddd6fe', boxShadow: '0 20px 50px rgba(124,58,237,0.12)' }}>
          <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-600" />
          <div className="flex items-center justify-between px-7 py-5 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
            <div>
              <h3 className="text-base font-black text-slate-800">
                Configure Cryptographic Time-Lock — <span className="text-purple-700">{selectedPaper.paper_code}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{selectedPaper.title} • {selectedPaper.subject}</p>
            </div>
            <button onClick={() => setSelectedPaper(null)}
              className="p-2 rounded-xl text-slate-400 hover:bg-white hover:text-slate-700 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleScheduleSubmit} className="p-7 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Exam Date</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                  required
                  className="input-field bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Release Timestamp (Unlock Time)</label>
                <input
                  type="datetime-local"
                  value={releaseTimeStr}
                  onChange={e => setReleaseTimeStr(e.target.value)}
                  required
                  className="input-field bg-white font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Access Window (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={accessWindow}
                  onChange={e => setAccessWindow(e.target.value)}
                  required
                  className="input-field bg-white font-semibold"
                />
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-purple-50/80 border border-purple-200 text-xs text-purple-900 leading-relaxed">
              <Lock className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-purple-950 mb-0.5">Automated Cryptographic Enforcer</strong>
                The decryption keys for Sets A, B, C, and D are mathematically locked until the specified release moment. Printing staff attempting earlier access will be automatically blocked and logged in the Security Ledger.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPaper(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2 py-2.5 px-6"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}
              >
                {loading
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <Calendar className="w-4 h-4" />}
                Confirm & Lock Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exam Papers Table */}
      <div className="rounded-3xl overflow-hidden glass-card" style={{ background: '#ffffff', border: '1.5px solid #bfdbfe' }}>
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-b border-blue-100 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Exam Schedules & Status Ledger</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {filteredPapers.length} Papers
            </span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="text-xs rounded-xl px-3 py-2 bg-white border border-blue-200 outline-none font-semibold text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved (Ready)</option>
              <option value="SCHEDULED">Scheduled (Locked)</option>
              <option value="RELEASED">Released</option>
              <option value="PRINTED">Printed</option>
            </select>

            <button
              onClick={fetchPapers}
              className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              title="Refresh list"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading schedules...</div>
        ) : filteredPapers.length === 0 ? (
          <div className="p-16 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">No examination papers match the current filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200">
                  {['Paper Code', 'Exam Title', 'Status', 'Time-Lock Countdown', 'Controls'].map(h => (
                    <th key={h} className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPapers.map(p => (
                  <tr key={p.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-blue-700">{p.paper_code}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 text-xs">{p.title}</div>
                      <div className="text-[11px] text-slate-500">{p.subject} • {p.department}</div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusChip status={p.current_status} />
                    </td>
                    <td className="px-6 py-4">
                      {p.current_status === 'SCHEDULED' && p.scheduled_release_time ? (
                        <Countdown targetTime={p.scheduled_release_time} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onInspectPaper?.(p.id)}
                          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>

                        {p.current_status === 'APPROVED' && (
                          <button
                            onClick={() => setSelectedPaper(p)}
                            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all active:scale-95"
                          >
                            <Calendar className="w-3 h-3" /> Schedule
                          </button>
                        )}

                        {p.current_status === 'SCHEDULED' && (
                          <button
                            onClick={() => handleReleaseNow(p.id)}
                            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200 transition-all active:scale-95"
                          >
                            <Unlock className="w-3 h-3" /> Release Now
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
