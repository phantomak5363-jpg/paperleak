import React from 'react';

const STATUS_CONFIG = {
  DRAFT:        { color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1', label: 'Draft' },
  SUBMITTED:    { color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe', label: 'Submitted' },
  UNDER_REVIEW: { color: '#d97706', bg: '#fef3c7', border: '#fde68a', label: 'Under Review' },
  APPROVED:     { color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', label: 'Approved' },
  REJECTED:     { color: '#dc2626', bg: '#fee2e2', border: '#fecaca', label: 'Rejected' },
  SCHEDULED:    { color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe', label: 'Scheduled' },
  RELEASED:     { color: '#0e7490', bg: '#cffafe', border: '#a5f3fc', label: 'Released' },
  PRINTED:      { color: '#0f766e', bg: '#ccfbf1', border: '#99f6e4', label: 'Printed' },
};

const SEV_CONFIG = {
  CRITICAL: { color: '#dc2626', bg: '#fee2e2', border: '#fecaca' },
  HIGH:     { color: '#c2410c', bg: '#ffedd5', border: '#fed7aa' },
  MEDIUM:   { color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  LOW:      { color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0' },
};

const ROLE_CONFIG = {
  ADMIN:          { color: '#dc2626', bg: '#fee2e2', border: '#fecaca', label: 'Admin' },
  PAPER_SETTER:   { color: '#0e7490', bg: '#cffafe', border: '#a5f3fc', label: 'Paper Setter' },
  MODERATOR:      { color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe', label: 'Moderator' },
  EXAM_CONTROLLER:{ color: '#0f766e', bg: '#ccfbf1', border: '#99f6e4', label: 'Controller' },
  PRINTING_STAFF: { color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe', label: 'Printing Staff' },
};

export const PaperStatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-xs"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
};

export const AlertSeverityBadge = ({ severity }) => {
  const cfg = SEV_CONFIG[severity] || SEV_CONFIG.LOW;
  const isCrit = severity === 'CRITICAL';
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-xs"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {isCrit && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />}
      {severity}
    </span>
  );
};

export const RoleBadge = ({ role }) => {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.ADMIN;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-xs"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  );
};
