import React from 'react';
import './HowItWorks.css';
import hiv1 from '../../assets/hiv1.png';
import hiv2 from '../../assets/hiv2.png';
import hiv3 from '../../assets/hiv3.png';
import { useInView } from '../../hooks/useInView';

const STEPS = [
  {
    num: '01',
    label: 'Quick onboarding',
    headingStatic: 'Set up your company in',
    headingItalic: 'minutes',
    desc: 'Register your tenant, invite your team with role-based access, and configure your product catalog, vendors, and work centers before your first order.',
    img: hiv1,
    imgAlt: 'Company onboarding setup illustration',
    flip: false,
  },
  {
    num: '02',
    label: 'Sales & delivery',
    headingStatic: 'Confirm orders, ship',
    headingItalic: 'automatically',
    desc: 'Create a sales order, confirm it to instantly reserve stock, and deliver line items. Low-stock products auto-trigger purchase or manufacturing replenishment.',
    img: hiv3,
    imgAlt: 'Sales order and delivery flow illustration',
    flip: true,
  },
  {
    num: '03',
    label: 'Full supply chain',
    headingStatic: 'Procure, produce,',
    headingItalic: 'track everything',
    desc: 'Receive purchase materials, run manufacturing work orders against your Bill of Materials, and watch the stock ledger update in real time across every movement.',
    img: hiv2,
    imgAlt: 'Supply chain and inventory tracking illustration',
    flip: false,
  },
];

// Split "Simple setup," → ['Simple', 'setup,'] and italic words separately
// Section heading words with staggered delays
const HEADING_STATIC_WORDS = ['Simple', 'workflows,'];
const HEADING_ITALIC_WORDS = ['powerful', 'outcomes'];
const wordDelay = (i) => `${80 + i * 70}ms`;
// After 4 words: 80 + 4*70 = 360ms
const SUBHEADING_DELAY = '380ms';

/** Each card slides up as a whole unit — no animation inside */
const HiwCard = ({ step }) => {
  const [cardRef, inView] = useInView({ threshold: 0.15 });

  return (
    <div
      ref={cardRef}
      className={`hiw__card${step.flip ? ' hiw__card--flip' : ''}${inView ? ' is-visible' : ''}`}
    >
      {/* Image pane — slides up */}
      <div className="hiw__img-pane reveal-card" style={{ '--delay': '0ms' }}>
        <img src={step.img} alt={step.imgAlt} className="hiw__img" draggable="false" />
      </div>

      {/* Content pane — slides up, no inner text animation */}
      <div className="hiw__content reveal-card" style={{ '--delay': '80ms' }}>
        <span className="hiw__num">{step.num}</span>
        <span className="hiw__small-label">{step.label}</span>
        <h3 className="hiw__card-heading">
          {step.headingStatic}{' '}
          <em className="hiw__card-heading-em">{step.headingItalic}</em>
        </h3>
        <p className="hiw__desc">{step.desc}</p>
      </div>
    </div>
  );
};

const HowItWorks = () => {
  const [headerRef, headerInView] = useInView({ threshold: 0.2 });

  return (
    <section className="hiw" id="how-it-works">
      {/* Section header */}
      <div
        ref={headerRef}
        className={`hiw__header-group${headerInView ? ' is-visible' : ''}`}
      >
        {/* "How it works" label — blur reveal */}
        <div className="hiw__label-top">
          <span className="reveal-text" style={{ '--delay': '0ms' }}>How it works</span>
        </div>

        {/* Heading — word-by-word progressive blur reveal */}
        <h2 className="hiw__heading">
          {HEADING_STATIC_WORDS.map((word, i) => (
            <span key={word} className="reveal-text" style={{ '--delay': wordDelay(i) }}>
              {word}{' '}
            </span>
          ))}
          <em className="hiw__heading-em">
            {HEADING_ITALIC_WORDS.map((word, i) => (
              <span
                key={word}
                className="reveal-text"
                style={{ '--delay': wordDelay(HEADING_STATIC_WORDS.length + i) }}
              >
                {word}{' '}
              </span>
            ))}
          </em>
        </h2>

        {/* Subheading — blur reveal after heading */}
        <p className="hiw__subheading reveal-text" style={{ '--delay': SUBHEADING_DELAY }}>
          From your first order to your last delivery — every step is tracked, automated, and audited.
        </p>
      </div>

      {/* Cards — each observed individually, slide up only */}
      <div className="hiw__cards">
        {STEPS.map((step) => (
          <HiwCard key={step.num} step={step} />
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
