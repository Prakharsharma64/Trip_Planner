import { Link } from 'react-router-dom';

export function Landing() {
  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <h1>India Trip Planner</h1>
          <p className="hero-sub">Discover 159 destinations across India</p>
          <p className="hero-meta">Build your bucket list • Filter by budget • Explore by state</p>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-num">159</span>
              <span className="hero-stat-lbl">Destinations</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">36</span>
              <span className="hero-stat-lbl">States & UTs</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">∞</span>
              <span className="hero-stat-lbl">Adventures</span>
            </div>
          </div>
          <div className="hero-cta">
            <Link to="/login" className="btn-print">Login</Link>
            <Link to="/destinations" className="btn-outline">Browse Destinations</Link>
          </div>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-features-inner">
          <h2>Plan your Indian adventure</h2>
          <p className="landing-features-lead">Curated destinations from the Himalayas to Kerala. Filter by budget, explore by state, and build the trip you've always dreamed of.</p>
          <div className="landing-feature-grid">
            <div className="landing-feature">
              <span className="landing-feature-icon">📍</span>
              <h3>Browse by state</h3>
              <p>36 states and UTs. From Rajasthan's deserts to Goa's beaches, find your next escape.</p>
            </div>
            <div className="landing-feature">
              <span className="landing-feature-icon">₹</span>
              <h3>Budget filters</h3>
              <p>Budget (&lt;₹5k), Mid-range, or Luxury. Set a max budget and get tailored suggestions.</p>
            </div>
            <div className="landing-feature">
              <span className="landing-feature-icon">✓</span>
              <h3>Your bucket list</h3>
              <p>Save places you want to visit. Mark them visited when you go. Track your journey.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-cta-inner">
          <h2>Ready to explore?</h2>
          <p>Sign in to start building your India bucket list.</p>
          <Link to="/login" className="btn-print">Get started</Link>
        </div>
      </section>
    </>
  );
}
