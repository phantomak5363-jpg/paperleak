import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4500 }) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (message, title = 'Success') => addToast({ type: 'success', title, message }),
    error: (message, title = 'Error') => addToast({ type: 'error', title, message }),
    warning: (message, title = 'Warning') => addToast({ type: 'warning', title, message }),
    info: (message, title = 'Notice') => addToast({ type: 'info', title, message }),
  };

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  const getToastStyle = (type) => {
    switch (type) {
      case 'success':
        return {
          background: 'rgba(255, 255, 255, 0.95)',
          borderLeft: '4px solid #10b981',
          boxShadow: '0 12px 30px -4px rgba(16, 185, 129, 0.18), 0 4px 12px rgba(0,0,0,0.06)',
        };
      case 'error':
        return {
          background: 'rgba(255, 255, 255, 0.95)',
          borderLeft: '4px solid #f43f5e',
          boxShadow: '0 12px 30px -4px rgba(244, 63, 94, 0.18), 0 4px 12px rgba(0,0,0,0.06)',
        };
      case 'warning':
        return {
          background: 'rgba(255, 255, 255, 0.95)',
          borderLeft: '4px solid #f59e0b',
          boxShadow: '0 12px 30px -4px rgba(245, 158, 11, 0.18), 0 4px 12px rgba(0,0,0,0.06)',
        };
      case 'info':
      default:
        return {
          background: 'rgba(255, 255, 255, 0.95)',
          borderLeft: '4px solid #3b82f6',
          boxShadow: '0 12px 30px -4px rgba(59, 130, 246, 0.18), 0 4px 12px rgba(0,0,0,0.06)',
        };
    }
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Floating Toast Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-2xl p-4 flex items-start gap-3.5 backdrop-blur-xl border border-blue-100/80 transition-all duration-300 transform translate-y-0 opacity-100 animate-fadeInUp relative overflow-hidden"
            style={getToastStyle(t.type)}
          >
            {getToastIcon(t.type)}
            <div className="flex-1 min-w-0 pr-2">
              {t.title && <h4 className="text-xs font-bold text-slate-800 tracking-tight">{t.title}</h4>}
              <p className="text-xs text-slate-600 font-medium leading-relaxed mt-0.5">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      success: (msg) => console.log('Toast [Success]:', msg),
      error: (msg) => console.error('Toast [Error]:', msg),
      warning: (msg) => console.warn('Toast [Warning]:', msg),
      info: (msg) => console.info('Toast [Info]:', msg),
    };
  }
  return context;
};
