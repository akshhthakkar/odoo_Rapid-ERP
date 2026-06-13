import React from 'react';
import './HowItWorks.css';
import hiv1 from '../../assets/hiv1.png';
import hiv2 from '../../assets/hiv2.png';
import hiv3 from '../../assets/hiv3.png';

const STEPS = [
  {
    num: '01',
    label: 'One-line setup',
    headingStatic: 'Install ChatFrame in',
    headingItalic: 'minutes',
    desc: 'Add a single script to your product and instantly enable AI-powered customer support across your platform.',
    img: hiv1,
    imgAlt: 'Script installation illustration',
    flip: false,
  },
  {
    num: '02',
    label: 'AI automation',
    headingStatic: 'Let AI handle',
    headingItalic: 'repetitive support',
    desc: 'ChatFrame automatically responds to common customer queries, resolves repetitive tickets, and assists your team in real time.',
    img: hiv3,
    imgAlt: 'AI working illustration',
    flip: true,
  },
  {
    num: '03',
    label: 'Unified workspace',
    headingStatic: 'Manage support from',
    headingItalic: 'one place',
    desc: 'Track conversations, monitor team performance, and manage customer support operations through a single unified dashboard.',
    img: hiv2,
    imgAlt: 'Workspace and insights illustration',
    flip: false,
  },
];

const HowItWorks = () => (
  <section className="hiw" id="how-it-works">
    <div className="hiw__label-top">
      <span>How it works</span>
    </div>
    
    <h2 className="hiw__heading">
      Simple setup, <em className="hiw__heading-em">powerful results</em>
    </h2>
    <p className="hiw__subheading">
      Get ChatFrame running in minutes, not hours
    </p>
    
    <div className="hiw__cards">
      {STEPS.map((step) => (
        <div
          key={step.num}
          className={`hiw__card${step.flip ? ' hiw__card--flip' : ''}`}
        >
          <div className="hiw__img-pane">
            <img
              src={step.img}
              alt={step.imgAlt}
              className="hiw__img"
              draggable="false"
            />
          </div>
          <div className="hiw__content">
            <span className="hiw__num">{step.num}</span>
            <span className="hiw__small-label">{step.label}</span>
            <h3 className="hiw__card-heading">
              {step.headingStatic}{' '}
              <em className="hiw__card-heading-em">{step.headingItalic}</em>
            </h3>
            <p className="hiw__desc">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default HowItWorks;
