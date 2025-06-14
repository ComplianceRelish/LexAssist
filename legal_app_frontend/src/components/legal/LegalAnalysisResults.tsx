// legal_app_frontend/src/components/legal/LegalAnalysisResults.tsx
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Badge,
  Icon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  HStack,
  Progress,
  useColorModeValue,
  Button,
  Flex,
  Container
} from '@chakra-ui/react';
import {
  FaGavel,
  FaFileAlt,
  FaBalanceScale,
  FaLightbulb,
  FaBookOpen,
  FaDownload,
  FaShare
} from 'react-icons/fa';
import LawCodesSection from './LawCodesSection';
import PrecedentsSection from './PrecedentsSection';
import AIAnalysisSection from './AIAnalysisSection';
import AssessmentSection from './AssessmentSection';
import type { 
  LawSection as GlobalLawSection,
  CaseHistory as GlobalCaseHistory,
  AnalysisResults as GlobalAnalysisResults,
  Analysis as GlobalAnalysis
} from '../../types';

// Local type definitions for API response
interface ApiLawSection {
  id: string;
  title: string;
  content: string;
  act_name: string;
  section_number: string;
  relevance_score: number;
}

interface ApiCaseHistory {
  id: string;
  case_name: string;
  citation: string;
  court: string;
  date: string;
  content: string;
  summary: string;
  relevance_score: number;
}

interface AnalysisItem {
  title: string;
  content?: string;
}

type AnalysisValue = string | AnalysisItem;

interface ApiAnalysis {
  summary: string;
  keyIssues: AnalysisValue[];
  arguments: AnalysisValue[];
  recommendations: AnalysisValue[];
}

interface ApiAnalysisResults {
  lawSections: ApiLawSection[];
  caseHistories: ApiCaseHistory[];
  analysis: ApiAnalysis;
}

interface LegalAnalysisResultsProps {
  results: ApiAnalysisResults;
  isLoading: boolean;
  briefText: string;
}

// Helper functions to transform API data to match global types
const transformLawSection = (apiSection: ApiLawSection): GlobalLawSection => ({
  id: apiSection.id,
  title: apiSection.title,
  content: apiSection.content,
  act_name: apiSection.act_name,
  section_number: apiSection.section_number,
  relevance_score: apiSection.relevance_score,
  relevance: apiSection.relevance_score // Map relevance_score to relevance
});

const transformCaseHistory = (apiCase: ApiCaseHistory): GlobalCaseHistory => {
  // Extract year from date string and return as string
  const extractYear = (dateStr: string): string => {
    const yearMatch = dateStr.match(/\d{4}/);
    return yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
  };

  return {
    id: apiCase.id,
    case_name: apiCase.case_name,
    citation: apiCase.citation,
    court: apiCase.court,
    date: apiCase.date,
    content: apiCase.content,
    summary: apiCase.summary,
    relevance_score: apiCase.relevance_score,
    relevance: apiCase.relevance_score, // Map relevance_score to relevance
    title: apiCase.case_name, // Map case_name to title
    year: extractYear(apiCase.date) // Extract year from date as string
  };
};

const transformAnalysisValue = (value: AnalysisValue): { title: string; content: string; } => {
  if (typeof value === 'string') {
    return {
      title: value,
      content: value
    };
  } else {
    return {
      title: value.title,
      content: value.content || value.title
    };
  }
};

const transformAnalysis = (apiAnalysis: ApiAnalysis): GlobalAnalysis => ({
  summary: apiAnalysis.summary,
  keyIssues: apiAnalysis.keyIssues.map(transformAnalysisValue),
  arguments: apiAnalysis.arguments.map(transformAnalysisValue),
  recommendations: apiAnalysis.recommendations.map(transformAnalysisValue)
});

const transformAnalysisResults = (apiResults: ApiAnalysisResults): GlobalAnalysisResults => ({
  lawSections: apiResults.lawSections.map(transformLawSection),
  caseHistories: apiResults.caseHistories.map(transformCaseHistory),
  analysis: transformAnalysis(apiResults.analysis)
});

