import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import dbHero from '../../assets/dbHero.png';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const imageContainerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!imageContainerRef.current) return;
      
      const scrollY = window.scrollY;
      const maxScroll = 500; // Animation completes over 500px of scrolling
      const progress = Math.min(scrollY / maxScroll, 1);
      
      // Interpolation values:
      // At scroll 0: rotateX = 8deg, scale = 0.96, translateZ = -20px, translateY = -20px
      // At scroll 500: rotateX = 0deg, scale = 1.0, translateZ = 0px, translateY = 0px
      const rotateX = 8 * (1 - progress);
      const scale = 0.96 + 0.04 * progress;
      const translateZ = -20 * (1 - progress);
      const translateY = -20 * (1 - progress);
      
      imageContainerRef.current.style.transform = `perspective(1200px) rotateX(${rotateX}deg) translateY(${translateY}px) scale(${scale}) translateZ(${translateZ}px)`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once initially
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="landing-container">
      <Navbar />
      
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          {/* Trusted Badge */}
          <div className="trusted-badge">
            <div className="avatar-group">
              <div className="avatar avatar-1"></div>
              <div className="avatar avatar-2"></div>
              <div className="avatar avatar-3"></div>
            </div>
            <span className="trusted-text">10+ companies registered</span>
          </div>

          {/* Heading */}
          <h1 className="hero-title">
            Turn Scattered Data <br />
            Into <span className="highlight-text">Smart Decisions</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle">
            One simple dashboard to track your SaaS growth,<br />
            MRR, churn and user behavior—without the chaos.
          </p>

          {/* CTA Group */}
          <div className="hero-cta-group">
            <button className="hero-cta-btn" onClick={() => navigate('/signup')}>
              Get Started For Free
            </button>
            <span className="hero-subtext">💳 No credit card required</span>
          </div>

          {/* Floating Cards/Icons (rotated and animated) */}
          <div className="floater floater-lt">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="floater floater-lb">
            <svg viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="2.5">
              <rect x="3" y="3" width="7" height="9" />
              <rect x="14" y="3" width="7" height="5" />
              <rect x="14" y="12" width="7" height="9" />
              <rect x="3" y="16" width="7" height="5" />
            </svg>
          </div>
          <div className="floater floater-rt">
            <svg viewBox="0 0 24 24" fill="none" stroke="#FF540E" strokeWidth="2.5">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </div>
          <div className="floater floater-rb">
            <svg viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5">
              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l-7 4a2 2 0 002 0l7-4a2 2 0 001-1.73z" />
            </svg>
          </div>
        </div>

        {/* Dashboard Showcase Image with X-Axis perspective rotation */}
        <div className="hero-image-wrapper">
          <div ref={imageContainerRef} className="hero-image-container">
            <img src={dbHero} alt="Dashboard Analytics Preview" className="hero-dashboard-img" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
