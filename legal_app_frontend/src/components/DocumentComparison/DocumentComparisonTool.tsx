import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Text,
  Textarea,
  VStack,
  HStack,
  Progress,
  Card,
  CardBody,
  Select,
  useToast,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  SimpleGrid,
  Badge
} from '@chakra-ui/react';
import { apiService } from '../../services/api.service';
import './DocumentComparisonTool.css';

interface SimilarityResult {
  similarity: number;
  model_version: string;
  processing_time: number;
  common_terms?: string[];
  highlighted_sections?: {
    source: { start: number; end: number; text: string }[];
    target: { start: number; end: number; text: string }[];
  };
}

interface DocumentComparisonToolProps {
  initialDocuments?: { id: string; title: string; content?: string }[];
  onComparisonComplete?: (result: SimilarityResult) => void;
  currentUserId?: string;
}

const DocumentComparisonTool: React.FC<DocumentComparisonToolProps> = ({
  initialDocuments = [],
  onComparisonComplete,
  currentUserId
}) => {
  const [sourceDocument, setSourceDocument] = useState<string>('');
  const [targetDocument, setTargetDocument] = useState<string>('');
  const [sourceDocumentId, setSourceDocumentId] = useState<string>('');
  const [targetDocumentId, setTargetDocumentId] = useState<string>('');
  const [userDocuments, setUserDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [similarityResult, setSimilarityResult] = useState<SimilarityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inlegalBertAvailable, setInlegalBertAvailable] = useState<boolean>(true);

  const toast = useToast();

  // Check inlegalBERT availability on component mount
  useEffect(() => {
    const checkInLegalBERTStatus = async () => {
      try {
        const status = await apiService.checkInLegalBERTStatus();
        setInlegalBertAvailable(status.status === 'available');
        if (status.status !== 'available') {
          toast({
            title: 'InLegalBERT service unavailable',
            description: 'Using fallback similarity calculation.',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        }
      } catch (error) {
        console.error('Error checking InLegalBERT status:', error);
        setInlegalBertAvailable(false);
      }
    };

    checkInLegalBERTStatus();
  }, [toast]);

  // Load user documents if currentUserId is provided
  useEffect(() => {
    if (currentUserId) {
      const fetchUserDocuments = async () => {
        try {
          const documents = await apiService.getUserDocuments(currentUserId);
          setUserDocuments(documents);
        } catch (error) {
          console.error('Error fetching user documents:', error);
          toast({
            title: 'Error',
            description: 'Failed to load your documents.',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      };

      fetchUserDocuments();
    }
  }, [currentUserId, toast]);

  // Load initial documents if provided
  useEffect(() => {
    if (initialDocuments.length > 0) {
      const sourceDoc = initialDocuments[0];
      if (sourceDoc) {
        setSourceDocumentId(sourceDoc.id);
        if (sourceDoc.content) {
          setSourceDocument(sourceDoc.content);
        }
      }

      if (initialDocuments.length > 1) {
        const targetDoc = initialDocuments[1];
        if (targetDoc) {
          setTargetDocumentId(targetDoc.id);
          if (targetDoc.content) {
            setTargetDocument(targetDoc.content);
          }
        }
      }
    }
  }, [initialDocuments]);

  // Handle document selection
  const handleDocumentChange = async (documentId: string, isSource: boolean) => {
    if (!documentId) return;

    try {
      // Here you would fetch the document content
      // For now we'll simulate with the documents we already have
      const selectedDoc = userDocuments.find(doc => doc.id === documentId);
      
      if (selectedDoc && selectedDoc.content) {
        if (isSource) {
          setSourceDocument(selectedDoc.content);
          setSourceDocumentId(documentId);
        } else {
          setTargetDocument(selectedDoc.content);
          setTargetDocumentId(documentId);
        }
      } else {
        // In a real implementation, you would fetch the document content here
        toast({
          title: 'Document content not available',
          description: 'Please manually paste the document content.',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error loading document:', error);
      toast({
        title: 'Error',
        description: 'Failed to load document content.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Calculate similarity between documents
  const calculateSimilarity = async () => {
    if (!sourceDocument.trim() || !targetDocument.trim()) {
      setError('Please provide both documents for comparison.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSimilarityResult(null);

    try {
      const result = await apiService.getTextSimilarity(sourceDocument, targetDocument);
      
      // Add mock highlighted sections for demonstration
      // In a real implementation, these would come from the backend
      const enhancedResult = {
        ...result,
        common_terms: extractCommonLegalTerms(sourceDocument, targetDocument),
        highlighted_sections: simulateHighlightedSections(sourceDocument, targetDocument)
      };
      
      setSimilarityResult(enhancedResult);
      
      if (onComparisonComplete) {
        onComparisonComplete(enhancedResult);
      }
    } catch (error) {
      console.error('Error calculating similarity:', error);
      setError('Failed to calculate similarity. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Simple function to extract common legal terms (this would be done by inlegalBERT in production)
  const extractCommonLegalTerms = (sourceText: string, targetText: string): string[] => {
    const legalTerms = [
      'jurisdiction', 'plaintiff', 'defendant', 'petition', 'appeal',
      'writ', 'judgment', 'decree', 'contract', 'statute', 'section',
      'act', 'order', 'court', 'law', 'evidence', 'testimony', 'witness'
    ];
    
    return legalTerms.filter(term => 
      sourceText.toLowerCase().includes(term.toLowerCase()) && 
      targetText.toLowerCase().includes(term.toLowerCase())
    );
  };

  // Simulate highlighted sections (this would be done by inlegalBERT in production)
  const simulateHighlightedSections = (sourceText: string, targetText: string) => {
    // This is just a simple simulation
    // In reality, inlegalBERT would identify semantically similar sections
    
    const sourceWords = sourceText.split(' ');
    const targetWords = targetText.split(' ');
    
    const result = {
      source: [] as { start: number; end: number; text: string }[],
      target: [] as { start: number; end: number; text: string }[]
    };
    
    // Find a few random sections to highlight for demonstration
    if (sourceWords.length > 20) {
      const start = Math.floor(Math.random() * (sourceWords.length - 20));
      result.source.push({
        start,
        end: start + 10,
        text: sourceWords.slice(start, start + 10).join(' ')
      });
    }
    
    if (targetWords.length > 20) {
      const start = Math.floor(Math.random() * (targetWords.length - 20));
      result.target.push({
        start,
        end: start + 10,
        text: targetWords.slice(start, start + 10).join(' ')
      });
    }
    
    return result;
  };

  // Format the similarity score for display
  const formatSimilarityScore = (score: number): string => {
    return (score * 100).toFixed(2) + '%';
  };

  // Get color based on similarity score
  const getSimilarityColor = (score: number): string => {
    if (score < 0.3) return 'red.500';
    if (score < 0.7) return 'yellow.500';
    return 'green.500';
  };

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" bg="white" shadow="md">
      <Heading size="md" mb={4}>Legal Document Comparison Tool</Heading>
      
      {!inlegalBertAvailable && (
        <Alert status="warning" mb={4}>
          <AlertIcon />
          <AlertTitle>InLegalBERT Unavailable</AlertTitle>
          <AlertDescription>
            Using fallback similarity calculation. Results may be less accurate.
          </AlertDescription>
        </Alert>
      )}
      
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <VStack align="stretch" spacing={4}>
          <FormControl>
            <FormLabel>Source Document</FormLabel>
            {userDocuments.length > 0 && (
              <Select 
                placeholder="Select a document" 
                value={sourceDocumentId}
                onChange={(e) => handleDocumentChange(e.target.value, true)}
                mb={2}
              >
                {userDocuments.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.title}</option>
                ))}
              </Select>
            )}
            <Textarea
              value={sourceDocument}
              onChange={(e) => setSourceDocument(e.target.value)}
              placeholder="Paste or enter the source legal document text here"
              size="md"
              height="300px"
            />
          </FormControl>
        </VStack>
        
        <VStack align="stretch" spacing={4}>
          <FormControl>
            <FormLabel>Target Document</FormLabel>
            {userDocuments.length > 0 && (
              <Select 
                placeholder="Select a document" 
                value={targetDocumentId}
                onChange={(e) => handleDocumentChange(e.target.value, false)}
                mb={2}
              >
                {userDocuments.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.title}</option>
                ))}
              </Select>
            )}
            <Textarea
              value={targetDocument}
              onChange={(e) => setTargetDocument(e.target.value)}
              placeholder="Paste or enter the target legal document text here"
              size="md"
              height="300px"
            />
          </FormControl>
        </VStack>
      </SimpleGrid>
      
      <Flex justify="center" my={6}>
        <Button
          colorScheme="blue"
          onClick={calculateSimilarity}
          isLoading={isLoading}
          loadingText="Analyzing"
          disabled={!sourceDocument || !targetDocument || isLoading}
        >
          Compare Documents
        </Button>
      </Flex>

      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}

      {isLoading && (
        <Box textAlign="center" p={4}>
          <Spinner size="xl" />
          <Text mt={2}>Analyzing documents similarity using InLegalBERT...</Text>
        </Box>
      )}

      {similarityResult && (
        <Card variant="outline" mt={6}>
          <CardBody>
            <Heading size="md" mb={4}>Similarity Analysis Results</Heading>
            
            <Box mb={4}>
              <Text fontWeight="bold">Overall Similarity Score:</Text>
              <Flex align="center" mt={2}>
                <Text
                  fontSize="2xl"
                  fontWeight="bold"
                  color={getSimilarityColor(similarityResult.similarity)}
                  mr={4}
                >
                  {formatSimilarityScore(similarityResult.similarity)}
                </Text>
                <Progress
                  value={similarityResult.similarity * 100}
                  colorScheme={similarityResult.similarity < 0.3 ? 'red' : similarityResult.similarity < 0.7 ? 'yellow' : 'green'}
                  size="lg"
                  width="100%"
                />
              </Flex>
            </Box>

            <Divider my={4} />

            {similarityResult.common_terms && similarityResult.common_terms.length > 0 && (
              <Box mb={4}>
                <Text fontWeight="bold" mb={2}>Common Legal Terms:</Text>
                <Flex flexWrap="wrap" gap={2}>
                  {similarityResult.common_terms.map((term, index) => (
                    <Badge key={index} colorScheme="blue" p={2} borderRadius="md">
                      {term}
                    </Badge>
                  ))}
                </Flex>
              </Box>
            )}

            <Divider my={4} />

            {similarityResult.highlighted_sections && (
              <Box>
                <Text fontWeight="bold" mb={2}>Similar Sections:</Text>
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
                  <Box>
                    <Text fontWeight="medium" mb={2}>Source Document:</Text>
                    {similarityResult.highlighted_sections.source.map((section, index) => (
                      <Box 
                        key={index} 
                        p={2} 
                        bg="blue.50" 
                        borderRadius="md" 
                        borderLeft="4px" 
                        borderColor="blue.400"
                        mb={2}
                      >
                        <Text fontSize="sm">"{section.text}"</Text>
                      </Box>
                    ))}
                  </Box>
                  <Box>
                    <Text fontWeight="medium" mb={2}>Target Document:</Text>
                    {similarityResult.highlighted_sections.target.map((section, index) => (
                      <Box 
                        key={index} 
                        p={2} 
                        bg="green.50" 
                        borderRadius="md" 
                        borderLeft="4px" 
                        borderColor="green.400"
                        mb={2}
                      >
                        <Text fontSize="sm">"{section.text}"</Text>
                      </Box>
                    ))}
                  </Box>
                </SimpleGrid>
              </Box>
            )}

            <Box mt={4} textAlign="right">
              <Text fontSize="xs" color="gray.500">
                Powered by InLegalBERT v{similarityResult.model_version} | Processing time: {similarityResult.processing_time}ms
              </Text>
            </Box>
          </CardBody>
        </Card>
      )}
    </Box>
  );
};

export default DocumentComparisonTool;
