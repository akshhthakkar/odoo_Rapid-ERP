import React from 'react';
import feat1 from '../../assets/feat1.png';
import feat2 from '../../assets/feat2.png';
import feat3 from '../../assets/feat3.png';
import feat4 from '../../assets/feat4.png';
import { useInView } from '../../hooks/useInView';

const TITLE_WORDS = [
  'One', 'Platform.', 'Total', 'Control.',
  'Built', 'For', 'Operational', 'Excellence',
];

const CARDS = [
  { src: feat1, alt: 'Unified Metrics',        title: 'Unified Metrics',        desc: 'See your MRR and active users in one clean, unified view — no more switching tabs.' },
  { src: feat2, alt: 'AI Growth Insights',      title: 'AI Growth Insights',      desc: 'Actionable suggestions from your data, without digging into spreadsheets or dashboards.' },
  { src: feat3, alt: 'Product Usage Tracking',  title: 'Product Usage Tracking',  desc: 'Track how users engage with your app live to uncover patterns and optimize features.' },
  { src: feat4, alt: 'Feature Impact Analysis', title: 'Feature Impact Analysis', desc: "Know exactly which features drive long-term retention—and which ones don't contribute." },
];

// Word delay: starts at 100ms, +60ms per word
const wordDelay = (i) => `${100 + i * 60}ms`;
// After all title words: 100 + 8*60 = 580ms
const SUBTITLE_DELAY = '600ms';
const CARD_BASE_DELAY = 700;

export const Features = () => {
  const [sectionRef, inView] = useInView({ threshold: 0.1 });

  return (
    <section
      ref={sectionRef}
      className={`features-section${inView ? ' is-visible' : ''}`}
    >
      <div className="features-header">
        {/* Badge */}
        <span className="features-badge reveal-text" style={{ '--delay': '0ms' }}>
          Unique Features
        </span>

        {/* Title — word-by-word progressive blur reveal */}
        <h2 className="features-title">
          {TITLE_WORDS.map((word, i) => (
            <span
              key={i}
              className="reveal-text"
              style={{ '--delay': wordDelay(i) }}
            >
              {word}{' '}
            </span>
          ))}
        </h2>

        {/* Subtitle */}
        <p className="features-subtitle reveal-text" style={{ '--delay': SUBTITLE_DELAY }}>
          Everything your business needs to plan, track, and scale operations efficiently.
        </p>
      </div>

      {/* Cards — slide up only, no animation on inner text */}
      <div className="features-grid">
        {CARDS.map((card, i) => (
          <div
            key={card.title}
            className="feature-card reveal-card"
            style={{ '--delay': `${CARD_BASE_DELAY + i * 100}ms` }}
          >
            <div className="feature-img-box">
              <img src={card.src} alt={card.alt} className="feature-img" />
            </div>
            <div className="feature-info">
              <h3 className="feature-card-title">{card.title}</h3>
              <p className="feature-card-desc">{card.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