const LegalAnalysisResults: React.FC<LegalAnalysisResultsProps> = ({
  results,
  isLoading,
  briefText
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const primaryColor = '#07475E';

  // Transform API results to match global types
  const transformedResults = transformAnalysisResults(results);

  if (isLoading) {
    return (
      <Container maxW="7xl" py={8}>
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody p={8} textAlign="center">
            <VStack spacing={4}>
              <Icon as={FaGavel} boxSize={12} color={primaryColor} />
              <Heading size="md" color={primaryColor}>
                Analyzing Your Legal Brief...
              </Heading>
              <Text color="gray.600">
                Our AI is reviewing Indian law codes, precedents, and case law
              </Text>
              <Progress
                size="lg"
                colorScheme="blue"
                isIndeterminate
                width="300px"
                borderRadius="full"
              />
            </VStack>
          </CardBody>
        </Card>
      </Container>
    );
  }

  if (!results.lawSections.length && !results.caseHistories.length) {
    return (
      <Container maxW="7xl" py={8}>
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody p={8} textAlign="center">
            <VStack spacing={4}>
              <Icon as={FaFileAlt} boxSize={12} color="gray.400" />
              <Heading size="md" color="gray.600">
                No Analysis Results
              </Heading>
              <Text color="gray.500">
                Please submit a legal brief to see detailed analysis
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxW="7xl" py={8}>
      {/* Header Section */}
      <Card bg={cardBg} borderColor={borderColor} mb={6}>
        <CardHeader>
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <VStack align="start" spacing={2}>
              <Heading size="lg" color={primaryColor}>
                Legal Analysis Results
              </Heading>
              <HStack>
                <Badge colorScheme="green" fontSize="sm">
                  {results.lawSections.length} Law Sections
                </Badge>
                <Badge colorScheme="blue" fontSize="sm">
                  {results.caseHistories.length} Precedents
                </Badge>
                <Badge colorScheme="purple" fontSize="sm">
                  AI Analysis Complete
                </Badge>
              </HStack>
            </VStack>
            <HStack>
              <Button
                leftIcon={<FaDownload />}
                colorScheme="blue"
                variant="outline"
                size="sm"
              >
                Export PDF
              </Button>
              <Button
                leftIcon={<FaShare />}
                colorScheme="green"
                variant="outline"
                size="sm"
              >
                Share
              </Button>
            </HStack>
          </Flex>
        </CardHeader>
      </Card>

      {/* Main Results Tabs */}
      <Tabs 
        index={activeTab} 
        onChange={setActiveTab}
        variant="enclosed"
        colorScheme="blue"
      >
        <TabList mb={6} bg={cardBg} borderRadius="lg" p={1}>
          <Tab
            _selected={{ color: 'white', bg: primaryColor }}
            fontWeight="semibold"
            flex={1}
          >
            <Icon as={FaBookOpen} mr={2} />
            Law Codes ({results.lawSections.length})
          </Tab>
          <Tab
            _selected={{ color: 'white', bg: primaryColor }}
            fontWeight="semibold"
            flex={1}
          >
            <Icon as={FaGavel} mr={2} />
            Precedents ({results.caseHistories.length})
          </Tab>
          <Tab
            _selected={{ color: 'white', bg: primaryColor }}
            fontWeight="semibold"
            flex={1}
          >
            <Icon as={FaLightbulb} mr={2} />
            AI Analysis
          </Tab>
          <Tab
            _selected={{ color: 'white', bg: primaryColor }}
            fontWeight="semibold"
            flex={1}
          >
            <Icon as={FaBalanceScale} mr={2} />
            Assessment
          </Tab>
        </TabList>

        <TabPanels>
          {/* Law Codes Tab */}
          <TabPanel p={0}>
            <LawCodesSection lawSections={transformedResults.lawSections} />
          </TabPanel>

          {/* Precedents Tab */}
          <TabPanel p={0}>
            <PrecedentsSection caseHistories={transformedResults.caseHistories} />
          </TabPanel>

          {/* AI Analysis Tab */}
          <TabPanel p={0}>
            <AIAnalysisSection analysis={transformedResults.analysis} />
          </TabPanel>

          {/* Assessment Tab */}
          <TabPanel p={0}>
            <AssessmentSection 
              results={transformedResults}
              briefText={briefText}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
};

export default LegalAnalysisResults;