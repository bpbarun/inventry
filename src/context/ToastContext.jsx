import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";

const ToastContext = createContext(null);

let _nextId = 0;
const DURATION = 3500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((type, message) => {
    const id = ++_nextId;
    setToasts(prev => [...prev.slice(-3), { id, type, message }]); // max 4 visible
    timers.current[id] = setTimeout(() => dismiss(id), DURATION);
    return id;
  }, [dismiss]);

  const toast = {
    success: (msg) => push("success", msg),
    error:   (msg) => push("error",   msg),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === "success"
              ? <CheckCircle size={16} className="toast-icon" />
              : <XCircle     size={16} className="toast-icon" />}
            <span className="toast-msg">{t.message}</span>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
