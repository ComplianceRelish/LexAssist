import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import RegisterModal from './RegisterModal';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const location = useLocation();

  // Check if there's a register=true flag in URL when component mounts
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('register') === 'true') {
      setShowRegisterModal(true);
    }
  }, [location]);

  const handleRegisterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowRegisterModal(true);
  };

  const handleRegistrationSuccess = () => {
    // Handle successful registration
    console.log("Registration successful!");
  };

  return (
    <div className="landing-container">
      {/* Hero Section - Entry Page */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="logo-wrapper">
            <img 
              src="/images/logo.png" 
              alt="LexAssist Logo"
              className="hero-logo"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = '/favicon.png';
              }}
            />
          </div>
          <div className="hero-text">
            <h1>Welcome to <span className="brand-name">LexAssist</span></h1>
            <p className="tagline">Your AI-powered legal Assistant</p>
          </div>
          <div className="hero-actions">
            <Link to="/login" className="btn-primary">Log In</Link>
            <a href="#" onClick={handleRegisterClick} className="btn-secondary">Create Account</a>
          </div>
        </div>
      </section>

      {/* Register Modal */}
      <RegisterModal 
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={handleRegistrationSuccess}
      />

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Why Choose LexAssist?</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div className="feature-card" key={index}>
              <div className="feature-icon">{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        <h2 className="section-title">Trusted by Legal Professionals</h2>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div className="testimonial-card" key={index}>
              <p className="testimonial-text">"{testimonial.quote}"</p>
              <p className="testimonial-author">{testimonial.author}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          {footerLinks.map((column, index) => (
            <div className="footer-column" key={index}>
              <h4>{column.title}</h4>
              {column.links.map((link, i) => (
                <Link to={link.path} key={i}>{link.label}</Link>
              ))}
            </div>
          ))}
        </div>
        <div className="footer-copyright">
          <p>&copy; {new Date().getFullYear()} LexAssist. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

// Features data
const features = [
  {
    icon: '⚖️',
    title: 'Legal Research',
    description: 'Instantly find relevant case law and precedents'
  },
  {
    icon: '📝',
    title: 'Brief Analysis',
    description: 'Get AI-powered insights on your legal briefs'
  },
  {
    icon: '⏱️',
    title: 'Save Time',
    description: 'Reduce research time by up to 70%'
  },
  {
    icon: '📊',
    title: 'Case Predictions',
    description: 'Statistical analysis of similar case outcomes'
  }
];

// Testimonials data
const testimonials = [
  {
    quote: "LexAssist has revolutionized how I prepare for cases. The time savings alone has been worth every rupee.",
    author: "— Rajesh Sharma, Senior Advocate"
  },
  {
    quote: "The case prediction feature helped me set realistic expectations with my clients. An indispensable tool.",
    author: "— Priya Patel, Corporate Counsel"
  }
];

// Footer links data
const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Features', path: '/features' },
      { label: 'Pricing', path: '/pricing' },
      { label: 'Case Studies', path: '/case-studies' }
    ]
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', path: '/about' },
      { label: 'Careers', path: '/careers' },
      { label: 'Contact', path: '/contact' }
    ]
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog', path: '/blog' },
      { label: 'Help Center', path: '/help' },
      { label: 'API', path: '/api' }
    ]
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', path: '/terms' },
      { label: 'Privacy Policy', path: '/privacy' }
    ]
  }
];

export default LandingPage;
