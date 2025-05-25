import React, { useState } from 'react';
// We'll comment out the PDF generation functionality for now to fix build errors
// import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
// import { saveAs } from 'file-saver';

interface DownloadOptions {
  includeAnalysis: boolean;
  includeLawSections: boolean;
  includeCaseHistories: boolean;
}

interface ShareOptions {
  method: 'email' | 'whatsapp' | 'link';
  recipientEmail?: string;
  message?: string;
}

interface DownloadShareProps {
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
  briefContent: string;
}

const DownloadShareFeature: React.FC<DownloadShareProps> = ({
  lawSections,
  caseHistories,
  analysis,
  briefContent
}) => {
  const [downloadOptions, setDownloadOptions] = useState<DownloadOptions>({
    includeAnalysis: true,
    includeLawSections: true,
    includeCaseHistories: true
  });
  
  const [shareOptions, setShareOptions] = useState<ShareOptions>({
    method: 'email',
    recipientEmail: '',
    message: 'I wanted to share this legal analysis with you.'
  });
  
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shareLink, setShareLink] = useState<string>('');
  
  // Handle download options change
  const handleDownloadOptionChange = (option: keyof DownloadOptions) => {
    setDownloadOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };
  
  // Handle share options change
  const handleShareOptionChange = (option: keyof ShareOptions, value: any) => {
    setShareOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };
  
  // Generate text content for TXT export
  const generateTextContent = (): string => {
    let content = 'LEGAL ANALYSIS REPORT\n';
    content += '=====================\n\n';
    
    const currentDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    content += `Generated on: ${currentDate}\n\n`;
    
    if (briefContent) {
      content += 'CASE BRIEF:\n';
      content += '===========\n';
      content += briefContent + '\n\n';
    }
    
    if (downloadOptions.includeLawSections && lawSections.length > 0) {
      content += 'RELEVANT LAW SECTIONS:\n';
      content += '=====================\n\n';
      
      for (const section of lawSections) {
        content += `${section.title} - Section ${section.sectionNumber}\n`;
        content += '-------------------------------------------\n';
        content += section.content + '\n\n';
      }
    }
    
    if (downloadOptions.includeCaseHistories && caseHistories.length > 0) {
      content += 'RELEVANT CASE HISTORIES:\n';
      content += '=======================\n\n';
      
      for (const caseItem of caseHistories) {
        content += `${caseItem.parties}\n`;
        content += `Citation: ${caseItem.citation} (${caseItem.date})\n`;
        content += '-------------------------------------------\n';
        content += caseItem.holdings + '\n\n';
      }
    }
    
    if (downloadOptions.includeAnalysis && analysis) {
      content += 'LEGAL ANALYSIS:\n';
      content += '==============\n\n';
      
      content += 'Summary:\n';
      content += '--------\n';
      content += analysis.summary + '\n\n';
      
      if (analysis.arguments.length > 0) {
        content += 'Suggested Arguments:\n';
        content += '-------------------\n';
        
        for (let i = 0; i < analysis.arguments.length; i++) {
          content += `${i + 1}. ${analysis.arguments[i]}\n`;
        }
        
        content += '\n';
      }
      
      if (analysis.challenges.length > 0) {
        content += 'Potential Challenges:\n';
        content += '--------------------\n';
        
        for (let i = 0; i < analysis.challenges.length; i++) {
          content += `${i + 1}. ${analysis.challenges[i]}\n`;
        }
        
        content += '\n';
      }
      
      if (analysis.recommendations.length > 0) {
        content += 'Strategic Recommendations:\n';
        content += '-------------------------\n';
        
        for (let i = 0; i < analysis.recommendations.length; i++) {
          content += `${i + 1}. ${analysis.recommendations[i]}\n`;
        }
        
        content += '\n';
      }
    }
    
    content += 'DISCLAIMER: This document is generated for informational purposes only and does not constitute legal advice.';
    
    return content;
  };
  
  // Handle download
  const handleDownload = async (format: 'pdf' | 'docx' | 'txt') => {
    setIsProcessing(true);
    
    try {
      if (format === 'pdf') {
        // In a real implementation, this would generate a PDF file
        // For now, we'll just create a text file
        const content = generateTextContent();
        const blob = new Blob([content], { type: 'text/plain' });
        // saveAs(blob, 'legal-analysis.txt');
        alert('PDF download functionality will be available in the full version');
      } else if (format === 'docx') {
        // In a real implementation, this would generate a DOCX file
        // For now, we'll just create a text file
        const content = generateTextContent();
        const blob = new Blob([content], { type: 'text/plain' });
        // saveAs(blob, 'legal-analysis.txt');
        alert('DOCX download functionality will be available in the full version');
      } else if (format === 'txt') {
        const content = generateTextContent();
        const blob = new Blob([content], { type: 'text/plain' });
        // saveAs(blob, 'legal-analysis.txt');
        alert('TXT download functionality will be available in the full version');
      }
    } catch (error) {
      console.error('Error generating document:', error);
      // In a real implementation, show an error message to the user
    }
    
    setIsProcessing(false);
    setShowDownloadOptions(false);
  };
  
  // Handle share
  const handleShare = async () => {
    setIsProcessing(true);
    
    try {
      if (shareOptions.method === 'email') {
        // Generate a shareable link
        const shareableLink = `https://legal-app.example.com/shared/analysis/${generateRandomId()}`;
        setShareLink(shareableLink);
        
        // Simulate email sending
        console.log(`Email sent to ${shareOptions.recipientEmail} with link: ${shareableLink}`);
      } else if (shareOptions.method === 'whatsapp') {
        // Generate a shareable link
        const shareableLink = `https://legal-app.example.com/shared/analysis/${generateRandomId()}`;
        setShareLink(shareableLink);
        
        // Construct WhatsApp URL
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareOptions.message} ${shareableLink}`)}`;
        
        // Open WhatsApp in a new tab
        window.open(whatsappUrl, '_blank');
      } else if (shareOptions.method === 'link') {
        // Generate a shareable link
        const shareableLink = `https://legal-app.example.com/shared/analysis/${generateRandomId()}`;
        setShareLink(shareableLink);
      }
    } catch (error) {
      console.error('Error sharing document:', error);
      // In a real implementation, show an error message to the user
    }
    
    setIsProcessing(false);
  };
  
  // Generate a random ID for shareable links
  const generateRandomId = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };
  
  // Copy link to clipboard
  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    // In a real implementation, show a success message
    alert('Link copied to clipboard!');
  };
  
  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap gap-4">
        <div>
          <button
            className="px-4 py-2 bg-[#0a2e5c] text-white rounded-md hover:bg-opacity-90 flex items-center"
            onClick={() => setShowDownloadOptions(!showDownloadOptions)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Download Results
          </button>
          
          {showDownloadOptions && (
            <div className="mt-2 p-4 bg-white rounded-md shadow-md">
              <h3 className="text-lg font-medium mb-2">Download Options</h3>
              
              <div className="space-y-2 mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={downloadOptions.includeAnalysis}
                    onChange={() => handleDownloadOptionChange('includeAnalysis')}
                    className="mr-2"
                  />
                  Include Analysis
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={downloadOptions.includeLawSections}
                    onChange={() => handleDownloadOptionChange('includeLawSections')}
                    className="mr-2"
                  />
                  Include Law Sections
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={downloadOptions.includeCaseHistories}
                    onChange={() => handleDownloadOptionChange('includeCaseHistories')}
                    className="mr-2"
                  />
                  Include Case Histories
                </label>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-3 py-1 bg-[#0a2e5c] text-white rounded-md hover:bg-opacity-90 text-sm"
                  onClick={() => handleDownload('pdf')}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Download as PDF'}
                </button>
                
                <button
                  className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                  onClick={() => handleDownload('docx')}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Download as DOCX'}
                </button>
                
                <button
                  className="px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                  onClick={() => handleDownload('txt')}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Download as TXT'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div>
          <button
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center"
            onClick={() => setShowShareOptions(!showShareOptions)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
            Share Results
          </button>
          
          {showShareOptions && (
            <div className="mt-2 p-4 bg-white rounded-md shadow-md">
              <h3 className="text-lg font-medium mb-2">Share Options</h3>
              
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Share via</label>
                  <div className="flex gap-2">
                    <button
                      className={`px-3 py-1 rounded-md text-sm ${
                        shareOptions.method === 'email'
                          ? 'bg-[#0a2e5c] text-white'
                          : 'bg-white border border-gray-300 text-gray-700'
                      }`}
                      onClick={() => handleShareOptionChange('method', 'email')}
                    >
                      Email
                    </button>
                    
                    <button
                      className={`px-3 py-1 rounded-md text-sm ${
                        shareOptions.method === 'whatsapp'
                          ? 'bg-[#0a2e5c] text-white'
                          : 'bg-white border border-gray-300 text-gray-700'
                      }`}
                      onClick={() => handleShareOptionChange('method', 'whatsapp')}
                    >
                      WhatsApp
                    </button>
                    
                    <button
                      className={`px-3 py-1 rounded-md text-sm ${
                        shareOptions.method === 'link'
                          ? 'bg-[#0a2e5c] text-white'
                          : 'bg-white border border-gray-300 text-gray-700'
                      }`}
                      onClick={() => handleShareOptionChange('method', 'link')}
                    >
                      Generate Link
                    </button>
                  </div>
                </div>
                
                {shareOptions.method === 'email' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
                      <input
                        type="email"
                        value={shareOptions.recipientEmail}
                        onChange={(e) => handleShareOptionChange('recipientEmail', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="recipient@example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
                      <textarea
                        value={shareOptions.message}
                        onChange={(e) => handleShareOptionChange('message', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        rows={3}
                        placeholder="Add a personal message..."
                      />
                    </div>
                  </>
                )}
                
                {shareOptions.method === 'whatsapp' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message (Optional)</label>
                    <textarea
                      value={shareOptions.message}
                      onChange={(e) => handleShareOptionChange('message', e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md"
                      rows={3}
                      placeholder="Add a personal message..."
                    />
                  </div>
                )}
              </div>
              
   
(Content truncated due to size limit. Use line ranges to read in chunks)