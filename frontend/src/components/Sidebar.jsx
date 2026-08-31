import React from 'react';
import {
  LayoutDashboard, FileText, CheckSquare, Calendar, Printer,
  ShieldAlert, Activity, Eye, ChevronRight, Users, Shield
} from 'lucide-react';

const NAV_GROUPS = {
  ADMIN: [
    { group: 'Command Center', items: [
      { id: 'dashboard', label: 'Security Dashboard', icon: LayoutDashboard },
      { id: 'users',     label: 'User Management',    icon: Users },
    ]},
    { group: 'Paper Lifecycle', items: [
      { id: 'papers',    label: 'Question Papers',  icon: FileText },
      { id: 'reviews',   label: 'Review Queue',     icon: CheckSquare },
      { id: 'schedules', label: 'Exam Schedules',   icon: Calendar },
      { id: 'printing',  label: 'Printing Portal',  icon: Printer },
    ]},
    { group: 'Defense & Audit', items: [
      { id: 'alerts', label: 'Security Alerts', icon: ShieldAlert, badge: 'LIVE', badgeColor: '#dc2626' },
      { id: 'audit',  label: 'Activity Log',    icon: Activity },
    ]},
  ],
  PAPER_SETTER: [
    { group: 'Workspace', items: [
      { id: 'dashboard',       label: 'Setter Dashboard', icon: LayoutDashboard },
      { id: 'setter_workspace',label: 'Prepare Questions',icon: FileText, badge: 'AES-256', badgeColor: '#2563eb' },
      { id: 'my_papers',       label: 'My Submissions',   icon: Eye },
    ]},
  ],
  MODERATOR: [
    { group: 'Review Operations', items: [
      { id: 'dashboard',      label: 'Moderator Dashboard', icon: LayoutDashboard },
      { id: 'moderator_queue',label: 'Review & Pool Queue', icon: CheckSquare, badge: 'POOL', badgeColor: '#7c3aed' },
    ]},
  ],
  EXAM_CONTROLLER: [
    { group: 'Time-Lock Control', items: [
      { id: 'dashboard',          label: 'Controller Hub', icon: LayoutDashboard },
      { id: 'controller_schedule',label: 'Schedule & Locks', icon: Calendar, badge: 'LOCKS', badgeColor: '#0f766e' },
      { id: 'audit',              label: 'Release History Log', icon: Activity },
    ]},
  ],
  PRINTING_STAFF: [
    { group: 'Secure Portal', items: [
      { id: 'dashboard',     label: 'Printing Dashboard', icon: LayoutDashboard },
      { id: 'printing_portal',label: 'Anti-Tamper Print Station', icon: Printer, badge: 'SETS', badgeColor: '#1d4ed8' },
    ]},
  ],
};

export const Sidebar = ({ activeTab, setActiveTab, role }) => {
  const groups = NAV_GROUPS[role] || NAV_GROUPS.ADMIN;

  return (
    <aside className="w-64 shrink-0 flex flex-col transition-all duration-300"
      style={{
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRight: '1px solid rgba(191, 219, 254, 0.65)',
        boxShadow: '4px 0 20px -2px rgba(59, 130, 246, 0.04)',
      }}>

      {/* Nav groups */}
      <div className="flex-1 overflow-y-auto py-5 px-3.5 space-y-6">
        {groups.map(group => (
          <div key={group.group}>
            {/* Group label */}
            <div className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {group.group}
            </div>

            <nav className="space-y-1">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 relative group text-left"
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(219, 234, 254, 0.9) 0%, rgba(224, 242, 254, 0.7) 100%)'
                        : 'transparent',
                      color: isActive ? '#1d4ed8' : '#64748b',
                      border: isActive ? '1px solid rgba(147, 197, 253, 0.9)' : '1px solid transparent',
                      fontWeight: isActive ? 700 : 500,
                      boxShadow: isActive ? '0 4px 14px rgba(59, 130, 246, 0.12)' : 'none',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(239, 246, 255, 0.7)';
                        e.currentTarget.style.color = '#1e40af';
                        e.currentTarget.style.borderColor = 'rgba(191, 219, 254, 0.5)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#64748b';
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                    }}
                  >
                    {/* Active left indicator bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full"
                        style={{ background: 'linear-gradient(to bottom, #1d4ed8, #38bdf8)', boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)' }} />
                    )}

                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110"
                        style={{ color: isActive ? '#1d4ed8' : '#94a3b8' }} />
                      <span className="text-[13px] truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {item.badge && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md"
                          style={{
                            background: `${item.badgeColor}15`,
                            color: item.badgeColor,
                            border: `1px solid ${item.badgeColor}35`,
                          }}>
                          {item.badge}
                        </span>
                      )}

                      {isActive && (
                        <ChevronRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Bottom Security Card */}
      <div className="p-3.5 border-t border-blue-100/70">
        <div className="p-3.5 rounded-2xl relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(240, 253, 244, 0.9) 0%, rgba(236, 253, 245, 0.9) 100%)',
            border: '1.5px solid rgba(167, 243, 208, 0.8)',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
          }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] font-black text-emerald-800 tracking-wider">ACTIVE DEFENSE SHIELD</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 live-dot ml-auto" />
          </div>
          <p className="text-[10px] text-emerald-700 font-medium leading-relaxed">
            All question papers are encrypted at rest with AES-256 and verified with SHA-256 signatures.
          </p>
        </div>
      </div>
    </aside>
  );
};
