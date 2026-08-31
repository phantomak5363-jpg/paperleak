import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield, Lock, Eye, EyeOff, AlertCircle, ArrowRight,
  Zap, CheckCircle, ChevronRight, Sparkles
} from 'lucide-react';

/* ── Demo role data ─────────────────────────────────────── */
const DEMO_ROLES = [
  { label: 'Administrator',  user: 'admin',          pass: 'admin',    icon: '👑', color: '#1d4ed8', light: '#dbeafe' },
  { label: 'Paper Setter',   user: 'setter1',        pass: 'setter1',   icon: '✍️', color: '#0e7490', light: '#cffafe' },
  { label: 'Moderator',      user: 'moderator',      pass: 'moderator',icon: '🔍', color: '#7c3aed', light: '#ede9fe' },
  { label: 'Exam Controller',user: 'controller',     pass: 'controller',icon: '📅',color: '#0f766e', light: '#ccfbf1' },
  { label: 'Printing Staff', user: 'printer',        pass: 'printer', icon: '🖨️', color: '#1d4ed8', light: '#e0f2fe' },
];

const STATS = [
  { value: '256-bit', label: 'AES Encryption' },
  { value: '100%',    label: 'SHA-256 Verified' },
  { value: 'ML-Powered', label: 'Threat Detection' },
  { value: 'Role-Based', label: 'Access Control' },
];

const FEATURES = [
  { icon: '🔒', label: 'AES-256 GCM', sub: 'Paper encryption' },
  { icon: '🤖', label: 'ML Anomaly Engine', sub: 'Pattern detection' },
  { icon: '⏰', label: 'Time-Release Gate', sub: 'Cryptographic lock' },
  { icon: '📋', label: 'Immutable Audit Trail', sub: 'Full traceability' },
];

/* ── Magnetic button hook ───────────────────────────────── */
const useMagnetic = () => {
  const ref = useRef(null);
  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
  };
  const handleLeave = () => {
    if (ref.current) ref.current.style.transform = 'translate(0,0)';
  };
  return { ref, onMouseMove: handleMove, onMouseLeave: handleLeave };
};

/* ── Animated blob component ────────────────────────────── */
const Blob = ({ style }) => (
  <div className="absolute rounded-full pointer-events-none" style={{
    filter: 'blur(70px)',
    opacity: 0.55,
    animation: 'blobFloat 8s ease-in-out infinite alternate',
    ...style
  }} />
);

/* ── Typewriter hook ─────────────────────────────────────── */
const useTypewriter = (words, speed = 90, pause = 2000) => {
  const [text, setText] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const current = words[wordIdx % words.length];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setText(current.slice(0, text.length + 1));
        if (text.length + 1 === current.length) {
          setTimeout(() => setDeleting(true), pause);
        }
      } else {
        setText(current.slice(0, text.length - 1));
        if (text.length === 0) {
          setDeleting(false);
          setWordIdx(i => (i + 1) % words.length);
        }
      }
    }, deleting ? speed / 2 : speed);
    return () => clearTimeout(timeout);
  }, [text, deleting, wordIdx, words, speed, pause]);
  return text;
};

