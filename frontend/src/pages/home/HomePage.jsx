import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import dbHero from '../../assets/dbHero.png';
import logo1 from '../../assets/heroLogo1.png';
import logo2 from '../../assets/heroLogo2.png';
import logo3 from '../../assets/heroLogo3.png';
import logo4 from '../../assets/heroLogo4.png';
import logo5 from '../../assets/heroLogo5.png';
import logo6 from '../../assets/heroLogo6.png';
import logo7 from '../../assets/heroLogo7.png';
import logo8 from '../../assets/heroLogo8.png';
import logo9 from '../../assets/heroLogo9.png';
import logo10 from '../../assets/heroLogo10.png';
import { Features } from '../../components/layout/Features';
import { CreditCard } from 'lucide-react';
import './HomePage.css';

const LOGO_IMAGES = [logo1, logo2, logo3, logo4, logo5, logo6, logo7, logo8, logo9, logo10];

const INITIAL_LOGOS_CONFIG = [
  // Left side logos (strictly bounded to outer edges of the hero grid)
  { id: 1, baseLeft: 2, baseTop: 10, depth: 0.12, size: 98 },
  { id: 2, baseLeft: 22, baseTop: 25, depth: 0.22, size: 90 },
  { id: 3, baseLeft: 4, baseTop: 45, depth: 0.18, size: 102 },
  { id: 4, baseLeft: 18, baseTop: 65, depth: 0.28, size: 94 },
  { id: 5, baseLeft: 2, baseTop: 85, depth: 0.15, size: 100 },
  
  // Right side logos (strictly bounded to outer edges of the hero grid)
  { id: 6, baseRight: 2, baseTop: 10, depth: 0.18, size: 92 },
  { id: 7, baseRight: 22, baseTop: 25, depth: 0.12, size: 102 },
  { id: 8, baseRight: 4, baseTop: 45, depth: 0.25, size: 88 },
  { id: 9, baseRight: 8, baseTop: 65, depth: 0.2, size: 104 },
  { id: 10, baseRight: 2, baseTop: 85, depth: 0.15, size: 96 },
];

const HomePage = () => {
  const navigate = useNavigate();
  const imageContainerRef = useRef(null);
  const [logoItems, setLogoItems] = useState([]);

  useEffect(() => {
    const randomized = INITIAL_LOGOS_CONFIG.map((item, index) => {
      const offsetX = (Math.random() - 0.5) * 8; // -4% to 4%
      const offsetY = (Math.random() - 0.5) * 8; // -4% to 4%
      const rotation = (Math.random() - 0.5) * 20; // -10deg to 10deg
      const floatDuration = 5 + Math.random() * 5; // 5s to 10s
      const floatDelay = Math.random() * -8; // negative delay to start at random positions
      const animationName = `floatWander${(index % 4) + 1}`;

      return {
        ...item,
        imgSrc: LOGO_IMAGES[index % LOGO_IMAGES.length],
        left: item.baseLeft !== undefined ? `${item.baseLeft + offsetX}%` : undefined,
        right: item.baseRight !== undefined ? `${item.baseRight + offsetX}%` : undefined,
        top: `${item.baseTop + offsetY}%`,
        rotation,
        floatDuration,
        floatDelay,
        animationName,
      };
    });
    setLogoItems(randomized);
  }, []);

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
        {/* Floating Partner/Brand Logos (randomized and interactive parallax) */}
        <div className="floating-logos-container" style={{ display: 'none' }}>
          {logoItems.map((logo) => (
            <div
              key={logo.id}
              className="floating-logo-outer"
              style={{
                left: logo.left,
                right: logo.right,
                top: logo.top,
                animationName: logo.animationName,
                animationDuration: `${logo.floatDuration}s`,
                animationDelay: `${logo.floatDelay}s`,
              }}
            >
              <div
                className="floating-logo-inner"
                style={{
                  width: `${logo.size}px`,
                  height: `${logo.size}px`,
                  transform: `rotate(${logo.rotation}deg)`,
                }}
              >
                <img src={logo.imgSrc} alt={`Brand logo ${logo.id}`} className="floating-logo-img" />
              </div>
            </div>
          ))}
        </div>

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
            Boost Business Efficiency <br />
            with our <span className="highlight-text">ERP solutions</span>
          </h1>

          {/* Subtitle */}
          <p className="hero-subtitle">
            Monitor every movement across your business—<br />
            from purchase orders to product delivery.
          </p>

          {/* CTA Group */}
          <div className="hero-cta-group">
            <button className="hero-cta-btn" onClick={() => navigate('/signup')}>
              Get Started For Free
            </button>
            <span className="hero-subtext">
              <CreditCard size={14} style={{ color: '#FF540E', strokeWidth: 2 }} />
              No credit card required
            </span>
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
    </div>
  );
};

export default HomePage;
