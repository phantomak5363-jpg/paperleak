import React, { useState, useEffect } from 'react';
import {
  Users, FileText, CheckCircle2, Clock, ShieldAlert, Activity,
  AlertOctagon, RefreshCw, Database, TrendingUp, ArrowUpRight,
  Shield, Layers, Plus, Sparkles, KeyRound, Cpu, CheckCheck, BookOpen
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const useCountUp = (target, duration = 1200) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!target) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress === 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
};

const KPICard = ({ title, value, icon: Icon, color, bgColor, delay }) => {
  const count = useCountUp(value, 1200);
  return (
    <div className="glass-card rounded-3xl p-5 relative overflow-hidden group cursor-default transition-all duration-300 hover:scale-[1.02]"
      style={{ animationDelay: `${delay}ms`, animation: 'fadeInUp 0.5s ease-out both' }}>
      <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`, filter: 'blur(8px)' }} />
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: bgColor }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="p-1 rounded-lg bg-slate-50 text-slate-400 group-hover:text-blue-600 transition-colors">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>
      <div className="text-3xl font-black mb-1 tabular-nums tracking-tight" style={{ color }}>{count}</div>
      <div className="text-xs font-bold text-slate-500">{title}</div>
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full opacity-75"
        style={{ background: `linear-gradient(to right, ${color}80, transparent)` }} />
    </div>
  );
};

const PIPELINE_STAGES = [
  { key: 'submitted_papers',  label: 'Submitted',  color: '#2563eb', icon: '📄', tabId: 'papers', filter: 'SUBMITTED' },
  { key: 'under_review_papers',label: 'Under Review',color: '#d97706', icon: '🔍', tabId: 'reviews', filter: 'UNDER_REVIEW' },
  { key: 'rejected_papers',   label: 'Rejected',   color: '#dc2626', icon: '❌', tabId: 'papers', filter: 'REJECTED' },
  { key: 'approved_papers',   label: 'Approved',   color: '#16a34a', icon: '✅', tabId: 'schedules', filter: 'APPROVED' },
  { key: 'scheduled_papers',  label: 'Scheduled',  color: '#7c3aed', icon: '📅', tabId: 'schedules', filter: 'SCHEDULED' },
  { key: 'released_papers',   label: 'Released',   color: '#0e7490', icon: '🔓', tabId: 'printing', filter: 'RELEASED' },
  { key: 'printed_papers',    label: 'Printed',    color: '#0f766e', icon: '🖨️', tabId: 'printing', filter: 'PRINTED' },
];

export const AdminDashboard = ({ onInspectPaper, onNavigate }) => {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Paper generation state
  const [genForm, setGenForm] = useState({ paperCode: '', title: '', subject: '', department: '' });
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = () => {
    setLoading(true);
    api.get('/admin/stats')
      .then(r => { setStats(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenLoading(true);
    try {
      const res = await api.post('/papers/generate', {
        paper_code: genForm.paperCode.trim(),
        title: genForm.title.trim(),
        subject: genForm.subject.trim(),
        department: genForm.department.trim()
      });
      toast.success(`Exam Paper "${res.data.paper_code}" compiled with Sets A, B, C, D and sent to Review Queue!`, 'Paper Compiled');
      setGenForm({ paperCode: '', title: '', subject: '', department: '' });
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate paper from question pool.', 'Compilation Error');
    } finally {
      setGenLoading(false);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const iso = !(ts.endsWith('Z') || ts.includes('+')) ? `${ts}Z` : ts;
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-3xl h-32 shimmer bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  const kpis = [
    { title: 'Registered Users',    value: stats.total_users,   icon: Users,      color: '#1d4ed8', bgColor: 'linear-gradient(135deg,#1e40af,#3b82f6)', delay: 50 },
    { title: 'Compiled Exam Papers',value: stats.total_papers,  icon: FileText,   color: '#7c3aed', bgColor: 'linear-gradient(135deg,#6d28d9,#8b5cf6)',  delay: 100 },
    { title: 'Approved & Scheduled',value: (stats.approved_papers||0)+(stats.scheduled_papers||0), icon: CheckCircle2, color: '#16a34a', bgColor: 'linear-gradient(135deg,#15803d,#22c55e)', delay: 150 },
    { title: 'Released to Printing',value: stats.released_papers, icon: Clock,    color: '#0e7490', bgColor: 'linear-gradient(135deg,#155e75,#06b6d4)', delay: 200 },
    { title: 'Audit Ledger Entries',value: stats.total_audit_events, icon: Activity, color: '#d97706', bgColor: 'linear-gradient(135deg,#b45309,#f59e0b)', delay: 250 },
    { title: 'Active Threat Alerts',value: stats.open_alerts_count,  icon: ShieldAlert, color: '#dc2626', bgColor: 'linear-gradient(135deg,#991b1b,#ef4444)', delay: 300 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Security Command Center
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Real-time security surveillance, threat detection radar, and cryptographic lifecycle monitoring
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="btn-ghost flex items-center gap-2 text-xs py-2 px-4 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
        </button>
      </div>

      {/* Critical Alert Banner */}
      {stats.critical_alerts_count > 0 && (
        <div className="flex items-center justify-between p-4 rounded-3xl bg-rose-50 border border-rose-200 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-rose-600 text-white shadow-md shadow-rose-500/20">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-rose-900">
                CRITICAL THREATS DETECTED ({stats.critical_alerts_count})
              </h4>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Unauthorized access patterns or early decryption attempts flagged by the anomaly detection engine.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate?.('alerts')}
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
          >
            Investigate
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => (
          <KPICard key={k.title} {...k} />
        ))}
      </div>

      {/* Paper Lifecycle Pipeline */}
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Examination Paper Lifecycle Pipeline
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Click any stage to filter queue</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {PIPELINE_STAGES.map((s) => {
            const count = stats[s.key] || 0;
            return (
              <button
                key={s.key}
                onClick={() => onNavigate?.(s.tabId, s.filter)}
                className="p-3 rounded-2xl bg-white border border-blue-100 hover:border-blue-300 transition-all hover:scale-105 text-left group shadow-sm"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-base">{s.icon}</span>
                  <span className="text-sm font-black tabular-nums" style={{ color: s.color }}>{count}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-700 truncate group-hover:text-blue-700 transition-colors">
                  {s.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2-Column: Rapid Compiler + Live Security Threat Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rapid Paper Generation Wizard */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-blue-100 pb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-600 text-white shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800">Compile Final Exam Paper Sets</h3>
              <p className="text-[11px] text-slate-500">
                Aggregates pool questions & generates Sets A, B, C, D with balanced difficulty
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Paper Code</label>
                <input
                  type="text"
                  placeholder="e.g. CS401-2026"
                  value={genForm.paperCode}
                  onChange={e => setGenForm(f => ({ ...f, paperCode: e.target.value }))}
                  required
                  className="input-field bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Exam Title</label>
                <input
                  type="text"
                  placeholder="e.g. Final Semester Cyber Defense"
                  value={genForm.title}
                  onChange={e => setGenForm(f => ({ ...f, title: e.target.value }))}
                  required
                  className="input-field bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Cryptography & Security"
                  value={genForm.subject}
                  onChange={e => setGenForm(f => ({ ...f, subject: e.target.value }))}
                  required
                  className="input-field bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={genForm.department}
                  onChange={e => setGenForm(f => ({ ...f, department: e.target.value }))}
                  required
                  className="input-field bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={genLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 shadow-md shadow-blue-500/20"
            >
              {genLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate & Shuffle 4-Set Examination Paper
            </button>
          </form>
        </div>

        {/* Live Threat Radar & Alerts Feed */}
        <div className="glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-blue-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-600 text-white shadow-sm">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">Surveillance & Security Stream</h3>
                <p className="text-[11px] text-slate-500">Live anomalous activity monitoring</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate?.('audit')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Full Ledger →
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {stats.recent_logs?.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No recent activity logged.</div>
            ) : stats.recent_logs?.map((log) => (
              <div key={log.id} className="p-3 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-blue-50/40 transition-colors shadow-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-800">{log.action?.replace('_', ' ')}</span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                      log.result_status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {log.result_status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    User: {log.username || 'System'} ({log.user_role}) • IP: {log.ip_address}
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0">
                  {formatTimestamp(log.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
