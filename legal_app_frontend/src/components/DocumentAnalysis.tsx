import React, { useState, useEffect } from 'react';
import {
  Box,
  Stack,
  Text,
  Heading,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Badge,
  Divider,
  UnorderedList,
  ListItem,
  ListIcon,
  Code
} from '@chakra-ui/react';
import { MdCheckCircle, MdInfo } from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api.service';
import { Analysis, AnalysisResults } from '../types';

interface DocumentAnalysisProps {
  documentId: string;
  onAnalysisComplete?: (results: AnalysisResults) => void;
}

const DocumentAnalysis: React.FC<DocumentAnalysisProps> = ({ documentId, onAnalysisComplete }) => {
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiService.get<{ results: AnalysisResults }>(
          `/api/documents/${documentId}/analysis`
        );

        setAnalysisResults(response.data.results);
        if (onAnalysisComplete) {
          onAnalysisComplete(response.data.results);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch analysis';
        setError(message);
        toast({
          title: 'Error',
          description: message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      fetchAnalysis();
    }
  }, [documentId, onAnalysisComplete, toast]);

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Analyzing document...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertTitle>Analysis Failed</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!analysisResults) {
    return (
      <Alert status="info">
        <AlertIcon />
        <AlertTitle>No Analysis Available</AlertTitle>
        <AlertDescription>
          Analysis results are not available for this document.
        </AlertDescription>
      </Alert>
    );
  }

  const { analysis, lawSections, caseHistories } = analysisResults;

  return (
    <Stack direction="column" spacing={6} align="stretch" width="full">
      <Box>
        <Heading size="md" mb={2}>Analysis Summary</Heading>
        <Text>{analysis.summary}</Text>
      </Box>

      <Divider />

      <Box>
        <Heading size="sm" mb={4}>Key Issues</Heading>
        <UnorderedList spacing={3}>
          {analysis.keyIssues.map((issue, index) => (
            <ListItem key={index}>
              <ListIcon as={MdInfo} color="blue.500" />
              <Text display="inline">{typeof issue === 'string' ? issue : issue.title}</Text>
            </ListItem>
          ))}
        </UnorderedList>
      </Box>

      <Box>
        <Heading size="sm" mb={4}>Arguments</Heading>
        <UnorderedList spacing={3}>
          {analysis.arguments.map((argument, index) => (
            <ListItem key={index}>
              <ListIcon as={MdCheckCircle} color="green.500" />
              <Text display="inline">{typeof argument === 'string' ? argument : argument.title}</Text>
            </ListItem>
          ))}
        </UnorderedList>
      </Box>

      {lawSections.length > 0 && (
        <Box>
          <Heading size="sm" mb={4}>Relevant Laws</Heading>
          <UnorderedList spacing={3}>
            {lawSections.map((law, index) => (
              <ListItem key={index}>
                <Text fontWeight="bold">{law.title}</Text>
                <Text mt={1}>{law.content}</Text>
                <Badge colorScheme={(law.relevance || law.relevance_score) >= 0.7 ? 'green' : (law.relevance || law.relevance_score) >= 0.4 ? 'yellow' : 'orange'}>
                  Relevance: {Math.round((law.relevance || law.relevance_score) * 100)}%
                </Badge>
              </ListItem>
            ))}
          </UnorderedList>
        </Box>
      )}

      {caseHistories.length > 0 && (
        <Box>
          <Heading size="sm" mb={4}>Relevant Cases</Heading>
          <UnorderedList spacing={3}>
            {caseHistories.map((case_, index) => (
              <ListItem key={index}>
                <Text fontWeight="bold">{case_.title || case_.case_name} ({case_.year || new Date(case_.date).getFullYear()})</Text>
                <Text mt={1}>{case_.summary}</Text>
                <Badge colorScheme={(case_.relevance || case_.relevance_score) >= 0.7 ? 'green' : (case_.relevance || case_.relevance_score) >= 0.4 ? 'yellow' : 'orange'}>
                  Relevance: {Math.round((case_.relevance || case_.relevance_score) * 100)}%
                </Badge>
              </ListItem>
            ))}
          </UnorderedList>
        </Box>
      )}
    </Stack>
  );
};

export default DocumentAnalysis;