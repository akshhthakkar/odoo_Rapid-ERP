import React, { useState } from 'react';
import { useInView } from '../../hooks/useInView';
import './FAQ.css';

const FAQS = [
  {
    q: 'What is Rapid ERP?',
    qWords: ['What', 'is', 'Rapid', 'ERP?'],
    a: 'Rapid ERP is a next-generation enterprise resource planning platform that combines sales, procurement, manufacturing, and inventory tracking in one unified workspace.',
  },
  {
    q: 'How does the smart procurement engine work?',
    a: 'When product stock falls below your designated reorder levels, the system automatically triggers purchase or manufacturing orders to keep operations running smoothly with zero manual intervention.',
  },
  {
    q: 'Can I manage multiple warehouses?',
    a: 'Yes. Rapid ERP supports multi-warehouse control, allowing you to track stock, transfer materials between locations, and review detailed movement logs in a live inventory ledger.',
  },
  {
    q: 'Does the system support multi-tenancy?',
    a: 'Yes. Every organization operates within a secure, isolated tenant container with strict data privacy, JWT authentication, and role-based access controls.',
  },
  {
    q: 'Is there a limit on the number of products or transactions?',
    a: 'No. The platform is built with database-level pagination and optimized queries to handle high-density datasets with thousands of products and transactions seamlessly.',
  },
  {
    q: 'Can I customize roles and permissions?',
    a: 'Yes. Users can be configured with specific roles such as Administrator, Inventory Manager, and standard Business roles, ensuring they only see features relevant to their workflow.',
  },
];

const HEADING_STATIC_WORDS = ['Frequently', 'asked'];
const HEADING_ITALIC_WORDS = ['questions'];
const wordDelay = (i) => `${80 + i * 70}ms`;
const SUBHEADING_DELAY = '240ms';

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);
  const [sectionRef, inView] = useInView({ threshold: 0.15 });

  const toggle = (i) => {
    setOpenIndex(prev => prev === i ? null : i);
  };

  return (
    <section ref={sectionRef} className={`faq${inView ? ' is-visible' : ''}`} id="faq">
      <div className="faq__label-top">
        <span className="reveal-text" style={{ '--delay': '0ms' }}>Everything explained</span>
      </div>
      
      <div className="faq__inner">
        <div className="faq__header">
          <h2 className="faq__title">
            {HEADING_STATIC_WORDS.map((word, i) => (
              <span key={word} className="reveal-text" style={{ '--delay': wordDelay(i) }}>
                {word}{' '}
              </span>
            ))}
            <em className="faq__title-em">
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
          <p className="faq__sub reveal-text" style={{ '--delay': SUBHEADING_DELAY }}>
            Everything you need to know about Rapid ERP.<br />
            Can't find an answer? <a href="/contact">Talk to our team.</a>
          </p>
        </div>

        <div className="faq__list reveal-card" style={{ '--delay': '300ms' }}>
          {FAQS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`faq__item ${isOpen ? 'faq__item--open' : ''}`}
              >
                <button
                  className="faq__question"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                >
                  <span className="faq__question-text">{item.q}</span>
                  <span className="faq__icon" aria-hidden="true">
                    {isOpen ? (
                      /* minus */
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <circle cx="9" cy="9" r="8.5" stroke="currentColor" strokeWidth="1"/>
                        <path d="M5.5 9h7" stroke="currentColor" strokeWidth="1.4"
                          strokeLinecap="round"/>
                      </svg>
                    ) : (
                      /* plus */
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <circle cx="9" cy="9" r="8.5" stroke="currentColor" strokeWidth="1"/>
                        <path d="M9 5.5v7M5.5 9h7" stroke="currentColor" strokeWidth="1.4"
                          strokeLinecap="round"/>
                      </svg>
                    )}
                  </span>
                </button>

                <div className="faq__answer-wrap">
                  <div className="faq__answer">
                    <p>{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
