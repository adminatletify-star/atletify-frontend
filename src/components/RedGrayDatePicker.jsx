import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './RedGrayDatePicker.css';

const WEEK_DAYS = ['do.', 'lu.', 'ma.', 'mi.', 'ju.', 'vi.', 'sa.'];

function parseISODate(value) {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split('-');
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function compareDateOnly(a, b) {
  const left = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const right = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return left - right;
}

export default function RedGrayDatePicker({
  value,
  onChange,
  placeholder = 'Selecciona fecha',
  required = false,
  className = '',
  inputClassName = '',
  style,
  min,
  max,
}) {
  const rootRef = useRef(null);
  const selectedDate = useMemo(() => parseISODate(value), [value]);
  const minDate = useMemo(() => parseISODate(min), [min]);
  const maxDate = useMemo(() => parseISODate(max), [max]);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  // Estados para edición manual (NO se aplican automáticamente)
  const [editingDay, setEditingDay] = useState('');
  const [editingMonth, setEditingMonth] = useState('');
  const [editingYear, setEditingYear] = useState('');

  useEffect(() => {
    if (open) {
      setViewDate(selectedDate || new Date());
      // Inicializar campos de edición cuando se abre el modal
      if (selectedDate) {
        setEditingDay(selectedDate.getDate().toString());
        setEditingMonth((selectedDate.getMonth() + 1).toString());
        setEditingYear(selectedDate.getFullYear().toString());
      } else {
        setEditingDay('');
        setEditingMonth('');
        setEditingYear('');
      }
    }
  }, [open, selectedDate]);

  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(viewDate);
  }, [viewDate]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const startDate = new Date(year, month, 1 - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      return {
        date,
        inCurrentMonth: date.getMonth() === month,
      };
    });
  }, [viewDate]);

  const goMonth = (delta) => {
    const next = new Date(viewDate);
    next.setMonth(next.getMonth() + delta);
    setViewDate(next);
  };

  const isDisabledDate = (date) => {
    if (minDate && compareDateOnly(date, minDate) < 0) return true;
    if (maxDate && compareDateOnly(date, maxDate) > 0) return true;
    return false;
  };

  const selectDate = (date) => {
    if (isDisabledDate(date)) return;
    onChange?.(formatISODate(date));
    setOpen(false);
  };

  const clearDate = () => {
    onChange?.('');
  };

  const pickToday = () => {
    const today = new Date();
    if (isDisabledDate(today)) return;
    onChange?.(formatISODate(today));
    setOpen(false);
  };

  // Aplicar cambios editados manualmente
  const isValidEditedDate = () => {
    if (!editingDay || !editingMonth || !editingYear) return false;

    const day = parseInt(editingDay);
    const month = parseInt(editingMonth);
    const year = parseInt(editingYear);

    if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return false;

    const newDate = new Date(year, month - 1, day);
    if (isDisabledDate(newDate)) return false;

    return true;
  };

  const applyEditedDate = () => {
    if (!isValidEditedDate()) return;

    const day = parseInt(editingDay);
    const month = parseInt(editingMonth);
    const year = parseInt(editingYear);

    const newDate = new Date(year, month - 1, day);
    onChange?.(formatISODate(newDate));
    setOpen(false);
  };

  const handleDirectEdit = (field, value) => {
    const newDate = new Date(viewDate);
    const num = parseInt(value) || 0;

    if (field === 'day' && num >= 1 && num <= 31) {
      newDate.setDate(num);
    } else if (field === 'month' && num >= 1 && num <= 12) {
      newDate.setMonth(num - 1);
    } else if (field === 'year' && num >= 1900 && num <= 2100) {
      newDate.setFullYear(num);
    }

    setViewDate(newDate);
  };

  const today = new Date();

  const overlayContent = (
    <div className="rgdp-overlay" role="dialog" aria-modal="true" aria-label="Seleccionar fecha" onClick={() => setOpen(false)}>
      <div className="rgdp-popover rgdp-popover-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rgdp-alert-card">
          <div className="rgdp-modal-titlebar">
            <div className="rgdp-modal-title">
              <i className="fas fa-calendar-alt me-2" />
              Selecciona una fecha
            </div>
            <button type="button" className="btn btn-sm rgdp-close-btn" onClick={() => setOpen(false)}>
              <i className="fas fa-times" />
            </button>
          </div>

          <div className="rgdp-header">
            <button type="button" className="btn btn-sm rgdp-nav-btn" onClick={() => goMonth(-1)}>
              <i className="fas fa-chevron-left" />
            </button>
            <div className="rgdp-month-label text-capitalize">{monthLabel}</div>
            <button type="button" className="btn btn-sm rgdp-nav-btn" onClick={() => goMonth(1)}>
              <i className="fas fa-chevron-right" />
            </button>
          </div>

          <div className="rgdp-edit-date">
            <div className="rgdp-date-input-group">
              <label className="rgdp-date-input-label">Día</label>
              <input
                type="text"
                className="rgdp-date-input"
                placeholder="1-31"
                value={editingDay}
                maxLength="2"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setEditingDay('');
                  } else if (/^\d{1,2}$/.test(val)) {
                    const num = parseInt(val);
                    if (num <= 31) {
                      setEditingDay(val);
                    }
                  }
                }}
              />
            </div>
            <div className="rgdp-date-input-group">
              <label className="rgdp-date-input-label">Mes</label>
              <input
                type="text"
                className="rgdp-date-input"
                placeholder="1-12"
                value={editingMonth}
                maxLength="2"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setEditingMonth('');
                  } else if (/^\d{1,2}$/.test(val)) {
                    const num = parseInt(val);
                    if (num <= 12) {
                      setEditingMonth(val);
                    }
                  }
                }}
              />
            </div>
            <div className="rgdp-date-input-group">
              <label className="rgdp-date-input-label">Año</label>
              <input
                type="text"
                className="rgdp-date-input"
                placeholder="1900-2100"
                value={editingYear}
                maxLength="4"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setEditingYear('');
                  } else if (/^\d{1,4}$/.test(val)) {
                    const num = parseInt(val, 10);
                    const isCompleteYear = val.length === 4;
                    if (!isCompleteYear || (num >= 1900 && num <= 2100)) {
                      setEditingYear(val);
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="rgdp-body">
            <div className="rgdp-weekdays">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="rgdp-weekday">
                  {day}
                </div>
              ))}
            </div>

            <div className="rgdp-grid">
              {calendarDays.map(({ date, inCurrentMonth }) => {
                const selected = selectedDate ? isSameDay(date, selectedDate) : false;
                const isToday = isSameDay(date, today);
                const isDisabled = isDisabledDate(date);

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    className={`rgdp-day ${inCurrentMonth ? '' : 'rgdp-day-muted'} ${selected ? 'rgdp-day-selected' : ''} ${isToday ? 'rgdp-day-today' : ''} ${isDisabled ? 'rgdp-day-disabled' : ''}`}
                    disabled={isDisabled}
                    onClick={() => selectDate(date)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rgdp-footer">
            <button type="button" className="rgdp-footer-btn" onClick={clearDate}>
              Borrar
            </button>
            <button type="button" className="rgdp-footer-btn rgdp-footer-btn-primary" onClick={applyEditedDate} disabled={!isValidEditedDate()}>
              Aceptar
            </button>
            <button type="button" className="rgdp-footer-btn" onClick={() => setOpen(false)}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className={`rgdp ${className}`} style={style}>
      <button
        type="button"
        className={`form-control rgdp-input ${inputClassName}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className={selectedDate ? 'rgdp-value' : 'rgdp-placeholder'}>
          {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
        </span>
        <i className="fas fa-calendar-alt rgdp-input-icon" />
      </button>

      {required && <input type="text" value={value || ''} onChange={() => {}} required className="rgdp-required-proxy" />}

      {open && typeof document !== 'undefined' ? createPortal(overlayContent, document.body) : null}
    </div>
  );
}
