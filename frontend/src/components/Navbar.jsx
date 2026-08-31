import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Bell, LogOut, Clock, CheckCheck, Sparkles, KeyRound, Database, Lock, AlertCircle } from 'lucide-react';
import api from '../services/api';

const ROLE_META = {
  ADMIN:           { label: 'Administrator',  color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe', dot: '#3b82f6' },
  PAPER_SETTER:    { label: 'Paper Setter',   color: '#0e7490', bg: '#cffafe', border: '#a5f3fc', dot: '#06b6d4' },
  MODERATOR:       { label: 'Moderator',      color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe', dot: '#8b5cf6' },
  EXAM_CONTROLLER: { label: 'Exam Controller',color: '#0f766e', bg: '#ccfbf1', border: '#99f6e4', dot: '#14b8a6' },
  PRINTING_STAFF:  { label: 'Printing Staff', color: '#1d4ed8', bg: '#e0f2fe', border: '#bae6fd', dot: '#0ea5e9' },
};

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [clock, setClock] = useState(new Date());
  const notifRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchNotifications = () => {
    if (user) {
      api.get('/admin/notifications')
        .then(r => setNotifications(r.data))
        .catch(() => {});
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Live poll notifications
    return () => clearInterval(interval);
  }, [user]);

  // Outside click handler for notifications dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      // Mark as read locally and attempt endpoint if available
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch {}
  };

  const meta = user ? (ROLE_META[user.role] || ROLE_META.ADMIN) : ROLE_META.ADMIN;
  const unread = notifications.filter(n => !n.is_read).length;

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const iso = !(ts.endsWith('Z') || ts.includes('+')) ? `${ts}Z` : ts;
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <header className="sticky top-0 z-40 w-full"
      style={{
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(191, 219, 254, 0.65)',
        boxShadow: '0 4px 20px -2px rgba(59, 130, 246, 0.07)',
      }}>
      <div className="flex items-center justify-between px-5 py-2.5">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 60%, #38bdf8 100%)', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)' }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="absolute inset-0 rounded-xl border-2 border-blue-400/40 animate-ping pointer-events-none" style={{ animationDuration: '3.5s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight bg-gradient-to-r from-blue-900 via-blue-700 to-indigo-600 bg-clip-text text-transparent">
                SecureExam
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                style={{ background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>Encrypted</span>
            </div>
            <p className="text-[11px] font-semibold text-slate-400">Exam Integrity & Anti-Leak Defense System</p>
          </div>
        </div>

        {/* Center — Security Status & Live clock */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Cryptographic Badges */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-pill text-xs text-slate-600">
            <span className="flex items-center gap-1 font-mono font-semibold text-blue-700">
              <KeyRound className="w-3.5 h-3.5 text-blue-600" /> AES-256 GCM
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="flex items-center gap-1 font-mono font-semibold text-emerald-700">
              <Database className="w-3.5 h-3.5 text-emerald-600" /> SHA-256 Ledger
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="flex items-center gap-1 font-mono font-semibold text-purple-700">
              <Lock className="w-3.5 h-3.5 text-purple-600" /> RBAC Enforced
            </span>
          </div>

          {/* Clock Pill */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl glass-pill">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-mono tabular-nums font-bold text-slate-800">
              {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              {clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 live-dot inline-block" />
          </div>
        </div>

        {/* Right User Bar */}
        {user && (
          <div className="flex items-center gap-3">

            {/* Notifications Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotif(v => !v)}
                aria-label="Notifications"
                className="w-9 h-9 flex items-center justify-center rounded-xl relative transition-all duration-200 glass-pill hover:bg-blue-100/60"
              >
                <Bell className="w-4 h-4 text-blue-600 transition-transform active:scale-90" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-black text-white rounded-full bg-rose-500 shadow-md shadow-rose-500/30 animate-pulse">
                    {unread}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="absolute right-0 top-full mt-2.5 w-84 sm:w-96 rounded-2xl z-50 overflow-hidden glass-card animate-fadeInUp"
                  style={{
                    background: 'rgba(255, 255, 255, 0.98)',
                    boxShadow: '0 20px 45px -10px rgba(30, 58, 138, 0.18), 0 4px 16px rgba(0,0,0,0.06)',
                    border: '1.5px solid rgba(191, 219, 254, 0.8)'
                  }}>
                  <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border-b border-blue-100">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-black text-slate-800 tracking-tight">Security Notifications</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {notifications.length}
                      </span>
                    </div>
                    {unread > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Sparkles className="w-8 h-8 text-blue-300 mx-auto mb-2 opacity-60" />
                        <p className="text-xs font-semibold text-slate-600">All caught up!</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">No new system alerts or notifications.</p>
                      </div>
                    ) : notifications.map(n => (
                      <div
                        key={n.id}
                        className={`p-3.5 transition-colors ${!n.is_read ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-blue-500" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-800 mb-0.5">{n.title}</div>
                            <div className="text-xs text-slate-600 leading-relaxed">{n.message}</div>
                            <div className="text-[10px] text-slate-400 font-medium mt-1 font-mono">
                              {formatTimestamp(n.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Role Badge */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl glass-pill">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, ${meta.dot}, ${meta.color})` }}
              >
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold leading-none text-slate-800">{user.full_name}</div>
                <div className="text-[10px] font-bold mt-0.5 tracking-wide" style={{ color: meta.color }}>
                  {meta.label}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={logout}
              title="Sign Out"
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all duration-200 text-rose-600 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 active:scale-95 shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
