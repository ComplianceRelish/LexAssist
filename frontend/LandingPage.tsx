import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-container">
      <div className="landing-hero">
        <div className="logo-container">
          <img 
            src="/images/logo.png" 
            alt="LexAssist Logo" 
            className="landing-logo"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = '/favicon.png';
            }}
          />
        </div>
        <h1>Welcome to LexAssist</h1>
        <p className="tagline">AI-powered legal research for Indian lawyers</p>
        
        <div className="cta-buttons">
          <Link to="/login" className="primary-button">Log In</Link>
          <Link to="/register" className="secondary-button">Create Account</Link>
        </div>
      </div>
      
      <div className="features-section">
        <h2>Why Choose LexAssist?</h2>
        
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⚖️</div>
            <h3>Legal Research</h3>
            <p>Instantly find relevant case law and precedents</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Brief Analysis</h3>
            <p>Get AI-powered insights on your legal briefs</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">⏱️</div>
            <h3>Save Time</h3>
            <p>Reduce research time by up to 70%</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Case Predictions</h3>
            <p>Statistical analysis of similar case outcomes</p>
          </div>
        </div>
      </div>
      
      <div className="testimonials">
        <h2>Trusted by Legal Professionals</h2>
        
        <div className="testimonial-container">
          <div className="testimonial">
            <p>"LexAssist has revolutionized how I prepare for cases. The time savings alone has been worth every rupee."</p>
            <div className="testimonial-author">— Rajesh Sharma, Senior Advocate</div>
          </div>
          
          <div className="testimonial">
            <p>"The case prediction feature helped me set realistic expectations with my clients. An indispensable tool."</p>
            <div className="testimonial-author">— Priya Patel, Corporate Counsel</div>
          </div>
        </div>
      </div>
      
      <footer className="landing-footer">
        <div className="footer-links">
          <div className="footer-column">
            <h4>Product</h4>
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/case-studies">Case Studies</Link>
          </div>
          
          <div className="footer-column">
            <h4>Company</h4>
            <Link to="/about">About Us</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/contact">Contact</Link>
          </div>
          
          <div className="footer-column">
            <h4>Resources</h4>
            <Link to="/blog">Blog</Link>
            <Link to="/help">Help Center</Link>
            <Link to="/api">API</Link>
          </div>
          
          <div className="footer-column">
            <h4>Legal</h4>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </div>
        </div>
        
        <div className="copyright">
          <p>&copy; {new Date().getFullYear()} LexAssist. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
