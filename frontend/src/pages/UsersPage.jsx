import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, CheckCircle2, AlertCircle, Shield,
  Trash2, UserX, UserCheck, X, AlertTriangle, Search, Filter,
  Mail, Building, KeyRound, Sparkles
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

const ROLE_META = {
  ADMIN:           { color: '#dc2626', bg: '#fee2e2', border: '#fecaca', label: 'Admin' },
  PAPER_SETTER:    { color: '#0e7490', bg: '#cffafe', border: '#a5f3fc', label: 'Paper Setter' },
  MODERATOR:       { color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe', label: 'Moderator' },
  EXAM_CONTROLLER: { color: '#0f766e', bg: '#ccfbf1', border: '#99f6e4', label: 'Exam Controller' },
  PRINTING_STAFF:  { color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe', label: 'Printing Staff' },
};

const RoleChip = ({ role }) => {
  const m = ROLE_META[role] || { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0', label: role };
  return (
    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide inline-block"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
      {m.label}
    </span>
  );
};

/* ── Confirm Dialog ──────────────────────────────────────── */
const ConfirmDialog = ({ title, message, danger, onConfirm, onCancel }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
      <div className="rounded-3xl overflow-hidden glass-card bg-white border border-rose-200 shadow-2xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-600 via-red-500 to-amber-500" />
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-rose-50 border border-rose-200 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">{title}</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all bg-gradient-to-r from-rose-600 to-red-500 shadow-md shadow-rose-500/20 active:scale-95"
            >
              {danger || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const UsersPage = () => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [confirm, setConfirm] = useState(null); // { type, user }

  const [form, setForm] = useState({
    username: '', full_name: '', email: '', password: '', role: 'PAPER_SETTER', department: 'Computer Science'
  });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = () => {
    setLoading(true);
    api.get('/users')
      .then(r => { setUsers(r.data); setLoading(false); })
      .catch(() => {
        toast.error('Failed to load users list.', 'API Error');
        setLoading(false);
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      toast.success(`User "${form.username}" created with role "${form.role}".`, 'Account Created');
      setShowForm(false);
      setForm({ username: '', full_name: '', email: '', password: '', role: 'PAPER_SETTER', department: 'Computer Science' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create user', 'Creation Failed');
    }
  };

  const handleDelete = async () => {
    const u = confirm.user;
    try {
      await api.delete(`/users/${u.id}`);
      toast.success(`User "${u.username}" and associated credentials removed.`, 'User Deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed.', 'Action Error');
    } finally {
      setConfirm(null);
    }
  };

  const handleToggleActive = async () => {
    const u = confirm.user;
    try {
      const res = await api.patch(`/users/${u.id}/toggle-active`);
      toast.success(`User "${u.username}" ${res.data.is_active ? 'activated' : 'deactivated'} successfully.`, 'Status Updated');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Operation failed.', 'Action Error');
    } finally {
      setConfirm(null);
    }
  };

  const roleGroups = {};
  users.forEach(u => {
    const role = u.role || 'UNKNOWN';
    if (!roleGroups[role]) roleGroups[role] = [];
    roleGroups[role].push(u);
  });

  const filteredUsers = users.filter(u => {
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchSearch = search === '' ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.department && u.department.toLowerCase().includes(search.toLowerCase()));
    return matchRole && matchSearch;
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Identity & Access Management (IAM)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage user roles, cryptographic credentials, account deactivations, and access permissions
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 text-white"
          style={showForm
            ? { background: 'linear-gradient(135deg,#dc2626,#ef4444)' }
            : { background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)' }}
        >
          {showForm ? <><X className="w-4 h-4" /> Cancel Editor</> : <><UserPlus className="w-4 h-4" /> Add New User</>}
        </button>
      </div>

      {/* Create User Modal Form */}
      {showForm && (
        <div className="rounded-3xl overflow-hidden glass-card animate-fadeInUp"
          style={{ background: '#ffffff', border: '1.5px solid #bfdbfe', boxShadow: '0 20px 50px rgba(37,99,235,0.1)' }}>
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600" />
          <div className="px-7 py-5 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-b border-blue-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-600 text-white shadow-sm">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Enroll New System User</h3>
              <p className="text-xs text-slate-500 mt-0.5">User account will be encrypted & provisioned immediately.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={form.full_name}
                placeholder="e.g. Dr. Jane Smith"
                onChange={e => setForm({ ...form, full_name: e.target.value })}
                className="input-field bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Username</label>
              <input
                type="text"
                required
                value={form.username}
                placeholder="e.g. janesmith"
                onChange={e => setForm({ ...form, username: e.target.value })}
                className="input-field bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={form.email}
                placeholder="e.g. jane@university.edu"
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="input-field bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Password</label>
              <input
                type="text"
                required
                value={form.password}
                placeholder="Secure access token"
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="input-field bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Department</label>
              <input
                type="text"
                value={form.department}
                placeholder="e.g. Computer Science"
                onChange={e => setForm({ ...form, department: e.target.value })}
                className="input-field bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Role Permission</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="input-field bg-white font-bold"
              >
                <option value="PAPER_SETTER">Paper Setter</option>
                <option value="MODERATOR">Moderator</option>
                <option value="EXAM_CONTROLLER">Exam Controller</option>
                <option value="PRINTING_STAFF">Printing Staff</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center gap-2 py-2.5 px-6 shadow-md"
              >
                <UserPlus className="w-4 h-4" /> Complete Enrollment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Role Counts Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {Object.entries(ROLE_META).map(([role, m]) => {
          const count = (roleGroups[role] || []).length;
          const isSelected = roleFilter === role;
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? 'ALL' : role)}
              className="glass-card rounded-2xl p-4 text-center transition-all cursor-pointer hover:scale-105"
              style={{
                background: isSelected ? m.bg : '#ffffff',
                border: `1.5px solid ${isSelected ? m.border : '#e2e8f0'}`,
                boxShadow: isSelected ? '0 6px 20px rgba(59,130,246,0.1)' : 'none'
              }}
            >
              <div className="text-2xl font-black tabular-nums" style={{ color: m.color }}>{count}</div>
              <div className="text-[10px] font-bold mt-0.5 uppercase tracking-wider" style={{ color: m.color }}>{m.label}</div>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5 flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by full name, username, department, or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs bg-transparent border-none outline-none font-medium text-slate-800 placeholder:text-slate-400"
          />
        </div>

        {roleFilter !== 'ALL' && (
          <button
            onClick={() => setRoleFilter('ALL')}
            className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Show All Roles
          </button>
        )}
      </div>

      {/* User Table */}
      <div className="rounded-3xl overflow-hidden glass-card bg-white border border-blue-200">
        <div className="flex items-center gap-2 px-6 py-4 bg-slate-50 border-b border-slate-200">
          <Users className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Enrolled Users Directory</h3>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {filteredUsers.length} Users
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-200">
                {['User Identity', 'Role Assignment', 'Department', 'Access State', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 text-xs">{u.full_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.username} • {u.email}</div>
                  </td>
                  <td className="px-6 py-4"><RoleChip role={u.role} /></td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">{u.department || '—'}</td>
                  <td className="px-6 py-4">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        <X className="w-3.5 h-3.5" /> Deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setConfirm({ type: 'toggle', user: u })}
                        title={u.is_active ? 'Deactivate user' : 'Activate user'}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${
                          u.is_active
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => setConfirm({ type: 'delete', user: u })}
                        title="Permanently remove user"
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Modals */}
      {confirm?.type === 'delete' && (
        <ConfirmDialog
          title={`Delete "${confirm.user.full_name}"?`}
          message={`This will permanently remove user account "${confirm.user.username}" and cascade clean any associated papers and questions.`}
          danger="Yes, Delete Permanently"
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'toggle' && (
        <ConfirmDialog
          title={`${confirm.user.is_active ? 'Deactivate' : 'Activate'} "${confirm.user.full_name}"?`}
          message={confirm.user.is_active
            ? `User "${confirm.user.username}" will immediately be blocked from logging in (403 Forbidden).`
            : `User "${confirm.user.username}" will regain active login permissions.`}
          danger={confirm.user.is_active ? 'Deactivate User' : 'Activate User'}
          onConfirm={handleToggleActive}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
};
