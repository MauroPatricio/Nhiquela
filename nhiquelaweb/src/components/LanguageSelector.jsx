import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactCountryFlag from 'react-country-flag';

export default function LanguageSelector({ variant = 'dark' }) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language ? i18n.language.substring(0, 2).toLowerCase() : 'pt';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    setIsOpen(false);
  };

  const isDark = variant === 'dark';

  return (
    <div className="position-relative d-inline-block" ref={dropdownRef}>
      <button
        className={`btn btn-sm rounded-pill px-2.5 py-1 fw-bold d-flex align-items-center gap-1.5 border-0 ${
          isDark ? 'text-slate-300' : 'text-dark'
        }`}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.06)',
          color: isDark ? '#E2E8F0' : '#0F172A',
          fontSize: '0.78rem',
          cursor: 'pointer'
        }}
      >
        {currentLang === 'en' ? (
          <>
            <ReactCountryFlag countryCode="GB" svg style={{ width: '1.2em', height: '1.2em', borderRadius: '2px' }} title="English" />
            <span>EN</span>
          </>
        ) : (
          <>
            <ReactCountryFlag countryCode="MZ" svg style={{ width: '1.2em', height: '1.2em', borderRadius: '2px' }} title="Português" />
            <span>PT</span>
          </>
        )}
        <span style={{ fontSize: '0.65rem', opacity: 0.8, marginLeft: '2px' }}>▼</span>
      </button>

      {isOpen && (
        <div
          className="shadow border-0 rounded-3 py-1 position-absolute end-0 mt-1"
          style={{
            minWidth: '135px',
            fontSize: '0.82rem',
            zIndex: 1070,
            backgroundColor: '#FFFFFF',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
          }}
        >
          <button
            type="button"
            className={`w-100 text-start btn btn-link text-decoration-none d-flex align-items-center gap-2 py-1.5 px-3 fw-semibold ${
              currentLang === 'pt' ? 'bg-primary-custom text-white' : 'text-dark'
            }`}
            style={{ borderRadius: 0, fontSize: '0.8rem' }}
            onClick={() => changeLanguage('pt')}
          >
            <ReactCountryFlag countryCode="MZ" svg style={{ width: '1.2em', height: '1.2em' }} />
            <span>PT (Português)</span>
          </button>
          <button
            type="button"
            className={`w-100 text-start btn btn-link text-decoration-none d-flex align-items-center gap-2 py-1.5 px-3 fw-semibold ${
              currentLang === 'en' ? 'bg-primary-custom text-white' : 'text-dark'
            }`}
            style={{ borderRadius: 0, fontSize: '0.8rem' }}
            onClick={() => changeLanguage('en')}
          >
            <ReactCountryFlag countryCode="GB" svg style={{ width: '1.2em', height: '1.2em' }} />
            <span>EN (English)</span>
          </button>
        </div>
      )}
    </div>
  );
}
