import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BriefInput from './components/BriefInput';
import ResponseTabs from './components/ResponseTabs';
import DownloadShareFeature from './components/DownloadShareFeature';
import LandingPage from './components/LandingPage';
import SubscriptionPlans from './components/subscription/SubscriptionPlans';
import UserProfile from './components/user/UserProfile';
import AdminDashboard from './components/admin/AdminDashboard';
import { User, Subscription, LawSection, CaseHistory, Analysis, AnalysisResults } from './types';
import { getFeaturesByTier } from './utils/subscriptionUtils';
import './App.css';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [brief, setBrief] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults>({
    lawSections: [],
    caseHistories: [],
    analysis: {}
  });
  
  // Check for stored user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('lexAssistUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setSubscription(parsedUser.subscription);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('lexAssistUser');
      }
    }
  }, []);
  
  // Handle login
  const handleLogin = (email: string, _password: string) => {
    // Simulate login with different user types based on email
    let mockUser: User;
    
    if (email === 'admin@lexassist.com') {
      mockUser = {
        id: '1',
        name: 'Admin User',
        email: 'admin@lexassist.com',
        role: 'admin',
        subscription: {
          tier: 'enterprise',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          features: getFeaturesByTier('enterprise')
        }
      };
    } else if (email === 'enterprise@lexassist.com') {
      mockUser = {
        id: '2',
        name: 'Enterprise User',
        email: 'enterprise@lexassist.com',
        role: 'user',
        subscription: {
          tier: 'enterprise',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          features: getFeaturesByTier('enterprise')
        }
      };
    } else if (email === 'pro@lexassist.com') {
      mockUser = {
        id: '3',
        name: 'Pro User',
        email: 'pro@lexassist.com',
        role: 'user',
        subscription: {
          tier: 'pro',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          features: getFeaturesByTier('pro')
        }
      };
    } else {
      mockUser = {
        id: '4',
        name: 'Free User',
        email: email || 'free@lexassist.com',
        role: 'user',
        subscription: {
          tier: 'free',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          features: getFeaturesByTier('free')
        }
      };
    }
    
    setUser(mockUser);
    setSubscription(mockUser.subscription);
    localStorage.setItem('lexAssistUser', JSON.stringify(mockUser));
  };
  
  // Handle logout (used in navigation)
  const onLogout = () => {
    setUser(null);
    setSubscription(null);
    localStorage.removeItem('lexAssistUser');
  };
  
  // Handle brief submission
  const handleBriefSubmit = (briefText: string) => {
    setBrief(briefText);
    setIsAnalyzing(true);
    
    // Simulate API call to backend
    setTimeout(() => {
      const results = generateMockResults(briefText, subscription?.tier || 'free');
      setAnalysisResults(results);
      setIsAnalyzing(false);
    }, 3000);
  };
  
  // Handle subscription change
  const handleSubscribe = (tier: string) => {
    if (!user) return;
    
    let newSubscription;
    
    switch (tier) {
      case 'free':
        newSubscription = {
          tier: 'free',
          expiresAt: '2025-12-31',
          features: ['basic_analysis', 'limited_results', 'pdf_export']
        };
        break;
      case 'pro':
        newSubscription = {
          tier: 'pro',
          expiresAt: '2025-12-31',
          features: [
            'enhanced_analysis', 
            'comprehensive_results', 
            'document_segmentation', 
            'advanced_statute_identification', 
            'judgment_prediction', 
            'all_document_formats', 
            'download_docx',
            'download_txt',
            'share_email', 
            'share_whatsapp'
          ]
        };
        break;
      case 'enterprise':
        newSubscription = {
          tier: 'enterprise',
          expiresAt: '2025-12-31',
          features: [
            'enhanced_analysis', 
            'unlimited_results', 
            'document_segmentation', 
            'advanced_statute_identification', 
            'judgment_prediction', 
            'all_document_formats', 
            'download_docx',
            'download_txt',
            'share_email', 
            'share_whatsapp',
            'risk_assessment',
            'strategic_considerations',
            'alternative_approaches',
            'comparative_jurisprudence',
            'success_probability'
          ]
        };
        break;
      default:
        newSubscription = {
          tier: 'free',
          expiresAt: '2025-12-31',
          features: ['basic_analysis', 'limited_results', 'pdf_export']
        };
    }
    
    const updatedUser = {
      ...user,
      subscription: newSubscription
    };
    
    setUser(updatedUser);
    setSubscription(newSubscription);
    localStorage.setItem('lexAssistUser', JSON.stringify(updatedUser));
  };
  
  // Handle user profile update
  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('lexAssistUser', JSON.stringify(updatedUser));
  };
  
  // Check if user has access to a feature
  const hasAccess = (feature: string): boolean => {
    if (!subscription) return false;
    return subscription.features.includes(feature);
  };
  
  // Generate mock results based on brief and subscription tier
  const generateMockResults = (briefText: string, tier: string): AnalysisResults => {
    // Mock law sections
    const lawSections: LawSection[] = [
      {
        act: 'Indian Contract Act, 1872',
        section: '2',
        title: 'Interpretation Clause',
        content: 'In this Act the following words and expressions are used in the following senses, unless a contrary intention appears from the context...',
        relevance: 0.95,
        enhanced_relevance: tier !== 'free' ? 0.98 : undefined
      },
      {
        act: 'Indian Contract Act, 1872',
        section: '10',
        title: 'What agreements are contracts',
        content: 'All agreements are contracts if they are made by the free consent of parties competent to contract, for a lawful consideration and with a lawful object, and are not hereby expressly declared to be void.',
        relevance: 0.92,
        enhanced_relevance: tier !== 'free' ? 0.96 : undefined
      },
      {
        act: 'Indian Contract Act, 1872',
        section: '73',
        title: 'Compensation for loss or damage caused by breach of contract',
        content: 'When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby, which naturally arose in the usual course of things from such breach, or which the parties knew, when they made the contract, to be likely to result from the breach of it.',
        relevance: 0.88,
        enhanced_relevance: tier !== 'free' ? 0.91 : undefined
      },
      {
        act: 'Specific Relief Act, 1963',
        section: '10',
        title: 'Cases in which specific performance of contract enforceable',
        content: 'Except as otherwise provided in this Chapter, the specific performance of any contract may, in the discretion of the court, be enforced...',
        relevance: 0.85,
        enhanced_relevance: tier !== 'free' ? 0.89 : undefined
      },
      {
        act: 'Indian Evidence Act, 1872',
        section: '91',
        title: 'Evidence of terms of contracts, grants and other dispositions of property reduced to form of document',
        content: 'When the terms of a contract, or of a grant, or of any other disposition of property, have been reduced to the form of a document, and in all cases in which any matter is required by law to be reduced to the form of a document, no evidence shall be given in proof of the terms of such contract, grant or other disposition of property, or of such matter, except the document itself, or secondary evidence of its contents in cases in which secondary evidence is admissible under the provisions hereinbefore contained.',
        relevance: 0.82,
        enhanced_relevance: tier !== 'free' ? 0.87 : undefined
      }
    ];
    
    // Mock case histories
    const caseHistories: CaseHistory[] = [
      {
        title: 'Mohori Bibee v. Dharmodas Ghose',
        citation: '(1903) 30 I.A. 114',
        court: 'Privy Council',
        date: '1903',
        summary: 'A minor executed a mortgage in favor of a moneylender. The Privy Council held that a contract with a minor is void ab initio and not merely voidable. The minor cannot be asked to repay the money advanced to him.',
        relevance: 0.90,
        enhanced_relevance: tier !== 'free' ? 0.94 : undefined
      },
      {
        title: 'Carlill v. Carbolic Smoke Ball Co.',
        citation: '[1893] 1 QB 256',
        court: 'Court of Appeal, England',
        date: '1893',
        summary: 'The company offered a reward of £100 to anyone who contracted influenza after using their smoke ball. The plaintiff used the smoke ball as directed but still contracted influenza. The court held that there was a valid contract and the company was bound to pay the reward.',
        relevance: 0.87,
        enhanced_relevance: tier !== 'free' ? 0.92 : undefined
      },
      {
        title: 'Balfour v. Balfour',
        citation: '[1919] 2 KB 571',
        court: 'Court of Appeal, England',
        date: '1919',
        summary: 'A husband promised to pay maintenance to his wife while he was abroad. The court held that there was no intention to create legal relations in domestic arrangements, and therefore no enforceable contract existed.',
        relevance: 0.84,
        enhanced_relevance: tier !== 'free' ? 0.88 : undefined
      },
      {
        title: 'M.C. Mehta v. Union of India',
        citation: 'AIR 1987 SC 1086',
        court: 'Supreme Court of India',
        date: '1987',
        summary: 'This case established the principle of absolute liability for industries engaged in hazardous activities. The Supreme Court held that such industries are absolutely liable to compensate for harm caused by their activities, without any exceptions.',
        relevance: 0.81,
        enhanced_relevance: tier !== 'free' ? 0.85 : undefined
      },
      {
        title: 'Hadley v. Baxendale',
        citation: '(1854) 9 Ex 341',
        court: 'Court of Exchequer',
        date: '1854',
        summary: 'The court established that damages for breach of contract should be such as may fairly and reasonably be considered as arising naturally from the breach, or such as may reasonably be supposed to have been in the contemplation of both parties at the time they made the contract.',
        relevance: 0.79,
        enhanced_relevance: tier !== 'free' ? 0.83 : undefined
      }
    ];
    
    // Mock analysis
    const analysis: Analysis = {
      summary: 'The case involves a potential breach of contract where the parties had entered into an agreement for the supply of goods. The supplier failed to deliver the goods within the stipulated time, leading to losses for the buyer. The key legal issues revolve around whether there was a valid contract, whether the breach occurred, and what remedies are available to the aggrieved party.',
      keyIssues: [
        'Validity of the contract between the parties',
        'Whether there was a breach of contract by the supplier',
        'Quantification of damages resulting from the breach',
        'Availability of specific performance as a remedy'
      ],
      arguments: [
        {
          title: 'Valid Contract Formation',
          content: 'There appears to be a valid contract as all essential elements (offer, acceptance, consideration, intention to create legal relations, and capacity) seem to be present. The written agreement specifies the terms clearly, including delivery timelines and payment terms.'
        },
        {
          title: 'Clear Breach of Contract',
          content: 'The supplier\'s failure to deliver the goods within the agreed timeframe constitutes a breach of contract. The agreement explicitly mentioned time as being of the essence, making the breach material and actionable.'
        },
        {
          title: 'Damages Calculation',
          content: 'The damages should include direct losses (difference in market price and contract price) and consequential losses (lost profits from business interruption), provided they were reasonably foreseeable at the time of contract formation.'
        }
      ],
      challenges: [
        {
          title: 'Force Majeure Defense',
          content: 'The supplier might argue that the delay was caused by circumstances beyond their control, possibly invoking the force majeure clause in the contract. This would need to be evaluated based on the specific wording of the clause and whether the events truly prevented performance.'
        },
        {
          title: 'Mitigation of Damages',
          content: 'The buyer has a duty to mitigate damages. If alternative suppliers were available and the buyer failed to engage them promptly, the recoverable damages might be reduced.'
        }
      ],
      recommendations: [
        {
          title: 'Pursue Damages Claim',
          content: 'File a claim for damages based on Section 73 of the Indian Contract Act, quantifying both direct and consequential losses with proper documentation.'
        },
        {
          title: 'Consider Alternative Dispute Resolution',
          content: 'Before proceeding to litigation, consider mediation or arbitration if provided for in the contract, as this may lead to a faster and less costly resolution.'
        },
        {
          title: 'Preserve Evidence',
          content: 'Maintain all communications, delivery notices, quality inspection reports, and financial records showing losses to strengthen the claim.'
        }
      ]
    };
    
    // Return results based on subscription tier
    if (tier === 'free') {
      // Limit results for free tier
      return {
        lawSections: lawSections.slice(0, 3),
        caseHistories: caseHistories.slice(0, 3),
        analysis: {
          summary: analysis.summary,
          keyIssues: analysis.keyIssues,
          arguments: analysis.arguments?.slice(0, 1),
          challenges: analysis.challenges?.slice(0, 1),
          recommendations: analysis.recommendations?.slice(0, 1)
        }
      };
    } else if (tier === 'pro') {
      // More comprehensive results for pro tier
      return {
        lawSections: lawSections,
        caseHistories: caseHistories,
        analysis: analysis,
        segments: {
          facts: ['The parties entered into a contract on January 15, 2025.', 'The supplier agreed to deliver goods by March 1, 2025.', 'The goods were not delivered until April 10, 2025.'],
          arguments: ['The buyer claims that the delay caused significant business los
(Content truncated due to size limit. Use line ranges to read in chunks)