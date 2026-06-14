import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useInView } from '../../hooks/useInView';
import './Footer.css';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
];

export function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [footerRef, inView] = useInView({ threshold: 0.1 });

  const handleLinkClick = (e, href) => {
    const targetId = href.replace('#', '');
    if (location.pathname === '/') {
      e.preventDefault();
      const element = document.getElementById(targetId);
      if (element) {
        if (window.lenis) {
          window.lenis.scrollTo(element);
        } else {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      e.preventDefault();
      navigate(`/?scrollTo=${targetId}`);
    }
  };

  return (
    <footer ref={footerRef} className={`ft-footer ${inView ? 'is-visible' : ''}`}>
      {/* Headline */}
      <h2 className="ft-headline ft-reveal" style={{ '--delay': '0ms' }}>
        Streamline your enterprise operations —<br />
        <span className="ft-gradient">automatically</span>.
      </h2>

      {/* Nav links */}
      <nav className="ft-nav ft-reveal" style={{ '--delay': '150ms' }}>
        {NAV_LINKS.map(l => (
          <a
            key={l.label}
            href={l.href}
            onClick={(e) => handleLinkClick(e, l.href)}
            className="ft-nav-link"
          >
            {l.label}
          </a>
        ))}
        <Link to="/signup" className="ft-nav-link ft-nav-link--cta">Get Started</Link>
      </nav>

      {/* Legal + social row */}
      <div className="ft-bottom-row ft-reveal" style={{ '--delay': '300ms' }}>
        <a href="#" className="ft-legal-link">Terms & Conditions</a>
        <a href="#" className="ft-legal-link">Privacy Policy</a>

        {/* Social icons */}
        <div className="ft-socials">
          {/* Instagram */}
          <a href="#" className="ft-social" aria-label="Instagram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
            </svg>
          </a>
          {/* Twitter / X */}
          <a href="#" className="ft-social" aria-label="Twitter">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          {/* LinkedIn */}
          <a href="#" className="ft-social" aria-label="LinkedIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
              <rect x="2" y="9" width="4" height="12"/>
              <circle cx="4" cy="4" r="2"/>
            </svg>
          </a>
        </div>
      </div>

      {/* Watermark brand name */}
      <div className="ft-watermark ft-watermark-reveal" style={{ '--delay': '450ms' }} aria-hidden="true">RAPID</div>

      {/* Copyright */}
      <p className="ft-copy ft-reveal" style={{ '--delay': '550ms' }}>© {new Date().getFullYear()} Rapid ERP. All rights reserved.</p>
    </footer>
  );
}
