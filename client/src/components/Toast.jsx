import { useEffect } from 'react';

export function Toast({ message, type = 'info', onDismiss, duration = 3000 }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss?.(), duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  return (
    <div className={`toast ${type}`} role="alert">
      {message}
    </div>
  );
}