/* ── Main component ──────────────────────────────────────── */
export const LoginPage = () => {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [hoveredRole, setHoveredRole] = useState(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const magneticBtn = useMagnetic();
  const typeText = useTypewriter(['Leak Prevention', 'Paper Security', 'Exam Integrity', 'Threat Detection']);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const res = await login(username, password);
    if (!res.success) setError(res.error);
    else setLoginSuccess(true);
  };

  const handleQuickLogin = async (role) => {
    setUsername(role.user);
    setPassword(role.pass);
    setError(null);
    const res = await login(role.user, role.pass);
    if (!res.success) setError(res.error);
    else setLoginSuccess(true);
  };

  return (
    <div className="min-h-screen flex overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 40%, #ffffff 70%, #eff6ff 100%)' }}>

      {/* ── Injected keyframes ── */}
      <style>{`
        @keyframes blobFloat {
          0%   { transform: translate(0,0) scale(1); }
          33%  { transform: translate(30px,-20px) scale(1.05); }
          66%  { transform: translate(-20px,30px) scale(0.96); }
          100% { transform: translate(10px,10px) scale(1.02); }
        }
        @keyframes shimmerSlide {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes floatUp {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes rippleExpand {
          0%   { transform: scale(0); opacity:0.6; }
          100% { transform: scale(4); opacity:0; }
        }
        @keyframes successPop {
          0%   { transform:scale(0.8); opacity:0; }
          60%  { transform:scale(1.1); }
          100% { transform:scale(1); opacity:1; }
        }
        @keyframes cursorBlink {
          0%,100% { opacity:1; }
          50%      { opacity:0; }
        }
        @keyframes slideInRight {
          from { opacity:0; transform:translateX(20px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); }
          70%  { box-shadow: 0 0 0 12px rgba(59,130,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
        }
        .cursor-blink::after {
          content:'|';
          animation: cursorBlink 0.9s step-end infinite;
          color: #2563eb;
          font-weight:300;
        }
        .input-light {
          width:100%;
          padding: 12px 16px;
          border-radius:12px;
          font-size:14px;
          color:#1e3a5f;
          background: rgba(255,255,255,0.8);
          border: 1.5px solid #bfdbfe;
          outline: none;
          transition: all 0.25s ease;
          backdrop-filter: blur(8px);
        }
        .input-light:focus {
          border-color: #3b82f6;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(59,130,246,0.12), 0 2px 12px rgba(59,130,246,0.1);
        }
        .input-light::placeholder { color:#93c5fd; }
        .btn-light-primary {
          width:100%;
          padding:13px 20px;
          border-radius:14px;
          font-size:14px;
          font-weight:700;
          color:#fff;
          background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 60%, #38bdf8 100%);
          background-size:200% 100%;
          border:none;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          transition: all 0.3s ease;
          position:relative;
          overflow:hidden;
        }
        .btn-light-primary:hover {
          background-position: right center;
          box-shadow: 0 8px 24px rgba(59,130,246,0.45);
          transform: translateY(-1px);
        }
        .btn-light-primary:active { transform:translateY(0); }
        .btn-light-primary:disabled { opacity:0.7; cursor:not-allowed; transform:none; }
        .role-pill {
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:10px 14px;
          border-radius:12px;
          cursor:pointer;
          border:1.5px solid #bfdbfe;
          background:rgba(255,255,255,0.6);
          transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        .role-pill:hover {
          background:#ffffff;
          border-color:#3b82f6;
          box-shadow:0 4px 16px rgba(59,130,246,0.15);
          transform:translateX(4px);
        }
        .glass-card-light {
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(24px) saturate(200%);
          -webkit-backdrop-filter: blur(24px) saturate(200%);
          border: 1.5px solid rgba(191,219,254,0.6);
          box-shadow: 0 20px 60px rgba(59,130,246,0.1), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
        }
        .stat-card {
          background:rgba(255,255,255,0.6);
          border:1px solid rgba(191,219,254,0.5);
          border-radius:12px;
          padding:12px 10px;
          text-align:center;
          transition:all 0.2s ease;
        }
        .stat-card:hover {
          background:#fff;
          border-color:#93c5fd;
          box-shadow:0 4px 16px rgba(59,130,246,0.12);
          transform:translateY(-2px);
        }
      `}</style>

      {/* ── Animated blobs ── */}
      <Blob style={{ width:500, height:500, background:'#bfdbfe', top:'-120px', left:'-80px' }} />
      <Blob style={{ width:400, height:400, background:'#e0f2fe', bottom:'-80px', right:'-60px', animationDelay:'3s' }} />
      <Blob style={{ width:300, height:300, background:'#ddd6fe', top:'40%', left:'35%', animationDelay:'5s' }} />

      {/* Soft dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(59,130,246,0.1) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

      {/* ═══════════ LEFT PANEL ═══════════ */}
      <div className="hidden lg:flex w-[52%] flex-col justify-between p-14 relative z-10">

        {/* Brand */}
        <div className="flex items-center gap-3.5" style={{ animation:'slideInRight 0.5s ease-out' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center relative"
            style={{ background:'linear-gradient(135deg,#1d4ed8,#38bdf8)', boxShadow:'0 8px 24px rgba(59,130,246,0.4)', animation:'pulseRing 2.5s ease-in-out infinite' }}>
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-black" style={{ color:'#1e3a8a', letterSpacing:'-0.02em' }}>SecureExam</div>
            <div className="text-xs font-medium" style={{ color:'#64748b' }}>Examination Security Platform v1.0</div>
          </div>
        </div>

        {/* Hero section */}
        <div className="space-y-8">
          {/* Active badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold"
            style={{ background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.3)', color:'#16a34a' }}>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
            System Active · All Encryption Layers Online
          </div>

          {/* Typewriter headline */}
          <div>
            <h1 className="text-5xl font-black leading-tight mb-3"
              style={{ color:'#0f172a', letterSpacing:'-0.03em' }}>
              Examination<br />
              Paper<br />
              <span className="cursor-blink" style={{ color:'#2563eb' }}>{typeText}</span>
            </h1>
            <p className="text-base leading-relaxed max-w-md" style={{ color:'#475569' }}>
              Enterprise cryptographic protection with machine learning anomaly detection —
              safeguarding the complete question paper lifecycle end-to-end.
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {STATS.map((s, i) => (
              <div key={i} className="stat-card" style={{ animationDelay:`${i*80}ms`, animation:'slideInRight 0.5s ease-out both' }}>
                <div className="text-sm font-black" style={{ color:'#1d4ed8' }}>{s.value}</div>
                <div className="text-[10px] font-medium mt-0.5" style={{ color:'#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>


          {/* Feature cards */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <div key={i}
                className="flex items-center gap-3 p-3.5 rounded-2xl cursor-default group transition-all duration-200"
                style={{
                  background:'rgba(255,255,255,0.65)',
                  border:'1px solid rgba(191,219,254,0.6)',
                  animationDelay:`${i*60+200}ms`,
                  animation:'slideInRight 0.5s ease-out both',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.95)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(59,130,246,0.15)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.65)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='translateY(0)'; }}>
                <div className="text-2xl" style={{ animation:`floatUp ${2.5 + i*0.3}s ease-in-out infinite` }}>{f.icon}</div>
                <div>
                  <div className="text-xs font-bold" style={{ color:'#1e3a8a' }}>{f.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color:'#64748b' }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom watermark */}
        <div className="flex items-center gap-3">
          {['AES-256', 'SHA-256', 'JWT Bearer', 'RBAC'].map(tag => (
            <div key={tag} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
              style={{ background:'rgba(219,234,254,0.6)', color:'#2563eb', border:'1px solid rgba(147,197,253,0.5)' }}>
              <CheckCircle className="w-3 h-3" />
              {tag}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ RIGHT PANEL — Login Card ═══════════ */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 relative z-10">
        <div className="w-full max-w-[380px]">

          {/* Mobile brand */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background:'linear-gradient(135deg,#1d4ed8,#38bdf8)', boxShadow:'0 8px 20px rgba(59,130,246,0.4)' }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black" style={{ color:'#1e3a8a' }}>SecureExam</span>
          </div>

          {/* Card */}
          <div className="rounded-3xl overflow-hidden glass-card-light"
            style={{ animation:'slideInRight 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>

            {/* Card top gradient stripe */}
            <div className="h-1.5 w-full"
              style={{ background:'linear-gradient(90deg, #1d4ed8, #38bdf8, #7c3aed, #1d4ed8)', backgroundSize:'200% 100%', animation:'shimmerSlide 3s linear infinite' }} />

            {/* Card header */}
            <div className="px-7 pt-7 pb-5" style={{ borderBottom:'1px solid rgba(191,219,254,0.4)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black" style={{ color:'#0f172a', letterSpacing:'-0.02em' }}>
                    Secure Sign In
                  </h2>
                  <p className="text-xs mt-1" style={{ color:'#64748b' }}>
                    Enter credentials to access your workspace
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background:'linear-gradient(135deg,#dbeafe,#e0f2fe)', border:'1px solid #bfdbfe' }}>
                  <Lock className="w-5 h-5" style={{ color:'#2563eb' }} />
                </div>
              </div>
            </div>

            {/* Form body */}
            <div className="px-7 py-6 space-y-5">

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
                  style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', color:'#dc2626', animation:'successPop 0.3s ease-out' }}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Login form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold" style={{ color:'#374151' }}>Username</label>
                  <div className="relative">
                    <input
                      id="login-username"
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      onFocus={() => setFocusedField('user')}
                      onBlur={() => setFocusedField(null)}
                      className="input-light"
                      placeholder="Enter your username"
                      required
                      style={{ paddingLeft: '40px' }}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                      style={{ color: focusedField === 'user' ? '#3b82f6' : '#93c5fd' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold" style={{ color:'#374151' }}>Password</label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('pass')}
                      onBlur={() => setFocusedField(null)}
                      className="input-light"
                      placeholder="••••••••••"
                      required
                      style={{ paddingLeft:'40px', paddingRight:'44px' }}
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                      style={{ color: focusedField === 'pass' ? '#3b82f6' : '#93c5fd' }}>
                      <Lock className="w-4 h-4" />
                    </div>
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200"
                      style={{ color:'#93c5fd' }}
                      onMouseEnter={e => e.currentTarget.style.color='#3b82f6'}
                      onMouseLeave={e => e.currentTarget.style.color='#93c5fd'}>
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Magnetic submit button */}
                <div {...magneticBtn} style={{ display:'block', transition:'transform 0.2s ease' }}>
                  <button
                    ref={null}
                    type="submit"
                    id="login-submit"
                    disabled={loading}
                    className="btn-light-primary"
                    style={{ marginTop:'4px' }}>
                    {loading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Authenticating...
                      </>
                    ) : loginSuccess ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Access Granted
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Authenticate Session
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background:'linear-gradient(to right, transparent, #bfdbfe)' }} />
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color:'#94a3b8' }}>
                  <Zap className="w-3 h-3 text-blue-400" />
                  Quick Demo Login
                </div>
                <div className="flex-1 h-px" style={{ background:'linear-gradient(to left, transparent, #bfdbfe)' }} />
              </div>

              {/* Role switcher — horizontal scroll pill strip */}
              <div className="space-y-2">
                {DEMO_ROLES.map((role, i) => (
                  <button
                    key={role.user}
                    id={`quick-login-${role.user}`}
                    onClick={() => handleQuickLogin(role)}
                    onMouseEnter={() => setHoveredRole(i)}
                    onMouseLeave={() => setHoveredRole(null)}
                    className="role-pill w-full text-left"
                    style={{
                      animationDelay:`${i*50}ms`,
                      animation:'slideInRight 0.4s ease-out both',
                      boxShadow: hoveredRole === i ? '0 4px 16px rgba(59,130,246,0.18)' : 'none',
                      borderColor: hoveredRole === i ? role.color : '#bfdbfe',
                    }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 transition-all duration-200"
                        style={{
                          background: hoveredRole === i ? role.light : 'rgba(219,234,254,0.5)',
                          transform: hoveredRole === i ? 'scale(1.15) rotate(-5deg)' : 'scale(1)',
                        }}>
                        {role.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold" style={{ color: hoveredRole === i ? role.color : '#1e3a8a' }}>
                          {role.label}
                        </div>
                        <div className="text-[10px]" style={{ color:'#94a3b8' }}>{role.user}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200"
                      style={{
                        color: hoveredRole === i ? role.color : '#cbd5e1',
                        transform: hoveredRole === i ? 'translateX(3px)' : 'translateX(0)',
                      }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Card footer */}
            <div className="px-7 py-4 flex items-center justify-between"
              style={{ background:'rgba(239,246,255,0.6)', borderTop:'1px solid rgba(191,219,254,0.4)' }}>
              <span className="text-[10px] font-medium" style={{ color:'#94a3b8' }}>
                Protected by SecureExam v1.0
              </span>
              <div className="flex items-center gap-2">
                {['AES-256', 'JWT'].map(t => (
                  <span key={t} className="text-[9px] font-black px-2 py-0.5 rounded-md"
                    style={{ background:'#dbeafe', color:'#1d4ed8', border:'1px solid #bfdbfe' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Below-card trust indicators */}
          <div className="flex items-center justify-center gap-5 mt-5">
            {[
              { icon:'🔒', label:'End-to-End Encrypted' },
              { icon:'🛡️', label:'Role-Based Security' },
              { icon:'📋', label:'Full Audit Trail' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color:'#64748b' }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
