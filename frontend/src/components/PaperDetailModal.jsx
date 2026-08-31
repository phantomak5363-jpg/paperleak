import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Lock, Key, AlertOctagon, CheckCircle2, FileText,
  Hash, Shield, User, Calendar, Clock, ChevronRight,
  Copy, Eye, EyeOff, GitBranch, Sparkles
} from 'lucide-react';
import { PaperStatusBadge } from './StatusBadge';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const InfoCell = ({ label, value, mono, color, icon: Icon }) => (
  <div className="p-3.5 rounded-2xl flex flex-col gap-1 bg-blue-50/50 border border-blue-100">
    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-blue-500" />}
      {label}
    </div>
    <div className={`text-xs font-bold truncate ${mono ? 'font-mono' : ''}`}
      style={{ color: color || '#1e293b' }}>
      {value || '—'}
    </div>
  </div>
);

const StageNode = ({ label, active, done, color }) => (
  <div className="flex flex-col items-center gap-1.5 flex-1">
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 shadow-sm"
      style={{
        background: done ? `${color}20` : active ? `${color}15` : '#f1f5f9',
        border: `2px solid ${done || active ? color : '#cbd5e1'}`,
        color: done || active ? color : '#64748b',
        boxShadow: active ? `0 0 14px ${color}50` : 'none',
      }}>
      {done ? '✓' : ''}
    </div>
    <div className="text-[10px] text-center leading-tight font-bold"
      style={{ color: done || active ? '#334155' : '#94a3b8' }}>
      {label}
    </div>
  </div>
);

