import React, { useState } from 'react';

interface ResponseTabsProps {
  lawSections: {
    title: string;
    sectionNumber: string;
    content: string;
    relevance: number;
  }[];
  caseHistories: {
    citation: string;
    parties: string;
    holdings: string;
    relevance: number;
    date: string;
  }[];
  analysis: {
    summary: string;
    arguments: string[];
    challenges: string[];
    recommendations: string[];
  };
}

const ResponseTabs: React.FC<ResponseTabsProps> = ({
  lawSections,
  caseHistories,
  analysis
}) => {
  const [activeTab, setActiveTab] = useState<'law' | 'cases' | 'analysis'>('law');
  
  return (
    <div className="lex-card mb-8">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('law')}
            className={activeTab === 'law' ? 'lex-tab-active' : 'lex-tab'}
          >
            Law Sections
          </button>
          <button
            onClick={() => setActiveTab('cases')}
            className={activeTab === 'cases' ? 'lex-tab-active' : 'lex-tab'}
          >
            Case History
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={activeTab === 'analysis' ? 'lex-tab-active' : 'lex-tab'}
          >
            Analysis
          </button>
        </nav>
      </div>
      
      <div className="py-4">
        {activeTab === 'law' && (
          <div>
            <h3 className="text-xl font-semibold text-[#0a2e5c] mb-4">Relevant Law Sections</h3>
            <div className="space-y-6">
              {lawSections.map((section, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-medium text-[#0a2e5c]">
                      {section.title} - Section {section.sectionNumber}
                    </h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Relevance: {section.relevance}/10
                    </span>
                  </div>
                  <p className="text-gray-700">{section.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'cases' && (
          <div>
            <h3 className="text-xl font-semibold text-[#0a2e5c] mb-4">Relevant Case Histories</h3>
            <div className="space-y-6">
              {caseHistories.map((caseItem, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-medium text-[#0a2e5c]">
                      {caseItem.parties}
                    </h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Relevance: {caseItem.relevance}/10
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    Citation: {caseItem.citation} | Date: {caseItem.date}
                  </p>
                  <p className="text-gray-700">{caseItem.holdings}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'analysis' && (
          <div>
            <h3 className="text-xl font-semibold text-[#0a2e5c] mb-4">Legal Analysis</h3>
            
            <div className="mb-6">
              <h4 className="text-lg font-medium text-[#0a2e5c] mb-2">Summary</h4>
              <p className="text-gray-700">{analysis.summary}</p>
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-medium text-[#0a2e5c] mb-2">Suggested Arguments</h4>
              <ul className="list-disc pl-5 space-y-2">
                {analysis.arguments.map((argument, index) => (
                  <li key={index} className="text-gray-700">{argument}</li>
                ))}
              </ul>
            </div>
            
            <div className="mb-6">
              <h4 className="text-lg font-medium text-[#0a2e5c] mb-2">Potential Challenges</h4>
              <ul className="list-disc pl-5 space-y-2">
                {analysis.challenges.map((challenge, index) => (
                  <li key={index} className="text-gray-700">{challenge}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-medium text-[#0a2e5c] mb-2">Strategic Recommendations</h4>
              <ul className="list-disc pl-5 space-y-2">
                {analysis.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-gray-700">{recommendation}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponseTabs;
