import React, { useState, useEffect, useRef } from 'react';
import './TimeInputMMSS.css';

export default function TimeInputMMSS({ value, onChange, placeholder = "00:00", className = "" }) {
  const [min, setMin] = useState('');
  const [sec, setSec] = useState('');

  const minRef = useRef(null);
  const secRef = useRef(null);

  // Sincronizar el valor inicial "12:45"
  useEffect(() => {
    if (value && typeof value === 'string' && value.includes(':')) {
      const parts = value.split(':');
      setMin(parts[0]);
      setSec(parts[1]);
    } else if (!value) {
      setMin('');
      setSec('');
    } else if (!isNaN(value)) {
      setMin(value);
      setSec('');
    }
  }, [value]);

  const emitirCambio = (nuevoMin, nuevoSec) => {
    if (nuevoMin === '' && nuevoSec === '') {
      onChange('');
      return;
    }
    onChange(`${nuevoMin}:${nuevoSec}`);
  };

  const handleBlur = () => {
    if (min === '' && sec === '') return;
    const m = min || '0';
    const s = sec ? sec.padStart(2, '0') : '00';
    if (`${m}:${s}` !== `${min}:${sec}`) {
      onChange(`${m}:${s}`);
    }
  };

  const handleMinChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 3) val = val.slice(0, 3); // Max 999 mins
    setMin(val);
    emitirCambio(val, sec);
    
    // Si escribe dos dígitos (o 3), opcionalmente pasar al siguiente input
    if (val.length >= 2) {
      // Dejamos que el usuario decida si quiere escribir más de 2 dígitos, 
      // pero si queremos auto-salto:
      // secRef.current?.focus();
    }
  };

  const handleMinKeyDown = (e) => {
    if (e.key === 'ArrowRight' && e.target.selectionStart === min.length) {
      secRef.current?.focus();
    }
    if (e.key === ':' || e.key === '.') {
      e.preventDefault();
      secRef.current?.focus();
    }
  };

  const handleSecChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(0, 2);
    // Limit seconds to 59
    if (parseInt(val) > 59) val = '59';
    
    setSec(val);
    emitirCambio(min, val);
  };

  const handleSecKeyDown = (e) => {
    if (e.key === 'Backspace' && sec === '') {
      minRef.current?.focus();
    }
    if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) {
      minRef.current?.focus();
    }
  };

  return (
    <div className={`time-input-mmss-container ${className}`}>
      <input
        ref={minRef}
        type="tel" // Abre teclado numérico en móviles
        className="time-input-part time-input-min"
        placeholder="MM"
        value={min}
        onChange={handleMinChange}
        onKeyDown={handleMinKeyDown}
        onBlur={handleBlur}
        onClick={(e) => e.stopPropagation()}
      />
      <span className="time-input-separator">:</span>
      <input
        ref={secRef}
        type="tel"
        className="time-input-part time-input-sec"
        placeholder="SS"
        value={sec}
        onChange={handleSecChange}
        onKeyDown={handleSecKeyDown}
        onBlur={handleBlur}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
