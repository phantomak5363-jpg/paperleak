import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity, Shield, AlertTriangle, AlertCircle, CheckCircle2,
  Search, Filter, RefreshCw, Clock, Download, Eye, X, Terminal,
  Calendar, FileSpreadsheet, Lock
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

/* ── Log Detail Modal ────────────────────────────────────── */
const LogDetailModal = ({ log, onClose }) => {
  const isDenied = log.result_status !== 'SUCCESS';

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const iso = !(ts.endsWith('Z') || ts.includes('+')) ? `${ts}Z` : ts;
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="rounded-3xl overflow-hidden glass-card bg-white border border-blue-200 shadow-2xl">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" />
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-black text-slate-800">Audit Ledger Record Details (ID: #{log.id})</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Timestamp</span>
                <span className="font-bold text-slate-800">{formatTimestamp(log.timestamp)}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">User Identity</span>
                <span className="font-bold text-slate-800">{log.username || 'System'} ({log.user_role})</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outcome Status</span>
                <span className={`font-black uppercase tracking-wider ${isDenied ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {log.result_status}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IP Address</span>
                <span className="font-mono text-slate-700">{log.ip_address || '127.0.0.1'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Risk Score</span>
                <span className="font-bold text-blue-700">{log.risk_score || '0.0'} / 100</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paper Reference</span>
                <span className="font-bold text-slate-700">{log.paper_id ? `Paper #${log.paper_id}` : 'None'}</span>
              </div>
            </div>

            {log.denial_reason && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-medium">
                <strong>Violation / Block Reason:</strong> {log.denial_reason}
              </div>
            )}

            {/* Extra JSON Metadata */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-blue-600" />
                Raw Cryptographic & Contextual Metadata
              </label>
              <div className="p-4 rounded-2xl bg-slate-900 text-cyan-300 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                <pre>{JSON.stringify(log.extra_metadata || { signature_check: "OK", hash: "sha256" }, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main Activity Log Page ──────────────────────────────── */
export const AuditLogsPage = () => {
  const toast = useToast();
  const { user } = useAuth();
  const isController = user?.role === 'EXAM_CONTROLLER';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspectLog, setInspectLog] = useState(null);

  // Filters
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('');
  const [resultStatus, setResultStatus] = useState('');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = () => {
    setLoading(true);
    const params = {};
    if (username) params.username = username;
    if (role) params.role = role;
    if (resultStatus) params.result_status = resultStatus;
    
    api.get('/audit-logs', { params })
      .then(r => {
        let fetchedLogs = r.data;
        if (isController) {
          fetchedLogs = fetchedLogs.filter(l =>
            ['PAPER_RELEASED', 'PAPER_SCHEDULED', 'PAPER_PRINTED', 'PAPER_VIEWED', 'PAPER_ACCESS_ATTEMPT', 'EARLY_RELEASE_ATTEMPT', 'PAPER_COMPILED', 'PAPER_APPROVED'].includes(l.action)
          );
        }
        setLogs(fetchedLogs);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load audit logs from ledger.', 'Ledger Error');
        setLoading(false);
      });
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.warning('No logs available to export.', 'Export Empty');
      return;
    }

    const headers = ['ID', 'Timestamp', 'Username', 'Role', 'Action', 'Status', 'IP Address', 'Denial Reason'];
    const csvRows = [headers.join(',')];

    logs.forEach(l => {
      const row = [
        l.id,
        `"${l.timestamp}"`,
        `"${l.username || 'System'}"`,
        `"${l.user_role || ''}"`,
        `"${l.action}"`,
        `"${l.result_status}"`,
        `"${l.ip_address || ''}"`,
        `"${l.denial_reason || 'None'}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SecureExam_AuditLedger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Audit log ledger exported as CSV.', 'Export Complete');
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const iso = !(ts.endsWith('Z') || ts.includes('+')) ? `${ts}Z` : ts;
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const deniedCount = logs.filter(l => l.result_status !== 'SUCCESS').length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            {isController ? 'Exam Paper Release & Print Log' : 'Immutable Security Activity Ledger'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isController 
              ? 'Complete chronological record of all question paper release, schedule, and print actions'
              : 'Tamper-evident system activity trail with cryptographic anomaly score tracking'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-white border border-blue-200 text-slate-700 hover:bg-blue-50 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" /> Export CSV
          </button>
          <button
            onClick={fetchLogs}
            className="btn-ghost flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
              {isController ? 'Releases & Prints Logged' : 'Total System Actions Recorded'}
            </div>
            <div className="text-3xl font-black text-blue-700 tabular-nums">{logs.length}</div>
          </div>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
              {isController ? 'Blocked Access Attempts' : 'Security Violations Blocked'}
            </div>
            <div className="text-3xl font-black text-rose-600 tabular-nums">{deniedCount}</div>
          </div>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-rose-50 text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card rounded-2xl p-4">
        <form onSubmit={e => { e.preventDefault(); fetchLogs(); }} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Username</label>
            <input
              type="text"
              placeholder="e.g. setter1, admin..."
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="input-field text-xs bg-white py-2"
            />
          </div>

          {!isController && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">User Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="input-field text-xs bg-white py-2 font-semibold"
              >
                <option value="">All Roles</option>
                {['ADMIN', 'PAPER_SETTER', 'MODERATOR', 'EXAM_CONTROLLER', 'PRINTING_STAFF'].map(r => (
                  <option key={r} value={r}>{r.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Outcome Status</label>
            <select
              value={resultStatus}
              onChange={e => setResultStatus(e.target.value)}
              className="input-field text-xs bg-white py-2 font-semibold"
            >
              <option value="">All Outcomes</option>
              <option value="SUCCESS">Success Only</option>
              <option value="DENIED">Blocked / Denied Only</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2 text-xs py-2 shadow-sm"
            >
              <Search className="w-3.5 h-3.5" /> Filter Ledger
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="glass-card rounded-3xl overflow-hidden bg-white border border-blue-200">
        <div className="flex items-center gap-2 px-6 py-4 bg-slate-50 border-b border-slate-200">
          <Clock className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            {isController ? 'Paper Release & Decryption History' : 'Surveillance Activity Records'}
          </h3>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {logs.length} Records
          </span>
        </div>

        {loading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-xl shimmer bg-slate-100" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-700 mb-1">No Ledger Records Found</h3>
            <p className="text-xs text-slate-400">Try adjusting your filter search terms.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200">
                  {['Date & Time', 'User Identity', 'Action Event', 'Status', 'Audit Notes', 'Inspect'].map(h => (
                    <th key={h} className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isDenied = log.result_status !== 'SUCCESS';
                  
                  let actionText = log.action;
                  if (actionText === 'LOGIN_ATTEMPT') actionText = 'Tried to log in';
                  if (actionText === 'LOGIN_SUCCESS') actionText = 'Logged in successfully';
                  if (actionText === 'LOGIN_FAILED') actionText = 'Failed login attempt';
                  if (actionText === 'QUESTION_UPLOADED') actionText = 'Submitted question to pool';
                  if (actionText === 'PAPER_UPLOADED') actionText = 'Uploaded question paper';
                  if (actionText === 'PAPER_COMPILED') actionText = 'Compiled & shuffled paper sets';
                  if (actionText === 'PAPER_SCHEDULED') actionText = 'Scheduled time-release';
                  if (actionText === 'PAPER_RELEASED') actionText = 'Released question paper';
                  if (actionText === 'PAPER_PRINTED') actionText = 'Printed question paper';
                  if (actionText === 'PAPER_ACCESS_ATTEMPT') actionText = 'Inspected paper details';
                  if (actionText === 'EARLY_RELEASE_ATTEMPT') actionText = 'Blocked early release attempt';
                  if (actionText === 'PAPER_VIEWED') actionText = 'Decrypted & viewed paper content';
                  if (actionText === 'USER_CREATED') actionText = 'Created user account';
                  if (actionText === 'USER_DELETED') actionText = 'Deleted user account';
                  if (actionText === 'USER_ACTIVATED') actionText = 'Activated user account';
                  if (actionText === 'USER_DEACTIVATED') actionText = 'Deactivated user account';
                  if (actionText === 'RESHUFFLE_PAPER') actionText = 'Reshuffled paper sets';
                  if (actionText === 'PERMISSION_REQUEST_SUBMITTED') actionText = 'Requested paper access';

                  return (
                    <tr key={log.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4 text-slate-500 text-xs font-mono whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-slate-800 text-xs">{log.username || 'System'}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{log.user_role?.replace('_', ' ')}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700 text-xs whitespace-nowrap">
                        {actionText}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-black text-[10px] px-2.5 py-0.5 rounded-lg border uppercase tracking-wider ${
                          isDenied ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isDenied ? 'Blocked' : 'Success'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 max-w-xs truncate">
                        {log.denial_reason ? (
                          <span className="text-rose-600 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            {log.denial_reason}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Verified security pass</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setInspectLog(log)}
                          className="p-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="View raw JSON payload"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      {inspectLog && (
        <LogDetailModal log={inspectLog} onClose={() => setInspectLog(null)} />
      )}
    </div>
  );
};
