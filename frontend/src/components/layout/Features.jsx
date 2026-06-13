import React from 'react';
import feat1 from '../../assets/feat1.png';
import feat2 from '../../assets/feat2.png';
import feat3 from '../../assets/feat3.png';
import feat4 from '../../assets/feat4.png';

export const Features = () => {
  return (
    <section className="features-section">
      <div className="features-header">
        <span className="features-badge">Unique Features</span>
        <h2 className="features-title">
          One Platform. Total Control. <br />
          Built For Operational Excellence
        </h2>
        <p className="features-subtitle">
          Everything your business needs to plan, track, and scale operations efficiently.
        </p>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-img-box">
            <img src={feat1} alt="Unified Metrics" className="feature-img" />
          </div>
          <div className="feature-info">
            <h3 className="feature-card-title">Unified Metrics</h3>
            <p className="feature-card-desc">
              See your MRR and active users in one clean, unified view — no more switching tabs.
            </p>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-img-box">
            <img src={feat2} alt="AI Growth Insights" className="feature-img" />
          </div>
          <div className="feature-info">
            <h3 className="feature-card-title">AI Growth Insights</h3>
            <p className="feature-card-desc">
              Actionable suggestions from your data, without digging into spreadsheets or dashboards.
            </p>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-img-box">
            <img src={feat3} alt="Product Usage Tracking" className="feature-img" />
          </div>
          <div className="feature-info">
            <h3 className="feature-card-title">Product Usage Tracking</h3>
            <p className="feature-card-desc">
              Track how users engage with your app live to uncover patterns and optimize features.
            </p>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-img-box">
            <img src={feat4} alt="Feature Impact Analysis" className="feature-img" />
          </div>
          <div className="feature-info">
            <h3 className="feature-card-title">Feature Impact Analysis</h3>
            <p className="feature-card-desc">
              Know exactly which features drive long-term retention—and which ones don't contribute.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