const STAGES = [
  { label: 'Submitted', status: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SCHEDULED', 'RELEASED', 'PRINTED'], color: '#3b82f6' },
  { label: 'Reviewed', status: ['APPROVED', 'REJECTED', 'SCHEDULED', 'RELEASED', 'PRINTED'], color: '#d97706' },
  { label: 'Approved', status: ['SCHEDULED', 'RELEASED', 'PRINTED'], color: '#16a34a' },
  { label: 'Scheduled', status: ['RELEASED', 'PRINTED'], color: '#7c3aed' },
  { label: 'Released', status: ['PRINTED', 'RELEASED'], color: '#0ea5e9' },
  { label: 'Printed', status: ['PRINTED'], color: '#0d9488' },
];

export const PaperDetailModal = ({ paperId, onClose }) => {
  const toast = useToast();
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showContent, setShowContent] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!paperId) return;
    setLoading(true);
    setError(null);
    setPaper(null);
    api.get(`/papers/${paperId}`)
      .then(r => { setPaper(r.data); setLoading(false); })
      .catch(e => { setError(e.response?.data?.detail || 'Failed to load paper.'); setLoading(false); });
  }, [paperId]);

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const hashVal = paper?.sha256_hash || paper?.content_hash;

  const copyHash = () => {
    if (hashVal) {
      navigator.clipboard.writeText(hashVal);
      setCopied(true);
      toast.success('SHA-256 Digest copied to clipboard.', 'Copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const iso = !(ts.endsWith('Z') || ts.includes('+')) ? `${ts}Z` : ts;
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  if (!paperId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="w-full max-w-2xl mx-4" style={{ animation: 'modalPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
        onClick={e => e.stopPropagation()}>

        {/* Modal container */}
        <div className="rounded-3xl overflow-hidden flex flex-col max-h-[90vh] glass-card bg-white border border-blue-200 shadow-2xl">

          {/* Top accent stripe */}
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-600 text-white shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800">
                  {loading ? 'Inspecting Paper...' : paper?.title || 'Paper Inspection'}
                </h2>
                {paper && (
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                    <span className="font-mono text-blue-700 font-bold">{paper.paper_code}</span>
                    <span>•</span>
                    <span>{paper.department}</span>
                    {paper.current_status && <PaperStatusBadge status={paper.current_status} />}
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-6 space-y-5 flex-1 bg-white">

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-10 h-10 rounded-full border-3 border-blue-200 border-t-blue-600 animate-spin" />
                <div className="text-xs text-slate-500 font-medium animate-pulse">Verifying cryptographic hash signature...</div>
              </div>
            ) : error ? (
              <div className="p-5 rounded-2xl flex items-start gap-4 bg-rose-50 border border-rose-200 text-rose-800">
                <AlertOctagon className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-black text-rose-900 mb-1">Access Blocked</div>
                  <div className="text-xs">{error}</div>
                </div>
              </div>
            ) : paper && (
              <>
                {/* Lifecycle progress */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-blue-600" />
                    Paper Lifecycle Timeline
                  </div>
                  <div className="flex items-start gap-0">
                    {STAGES.map((s, i) => {
                      const isDone = s.status.includes(paper.current_status);
                      const isActive = paper.current_status === s.status[s.status.length - 1];
                      return (
                        <React.Fragment key={i}>
                          <StageNode label={s.label} active={isActive} done={isDone} color={s.color} />
                          {i < STAGES.length - 1 && (
                            <div className="flex-1 h-0.5 mt-4 mx-1"
                              style={{ background: isDone ? '#93c5fd' : '#e2e8f0' }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <InfoCell label="Subject Area" value={paper.subject} />
                  <InfoCell label="Department" value={paper.department} />
                  <InfoCell label="Created By" value={paper.creator_name} icon={User} />
                  <InfoCell label="Paper Code" value={paper.paper_code} mono color="#1d4ed8" />
                  <InfoCell label="Created Date" value={formatTimestamp(paper.created_at)} icon={Calendar} />
                  <InfoCell label="Last Modified" value={formatTimestamp(paper.updated_at)} icon={Clock} />
                </div>

                {/* SHA hash with Copy */}
                {hashVal && (
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <Hash className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">SHA-256 Cryptographic Hash</div>
                        <div className="font-mono text-xs text-blue-900 font-bold truncate">{hashVal}</div>
                      </div>
                    </div>
                    <button
                      onClick={copyHash}
                      className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 shadow-xs"
                    >
                      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}

                {/* Rejection reason if any */}
                {paper.rejection_reason && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                    <div className="text-[10px] font-black uppercase tracking-wider text-rose-700 mb-1 flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      Moderator Rejection Feedback
                    </div>
                    <p className="text-xs text-rose-900 leading-relaxed font-medium">{paper.rejection_reason}</p>
                  </div>
                )}

                {/* Security Content Status */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {paper.decrypted_content
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      : <Lock className="w-5 h-5 text-amber-500" />}
                    <div>
                      <div className="text-xs font-black text-slate-800">
                        {paper.decrypted_content ? 'AES-256 Decrypted Payload Accessible' : 'Content Encrypted in Secure Vault'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {paper.decrypted_content
                          ? 'Your role has authorized decryption clearance.'
                          : 'Decryption keys locked until scheduled release time.'}
                      </div>
                    </div>
                  </div>
                  {paper.decrypted_content && (
                    <button
                      onClick={() => setShowContent(v => !v)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
                    >
                      {showContent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {showContent ? 'Hide Preview' : 'Show Sets Preview'}
                    </button>
                  )}
                </div>

                {/* Decrypted Sets Content */}
                {paper.decrypted_content && showContent && (
                  <pre className="p-4 rounded-2xl font-mono text-xs leading-relaxed max-h-64 overflow-y-auto bg-slate-900 text-cyan-300 border border-slate-800">
                    {paper.decrypted_content}
                  </pre>
                )}

                {!paper.decrypted_content && (
                  <div className="p-8 rounded-2xl text-center bg-slate-50 border border-dashed border-slate-200">
                    <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      {paper.denial_reason || 'Examination questions remain cryptographically locked at rest. Only authorized personnel may decrypt at released hours.'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Security Verification Engine Active
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
