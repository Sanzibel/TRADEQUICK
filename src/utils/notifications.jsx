import toast from 'react-hot-toast';

export const notificationOptions = {
  position: 'top-right',
  duration: 3500,
  style: {
    background: '#151515',
    color: '#f8f3df',
    border: '1px solid rgba(212, 175, 55, 0.55)',
    borderRadius: '10px',
    boxShadow: '0 18px 45px rgba(0, 0, 0, 0.35)',
    fontSize: '0.9rem',
    maxWidth: '420px'
  },
  success: {
    duration: 3000,
    iconTheme: {
      primary: '#d4af37',
      secondary: '#151515'
    }
  },
  error: {
    duration: 4500,
    iconTheme: {
      primary: '#ff5a5f',
      secondary: '#151515'
    }
  }
};

export const confirmToast = (message, options = {}) => {
  const {
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = true
  } = options;

  return new Promise((resolve) => {
    const toastId = toast.custom(
      () => (
        <div
          style={{
            background: '#151515',
            color: '#f8f3df',
            border: '1px solid rgba(212, 175, 55, 0.55)',
            borderRadius: '10px',
            boxShadow: '0 18px 45px rgba(0, 0, 0, 0.35)',
            padding: '16px',
            width: 'min(420px, calc(100vw - 32px))'
          }}
        >
          <p style={{ margin: '0 0 14px', lineHeight: 1.45 }}>{message}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(toastId);
                resolve(false);
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(212, 175, 55, 0.45)',
                borderRadius: '8px',
                color: '#d4af37',
                cursor: 'pointer',
                padding: '8px 12px'
              }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(toastId);
                resolve(true);
              }}
              style={{
                background: danger ? '#ff5a5f' : '#d4af37',
                border: 'none',
                borderRadius: '8px',
                color: danger ? '#fff' : '#111',
                cursor: 'pointer',
                fontWeight: 700,
                padding: '8px 12px'
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, position: 'top-center' }
    );
  });
};

export { toast };
