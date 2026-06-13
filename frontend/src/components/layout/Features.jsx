import React from 'react';
import feat1 from '../../assets/feat1.png';
import feat2 from '../../assets/feat2.png';
import feat3 from '../../assets/feat3.png';
import feat4 from '../../assets/feat4.png';
import { useInView } from '../../hooks/useInView';

const TITLE_LINE1_STATIC = ['One', 'Platform.'];
const TITLE_LINE1_ORANGE = ['Total', 'Control.'];
const TITLE_LINE2 = ['Built', 'For', 'Operational', 'Excellence.'];

const CARDS = [
  { src: feat1, alt: 'Sales Order Management',   title: 'Sales Order Management',   desc: 'Create, confirm, and deliver sales orders with automatic stock reservation and real-time inventory allocation.' },
  { src: feat2, alt: 'Smart Procurement Engine', title: 'Smart Procurement Engine', desc: 'Auto-trigger Purchase or Manufacturing Orders on demand when stock runs short — zero manual intervention.' },
  { src: feat3, alt: 'Manufacturing & BoM',       title: 'Manufacturing & BoM',       desc: 'Define Bills of Materials with multi-level components, work center routing, and sequence-based production stages.' },
  { src: feat4, alt: 'Live Inventory Ledger',     title: 'Live Inventory Ledger',     desc: 'Every receipt, delivery, and consumption writes to a tamper-proof stock ledger with full movement traceability.' },
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
          Core Features
        </span>

        {/* Title — word-by-word progressive blur reveal, two explicit lines */}
        <h2 className="features-title">
          <span className="features-title-line">
            {TITLE_LINE1_STATIC.map((word, i) => (
              <span
                key={`static-${i}`}
                className="reveal-text"
                style={{ '--delay': wordDelay(i) }}
              >
                {word}{' '}
              </span>
            ))}
            <em>
              {TITLE_LINE1_ORANGE.map((word, i) => (
                <span
                  key={`orange-${i}`}
                  className="reveal-text"
                  style={{ '--delay': wordDelay(TITLE_LINE1_STATIC.length + i) }}
                >
                  {word}{' '}
                </span>
              ))}
            </em>
          </span>
          <span className="features-title-line">
            {TITLE_LINE2.map((word, i) => (
              <span
                key={`line2-${i}`}
                className="reveal-text"
                style={{
                  '--delay': wordDelay(
                    TITLE_LINE1_STATIC.length + TITLE_LINE1_ORANGE.length + i
                  )
                }}
              >
                {word}{' '}
              </span>
            ))}
          </span>
        </h2>

        {/* Subtitle */}
        <p className="features-subtitle reveal-text" style={{ '--delay': SUBTITLE_DELAY }}>
          Everything your business needs to manage products, orders, manufacturing, and inventory — all in one place.
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
