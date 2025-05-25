import React from 'react';

interface CaseHistoryCardProps {
  citation: string;
  parties: string;
  holdings: string;
  relevance: number; // 1-10 scale
  date: string;
}

const CaseHistoryCard: React.FC<CaseHistoryCardProps> = ({
  citation,
  parties,
  holdings,
  relevance,
  date
}) => {
  const [expanded, setExpanded] = React.useState(false);
  
  // Calculate relevance indicator color
  const getRelevanceColor = () => {
    if (relevance >= 8) return 'bg-green-500';
    if (relevance >= 5) return 'bg-yellow-500';
    return 'bg-gray-400';
  };
  
  return (
    <div className="mb-4 border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${getRelevanceColor()}`}></div>
          <div>
            <h3 className="font-serif text-lg font-medium text-[#1a365d]">
              {parties}
            </h3>
            <p className="text-sm text-gray-500">{citation} • {date}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Relevance: {relevance}/10
          </span>
          <button className="p-1 rounded-full hover:bg-gray-200">
            {expanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 border-t border-gray-200">
          <div className="prose max-w-none">
            <h4 className="text-md font-medium mb-2">Key Holdings</h4>
            <p className="text-gray-700">{holdings}</p>
          </div>
          
          <div className="mt-4">
            <h4 className="text-md font-medium mb-2">Relevance to Your Case</h4>
            <div className="bg-gray-50 p-3 rounded-md text-sm">
              <p>This case establishes precedent for similar circumstances in your brief.</p>
            </div>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="px-3 py-1 text-sm bg-[#1a365d] text-white rounded-md hover:bg-opacity-90">
              View Full Case
            </button>
            <button className="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
              Bookmark
            </button>
            <button className="px-3 py-1 text-sm bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
              Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseHistoryCard;
