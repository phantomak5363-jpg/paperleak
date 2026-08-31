import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, AlertTriangle, CheckCircle2, RefreshCw, Filter,
  User, Clock, Info, ArrowRight, X, ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const SEV_CONFIG = {
  CRITICAL: { color: '#dc2626', bg: '#fee2e2', border: '#fecaca', shadow: 'rgba(220,38,38,0.12)' },
  HIGH:     { color: '#c2410c', bg: '#ffedd5', border: '#fed7aa', shadow: 'rgba(194,65,12,0.12)' },
  MEDIUM:   { color: '#d97706', bg: '#fef3c7', border: '#fde68a', shadow: 'rgba(217,119,6,0.12)' },
  LOW:      { color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', shadow: 'rgba(22,163,74,0.12)' },
};

const STATUS_CONFIG = {
  OPEN:          { color: '#dc2626', bg: '#fee2e2', label: 'Needs Review' },
  INVESTIGATING: { color: '#d97706', bg: '#fef3c7', label: 'Under Investigation' },
  RESOLVED:      { color: '#16a34a', bg: '#dcfce7', label: 'Resolved' },
};

const getRecommendedAction = (severity) => {
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    return 'Verify user session authenticity immediately. Consider deactivating or resetting credentials if anomaly is confirmed.';
  } else if (severity === 'MEDIUM') {
    return 'Inspect recent access timestamps and verify IP address geographical consistency.';
  } else {
    return 'Log record only. Automated system is maintaining security baseline telemetry.';
  }
};

export const SecurityAlertsPage = () => {
  const toast = useToast();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSev, setFilterSev] = useState('ALL');

  useEffect(() => { fetchAlerts(); }, []);

  const fetchAlerts = () => {
    setLoading(true);
    api.get('/security-alerts')
      .then(r => { setAlerts(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const updateStatus = (id, status) => {
    api.put(`/security-alerts/${id}/status`, { status })
      .then(() => {
        toast.success(`Alert marked as ${status.replace('_', ' ').toLowerCase()}.`, 'Status Updated');
        fetchAlerts();
      })
      .catch(() => toast.error('Failed to update alert status.', 'Error'));
  };

  const sevCounts = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].reduce((acc, s) => {
    acc[s] = alerts.filter(a => a.severity === s).length;
    return acc;
  }, {});

  const filtered = filterSev === 'ALL' ? alerts : alerts.filter(a => a.severity === filterSev);

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const iso = !(ts.endsWith('Z') || ts.includes('+')) ? `${ts}Z` : ts;
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            Security Anomaly Detection Stream
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Surveillance radar flagging anomalous exam paper access, early decrypt attempts, and rate spikes
          </p>
        </div>
        <button onClick={fetchAlerts} className="btn-ghost flex items-center gap-2 text-xs py-2 px-4 shadow-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
        </button>
      </div>

      {/* Severity Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {Object.entries(SEV_CONFIG).map(([sev, cfg]) => (
          <button
            key={sev}
            onClick={() => setFilterSev(filterSev === sev ? 'ALL' : sev)}
            className="glass-card p-4 rounded-2xl text-left transition-all duration-200 cursor-pointer"
            style={{
              background: filterSev === sev || filterSev === 'ALL' ? cfg.bg : 'rgba(255,255,255,0.7)',
              border: `1.5px solid ${filterSev === sev ? cfg.border : 'rgba(191,219,254,0.5)'}`,
              boxShadow: filterSev === sev ? `0 6px 20px ${cfg.shadow}` : 'none',
              transform: filterSev === sev ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            <div className="text-2xl font-black tabular-nums" style={{ color: cfg.color }}>{sevCounts[sev] || 0}</div>
            <div className="text-xs font-bold mt-1 uppercase tracking-wider" style={{ color: cfg.color }}>{sev} Threat</div>
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass-card rounded-3xl h-36 shimmer bg-slate-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-3xl p-16 text-center">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-black text-slate-800">All Clear — Zero Active Threat Alerts</h3>
          <p className="text-xs text-slate-500 mt-1">Zero anomaly spikes detected in recent examination access windows.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((alert, i) => {
            const cfg = SEV_CONFIG[alert.severity] || SEV_CONFIG.LOW;
            const stCfg = STATUS_CONFIG[alert.status] || STATUS_CONFIG.OPEN;
            return (
              <div key={alert.id}
                className="rounded-3xl overflow-hidden glass-card"
                style={{
                  background: 'rgba(255,255,255,0.98)',
                  border: `1.5px solid ${cfg.border}`,
                  boxShadow: `0 8px 30px ${cfg.shadow}`,
                  animation: `fadeInUp 0.4s ease-out ${i * 60}ms both`,
                }}>
                {/* Alert Header */}
                <div className="flex items-start justify-between px-6 py-4" style={{ borderBottom: `1px solid ${cfg.border}`, background: cfg.bg }}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-black" style={{ color: cfg.color }}>{alert.alert_code}</span>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider bg-white shadow-xs"
                      style={{ color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      {alert.severity} Risk
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider"
                      style={{ color: stCfg.color, background: stCfg.bg, border: `1px solid ${stCfg.color}40` }}>
                      {stCfg.label}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-semibold text-slate-600 shrink-0 bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200">
                    {formatTimestamp(alert.created_at)}
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: cfg.color }} />
                        {alert.title}
                      </h3>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        Target Subject / User: <span className="text-slate-800 font-bold">{alert.triggered_by_username || 'Unknown / Unauthenticated'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2-Column: Flagged Indicators + Suggested Response */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-700 flex items-center gap-2 mb-2">
                        <ShieldAlert className="w-4 h-4 text-slate-400" />
                        Anomaly Signatures Flagged:
                      </div>
                      <ul className="space-y-1.5">
                        {alert.trigger_reasons?.map((r, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: cfg.color }} />
                            <span className="text-slate-700 leading-relaxed font-medium">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl border space-y-2" style={{ background: `${cfg.bg}50`, borderColor: cfg.border }}>
                      <div className="font-bold flex items-center gap-2 mb-1.5" style={{ color: cfg.color }}>
                        <ArrowRight className="w-4 h-4" />
                        Recommended Security Action:
                      </div>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {getRecommendedAction(alert.severity)}
                      </p>
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                    {alert.status !== 'INVESTIGATING' && (
                      <button
                        onClick={() => updateStatus(alert.id, 'INVESTIGATING')}
                        className="text-xs px-4 py-2 rounded-xl font-bold transition-all bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 active:scale-95"
                      >
                        Mark "Under Investigation"
                      </button>
                    )}
                    {alert.status !== 'RESOLVED' && (
                      <button
                        onClick={() => updateStatus(alert.id, 'RESOLVED')}
                        className="text-xs px-4 py-2 rounded-xl font-bold transition-all bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 active:scale-95"
                      >
                        Mark "Resolved"
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
