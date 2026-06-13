import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import dbHero from '../../assets/dbHero.png';

import { Features } from '../../components/layout/Features';
import HowItWorks from '../../components/layout/HowItWorks';
import { CreditCard } from 'lucide-react';
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
      
      // Smooth easing function for more fluid transition
      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);
      
      // Interpolation values with easing:
      // At scroll 0: rotateX = 8deg, scale = 0.96, translateZ = -20px, translateY = -20px
      // At scroll 500: rotateX = 0deg, scale = 1.0, translateZ = 0px, translateY = 0px
      const rotateX = 8 * (1 - easedProgress);
      const scale = 0.96 + 0.04 * easedProgress;
      const translateZ = -20 * (1 - easedProgress);
      const translateY = -20 * (1 - easedProgress);
      
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
          <div className="slide-up" style={{ '--slide-delay': '0ms' }}>
            <div className="trusted-badge">
              <span className="trusted-text">10+ companies registered</span>
            </div>
          </div>

          {/* Heading — word-by-word left-to-right blur reveal */}
          <h1 className="hero-title">
            {['Boost', 'Business', 'Efficiency'].map((word, i) => (
              <span
                key={word}
                className="word-blur-reveal"
                style={{ '--word-delay': `${80 + i * 80}ms` }}
              >
                {word}{' '}
              </span>
            ))}
            <br />
            {['with', 'our'].map((word, i) => (
              <span
                key={word}
                className="word-blur-reveal"
                style={{ '--word-delay': `${320 + i * 80}ms` }}
              >
                {word}{' '}
              </span>
            ))}
            <span
              className="highlight-text word-blur-reveal"
              style={{ '--word-delay': '480ms' }}
            >
              ERP{' '}
            </span>
            <span
              className="highlight-text word-blur-reveal"
              style={{ '--word-delay': '560ms' }}
            >
              solutions
            </span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle blur-reveal" style={{ '--blur-delay': '680ms' }}>
            Monitor every movement across your business—<br />
            from purchase orders to product delivery.
          </p>

          {/* CTA Group */}
          <div className="hero-cta-group">
            <div className="slide-up" style={{ '--slide-delay': '820ms' }}>
              <button className="hero-cta-btn" onClick={() => navigate('/signup')}>
                Get Started For Free
              </button>
            </div>
            <div className="slide-up" style={{ '--slide-delay': '940ms' }}>
              <span className="hero-subtext">
                <CreditCard size={14} style={{ color: '#FF540E', strokeWidth: 2 }} />
                No credit card required
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard Showcase Image with X-Axis perspective rotation */}
        <div className="hero-image-wrapper">
          <div ref={imageContainerRef} className="hero-image-container">
            <img src={dbHero} alt="Dashboard Analytics Preview" className="hero-dashboard-img" />
          </div>
        </div>
      </section>

      {/* Unique Features Section */}
      <Features />
      
      {/* How It Works Section */}
      <HowItWorks />
    </div>
  );
};

export default HomePage;
