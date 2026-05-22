import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../assets/css/global-alert.css';

function normalizeMessage(input) {
  if (typeof input === 'string') return input;
  if (input === null || input === undefined) return '';
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

function resolveAlertVariant(message = '') {
  const text = String(message).toLowerCase();

  const negativeHints = [
    'error', 'incorrect', 'incorrecta', 'incorrecto', 'invalido', 'invalida', 'fall',
    'no se pudo', 'rechaz', 'deneg', 'conexion', 'conexión'
  ];

  const positiveHints = [
    'exito', 'exito', 'correct', 'guardad', 'cread', 'actualiz', 'aprobad',
    'completad', 'enviado', 'realizada', 'realizado', 'listo'
  ];

  if (negativeHints.some((hint) => text.includes(hint))) return 'error';
  if (positiveHints.some((hint) => text.includes(hint))) return 'success';
  return 'info';
}

function resolveVariant(dialog) {
  if (!dialog) return 'info';
  if (dialog.type === 'confirm') return 'confirm';
  if (dialog.type === 'prompt') return 'prompt';
  return resolveAlertVariant(dialog.message);
}

export default function GlobalAlertBridge() {
  const [dialogs, setDialogs] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    const nativeAlert = window.alert.bind(window);

    window.alert = (message) => {
      const text = normalizeMessage(message);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => [...prev, { id, message: text, variant: resolveAlertVariant(text) }]);
    };

    window.wpConfirm = (message) =>
      new Promise((resolve) => {
        const text = normalizeMessage(message);
        setDialogs((prev) => [...prev, { type: 'confirm', message: text, resolve }]);
      });

    window.wpPrompt = (message, defaultValue = '') =>
      new Promise((resolve) => {
        const text = normalizeMessage(message);
        setDialogs((prev) => [
          ...prev,
          {
            type: 'prompt',
            message: text,
            defaultValue: defaultValue ?? '',
            resolve,
          },
        ]);
      });

    return () => {
      window.alert = nativeAlert;
      delete window.wpConfirm;
      delete window.wpPrompt;
    };
  }, []);

  const currentDialog = useMemo(() => dialogs[0] ?? null, [dialogs]);

  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map((toast) =>
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, 3200)
    );

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [toasts]);

  useEffect(() => {
    if (!currentDialog) return;
    if (currentDialog.type === 'prompt') {
      setPromptValue(String(currentDialog.defaultValue ?? ''));
      return;
    }
    setPromptValue('');
  }, [currentDialog]);

  const closeModal = () => {
    setDialogs((prev) => prev.slice(1));
  };

  const acceptDialog = () => {
    if (!currentDialog) return;
    if (typeof currentDialog.resolve === 'function') {
      if (currentDialog.type === 'confirm') currentDialog.resolve(true);
      if (currentDialog.type === 'prompt') currentDialog.resolve(promptValue);
    }
    closeModal();
  };

  const cancelDialog = () => {
    if (!currentDialog) return;
    if (typeof currentDialog.resolve === 'function') {
      if (currentDialog.type === 'confirm') currentDialog.resolve(false);
      if (currentDialog.type === 'prompt') currentDialog.resolve(null);
    }
    closeModal();
  };

  const onPromptKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      acceptDialog();
    }
  };

  const toastIconByVariant = {
    error: '!',
    success: '✓',
    info: 'i',
  };

  const renderToasts = () => (
    <div className="wp-toast-stack" aria-live="polite" aria-atomic="false">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            layout
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.8}
            onDragEnd={(e, { offset, velocity }) => {
              if (Math.abs(offset.x) > 60 || Math.abs(velocity.x) > 400) {
                setToasts((prev) => prev.filter((item) => item.id !== toast.id));
              }
            }}
            onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
            key={toast.id}
            className={`wp-toast wp-toast-${toast.variant}`}
            role="status"
            style={{ touchAction: 'pan-y', cursor: 'grab' }}
            whileDrag={{ cursor: 'grabbing' }}
          >
            <span className="wp-toast-icon" aria-hidden="true">
              {toastIconByVariant[toast.variant] || 'i'}
            </span>
            <span className="wp-toast-message">{toast.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  if (!currentDialog) {
    return renderToasts();
  }

  const isConfirm = currentDialog.type === 'confirm';
  const isPrompt = currentDialog.type === 'prompt';
  const variant = resolveVariant(currentDialog);

  const iconByVariant = {
    error: '!',
    success: '✓',
    confirm: '?',
    prompt: '✎',
    info: 'i',
  };
  const iconSymbol = iconByVariant[variant] || 'i';

  const portalContent = (
    <>
      {renderToasts()}
      <div className={`wp-alert-overlay wp-alert-overlay-${variant}`} role="dialog" aria-modal="true" aria-label="Notificacion">
        <div className={`wp-alert-card wp-variant-${variant}`}>
          <div className="wp-alert-icon" aria-hidden="true">
            {iconSymbol}
          </div>
          <div className="wp-alert-message">{currentDialog.message}</div>

          {isPrompt && (
            <input
              type="text"
              value={promptValue}
              onChange={(event) => setPromptValue(event.target.value)}
              onKeyDown={onPromptKeyDown}
              className="wp-alert-input"
              autoFocus
            />
          )}

          {!isConfirm && !isPrompt && (
            <button type="button" className="wp-alert-button" onClick={closeModal} autoFocus>
              Entendido
            </button>
          )}

          {(isConfirm || isPrompt) && (
            <div className="wp-alert-actions">
              <button type="button" className="wp-alert-button wp-alert-button-cancel" onClick={cancelDialog}>
                Cancelar
              </button>
              <button type="button" className="wp-alert-button wp-alert-button-accept" onClick={acceptDialog} autoFocus={!isPrompt}>
                Aceptar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(portalContent, document.body);
}
