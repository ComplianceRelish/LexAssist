import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SubscriptionPlans.css';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  currency: string;
  features: string[];
  buttonText: string;
  popular?: boolean;
}

interface SubscriptionPlansProps {
  subscription: {
    tier: string;
    status: string;
  } | null;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ subscription }) => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(subscription?.tier || null);
  
  const plans: SubscriptionPlan[] = [
    {
      id: 'free',
      name: 'Free',
      price: '0',
      currency: '₹',
      features: [
        'Basic case brief analysis',
        'Limited law section results (5)',
        'Limited case history results (5)',
        'Basic document generation (PDF only)',
        'Limited searches per day (10)'
      ],
      buttonText: subscription?.tier === 'free' ? 'Current Plan' : 'Select Plan'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '499',
      currency: '₹',
      features: [
        'Advanced case brief analysis',
        'Comprehensive law section results (20)',
        'Comprehensive case history results (20)',
        'Document generation in all formats',
        'Basic case file drafting',
        'Email and WhatsApp sharing',
        'Increased searches per day (50)',
        'Priority processing'
      ],
      buttonText: subscription?.tier === 'pro' ? 'Current Plan' : 'Select Plan',
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '4999',
      currency: '₹',
      features: [
        'All Pro tier features',
        'Unlimited law section results',
        'Unlimited case history results',
        'Advanced case file drafting',
        'Custom document templates',
        'API access for integration',
        'Unlimited searches',
        'Dedicated support',
        'Team collaboration features'
      ],
      buttonText: subscription?.tier === 'enterprise' ? 'Current Plan' : 'Select Plan'
    }
  ];
  
  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    
    // If user is selecting their current plan, do nothing
    if (subscription?.tier === planId) {
      return;
    }
    
    // Navigate to checkout or confirmation page
    navigate(`/checkout/${planId}`);
  };
  
  return (
    <div className="subscription-plans-container">
      <h1 className="subscription-title">Choose Your Plan</h1>
      <p className="subscription-subtitle">Select the plan that best fits your needs</p>
      
      <div className="plans-grid">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`plan-card ${plan.popular ? 'popular' : ''} ${selectedPlan === plan.id ? 'selected' : ''}`}
          >
            {plan.popular && <div className="popular-badge">Most Popular</div>}
            
            <h2 className="plan-name">{plan.name}</h2>
            <div className="plan-price">
              <span className="currency">{plan.currency}</span>
              <span className="amount">{plan.price}</span>
              {plan.price !== '0' && <span className="period">/month</span>}
            </div>
            
            <ul className="features-list">
              {plan.features.map((feature, index) => (
                <li key={index} className="feature-item">
                  <span className="feature-icon">✓</span>
                  <span className="feature-text">{feature}</span>
                </li>
              ))}
            </ul>
            
            <button 
              className={`plan-button ${subscription?.tier === plan.id ? 'current' : ''}`}
              onClick={() => handleSelectPlan(plan.id)}
              disabled={subscription?.tier === plan.id}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>
      
      <div className="subscription-info">
        <p>All plans include:</p>
        <ul>
          <li>Access to Indian legal databases</li>
          <li>Secure data storage</li>
          <li>Regular updates and improvements</li>
        </ul>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
