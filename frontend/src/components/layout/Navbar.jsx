import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import './Navbar.css';
import rapidLogo from '../../assets/new-rapid-logo.png';

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
];

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const user = useAuthStore((state) => state.user);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > lastY.current && y > 80);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`navbar-wrapper ${hidden ? 'navbar-wrapper--hidden' : ''}`}>
      <div className="navbar">

        <Link to="/" className="navbar-logo" style={{ display: 'flex', alignItems: 'center' }}>
          <img src={rapidLogo} alt="RAPID" style={{ height: '30px', objectFit: 'contain' }} />
        </Link>

        <ul className="navbar-links">
          {LINKS.map((item) => (
            <li key={item.label}>
              <a 
                href={item.href} 
                onClick={(e) => handleLinkClick(e, item.href)}
                className="navbar-link"
              >
                <span className="navbar-link-inner">
                  <span className="navbar-link-top">{item.label}</span>
                  <span className="navbar-link-bottom">{item.label}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        {user ? (
          <Link to="/dashboard" className="navbar-cta-link">
            <button className="navbar-cta">
              <span className="navbar-cta-arrow-enter">
                <ArrowRight className="navbar-cta-icon" />
              </span>
              <span className="navbar-cta-arrow-wrap">
                <span className="navbar-cta-arrow-exit">
                  <ArrowRight className="navbar-cta-icon" />
                </span>
                Dashboard
              </span>
            </button>
          </Link>
        ) : (
          <Link to="/signup" className="navbar-cta-link">
            <button className="navbar-cta">
              <span className="navbar-cta-arrow-enter">
                <ArrowRight className="navbar-cta-icon" />
              </span>
              <span className="navbar-cta-arrow-wrap">
                <span className="navbar-cta-arrow-exit">
                  <ArrowRight className="navbar-cta-icon" />
                </span>
                Get Started
              </span>
            </button>
          </Link>
        )}

      </div>
    </nav>
  );
}
