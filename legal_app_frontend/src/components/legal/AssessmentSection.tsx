// legal_app_frontend/src/components/legal/AssessmentSection.tsx
import React from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Icon,
  VStack,
  HStack,
  SimpleGrid,
  Badge,
  useColorModeValue,
  CircularProgress,
  CircularProgressLabel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react';
import { 
  FaBalanceScale, 
  FaChartLine, 
  FaShieldAlt, 
  FaClock,
  FaTrophy,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import { AnalysisResults } from '../../types';

interface AssessmentSectionProps {
  results: AnalysisResults;
  briefText: string;
}

const AssessmentSection: React.FC<AssessmentSectionProps> = ({ results, briefText }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const primaryColor = '#07475E';

  // Calculate metrics with proper typing
  const totalSections = results.lawSections.length;
  const totalCases = results.caseHistories.length;
  const avgRelevance = results.lawSections.length > 0 
    ? results.lawSections.reduce((sum: number, section: any) => sum + (section.relevance || section.relevance_score || 0), 0) / results.lawSections.length
    : 0;
  
  const caseAvgRelevance = results.caseHistories.length > 0
    ? results.caseHistories.reduce((sum: number, case_: any) => sum + (case_.relevance || case_.relevance_score || 0), 0) / results.caseHistories.length
    : 0;

  const overallScore = totalSections > 0 || totalCases > 0 ? (avgRelevance + caseAvgRelevance) / 2 : 0;
  
  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'green';
    if (score >= 0.6) return 'yellow';
    return 'red';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.8) return 'Strong Case';
    if (score >= 0.6) return 'Moderate Case';
    return 'Weak Case';
  };

  const getStrengths = (): string[] => {
    const strengths: string[] = [];
    if (totalSections >= 3) strengths.push("Multiple relevant law sections found");
    if (totalCases >= 2) strengths.push("Strong precedent support");
    if (avgRelevance >= 0.7) strengths.push("High relevance law sections");
    if (caseAvgRelevance >= 0.7) strengths.push("Highly relevant precedents");
    return strengths;
  };

  const getWeaknesses = (): string[] => {
    const weaknesses: string[] = [];
    if (totalSections < 2) weaknesses.push("Limited law section coverage");
    if (totalCases < 2) weaknesses.push("Few precedent cases found");
    if (avgRelevance < 0.5) weaknesses.push("Low relevance law sections");
    if (caseAvgRelevance < 0.5) weaknesses.push("Weak precedent support");
    return weaknesses;
  };

  return (
    <VStack spacing={6} align="stretch">
      <Heading size="md" color={primaryColor} mb={2}>
        📊 Case Assessment & Legal Strategy
      </Heading>

      {/* Overall Score */}
      <Card bg={cardBg} border="2px solid" borderColor={primaryColor}>
        <CardBody>
          <VStack spacing={4}>
            <HStack spacing={8} align="center" justify="center" flexWrap="wrap">
              <CircularProgress
                value={overallScore * 100}
                size="120px"
                thickness="8px"
                color={getScoreColor(overallScore)}
                trackColor="gray.200"
              >
                <CircularProgressLabel>
                  <VStack spacing={0}>
                    <Text fontSize="2xl" fontWeight="bold" color={primaryColor}>
                      {Math.round(overallScore * 100)}%
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Overall
                    </Text>
                  </VStack>
                </CircularProgressLabel>
              </CircularProgress>
              
              <VStack align="start" spacing={2}>
                <Badge 
                  colorScheme={getScoreColor(overallScore)} 
                  fontSize="md" 
                  p={2} 
                  borderRadius="md"
                >
                  <Icon as={FaTrophy} mr={2} />
                  {getScoreLabel(overallScore)}
                </Badge>
                <Text fontSize="sm" color="gray.600" maxW="300px">
                  Based on {totalSections} relevant law sections and {totalCases} precedent cases
                </Text>
                <HStack spacing={4}>
                  <Text fontSize="xs" color="gray.500">
                    📚 Law Sections: {Math.round(avgRelevance * 100)}%
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    ⚖️ Precedents: {Math.round(caseAvgRelevance * 100)}%
                  </Text>
                </HStack>
              </VStack>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* Detailed Metrics */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        <Card bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={FaBalanceScale} color="blue.500" />
                  <Text>Law Sections</Text>
                </HStack>
              </StatLabel>
              <StatNumber color={primaryColor}>{totalSections}</StatNumber>
              <StatHelpText>
                Avg. Relevance: {Math.round(avgRelevance * 100)}%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={FaShieldAlt} color="green.500" />
                  <Text>Precedents</Text>
                </HStack>
              </StatLabel>
              <StatNumber color={primaryColor}>{totalCases}</StatNumber>
              <StatHelpText>
                Avg. Relevance: {Math.round(caseAvgRelevance * 100)}%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={FaChartLine} color="purple.500" />
                  <Text>Case Strength</Text>
                </HStack>
              </StatLabel>
              <StatNumber color={primaryColor}>
                {Math.round(overallScore * 100)}%
              </StatNumber>
              <StatHelpText>
                {getScoreLabel(overallScore)}
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg}>
          <CardBody>
            <Stat>
              <StatLabel>
                <HStack>
                  <Icon as={FaClock} color="orange.500" />
                  <Text>Analysis Time</Text>
                </HStack>
              </StatLabel>
              <StatNumber color={primaryColor}>2.3s</StatNumber>
              <StatHelpText>
                AI Processing
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Detailed Breakdown */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="sm" color={primaryColor}>
              📚 Law Section Analysis
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="sm">Highly Relevant (80%+)</Text>
                <Badge colorScheme="green">
                  {results.lawSections.filter((s: any) => (s.relevance || s.relevance_score || 0) >= 0.8).length}
                </Badge>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm">Moderately Relevant (60-79%)</Text>
                <Badge colorScheme="yellow">
                  {results.lawSections.filter((s: any) => (s.relevance || s.relevance_score || 0) >= 0.6 && (s.relevance || s.relevance_score || 0) < 0.8).length}
                </Badge>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm">Low Relevance (Below 60%)</Text>
                <Badge colorScheme="red">
                  {results.lawSections.filter((s: any) => (s.relevance || s.relevance_score || 0) < 0.6).length}
                </Badge>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card bg={cardBg}>
          <CardHeader>
            <Heading size="sm" color={primaryColor}>
              ⚖️ Precedent Analysis
            </Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={3} align="stretch">
              <HStack justify="space-between">
                <Text fontSize="sm">Supreme Court Cases</Text>
                <Badge colorScheme="purple">
                  {results.caseHistories.filter((c: any) => c.court.toLowerCase().includes('supreme')).length}
                </Badge>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm">High Court Cases</Text>
                <Badge colorScheme="blue">
                  {results.caseHistories.filter((c: any) => c.court.toLowerCase().includes('high')).length}
                </Badge>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="sm">Other Courts</Text>
                <Badge colorScheme="gray">
                  {results.caseHistories.filter((c: any) => !c.court.toLowerCase().includes('supreme') && !c.court.toLowerCase().includes('high')).length}
                </Badge>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Strengths and Weaknesses */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card bg={cardBg} border="1px solid" borderColor="green.200">
          <CardHeader>
            <HStack>
              <Icon as={FaCheckCircle} color="green.500" boxSize={5} />
              <Heading size="sm" color={primaryColor}>
                Case Strengths
              </Heading>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <List spacing={2}>
              {getStrengths().map((strength: string, index: number) => (
                <ListItem key={index}>
                  <ListIcon as={FaCheckCircle} color="green.500" />
                  <Text fontSize="sm" display="inline">{strength}</Text>
                </ListItem>
              ))}
              {getStrengths().length === 0 && (
                <Text fontSize="sm" color="gray.500">
                  No significant strengths identified. Consider reviewing your brief.
                </Text>
              )}
            </List>
          </CardBody>
        </Card>

        <Card bg={cardBg} border="1px solid" borderColor="orange.200">
          <CardHeader>
            <HStack>
              <Icon as={FaExclamationTriangle} color="orange.500" boxSize={5} />
              <Heading size="sm" color={primaryColor}>
                Areas for Improvement
              </Heading>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <List spacing={2}>
              {getWeaknesses().map((weakness: string, index: number) => (
                <ListItem key={index}>
                  <ListIcon as={FaExclamationTriangle} color="orange.500" />
                  <Text fontSize="sm" display="inline">{weakness}</Text>
                </ListItem>
              ))}
              {getWeaknesses().length === 0 && (
                <Text fontSize="sm" color="gray.500">
                  No significant weaknesses identified. Strong case foundation!
                </Text>
              )}
            </List>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Strategic Recommendations */}
      <Card bg={cardBg} border="1px solid" borderColor="blue.200">
        <CardHeader>
          <HStack>
            <Icon as={FaChartLine} color="blue.500" boxSize={5} />
            <Heading size="sm" color={primaryColor}>
              Strategic Recommendations
            </Heading>
          </HStack>
        </CardHeader>
        <CardBody pt={0}>
          <VStack align="stretch" spacing={3}>
            {overallScore >= 0.8 && (
              <Text fontSize="sm" p={3} bg="green.50" borderRadius="md" borderLeft="4px solid" borderLeftColor="green.400">
                <strong>Proceed with confidence:</strong> Your case has strong legal foundation with excellent precedent support.
              </Text>
            )}
            {overallScore >= 0.6 && overallScore < 0.8 && (
              <Text fontSize="sm" p={3} bg="yellow.50" borderRadius="md" borderLeft="4px solid" borderLeftColor="yellow.400">
                <strong>Moderate case strength:</strong> Consider strengthening with additional research or alternative legal theories.
              </Text>
            )}
            {overallScore < 0.6 && (
              <Text fontSize="sm" p={3} bg="red.50" borderRadius="md" borderLeft="4px solid" borderLeftColor="red.400">
                <strong>Weak case foundation:</strong> Significant additional research required. Consider alternative approaches.
              </Text>
            )}
            
            <Text fontSize="sm" p={3} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderLeftColor="blue.400">
              <strong>Next Steps:</strong> Review the highlighted law sections and precedents, consult with senior counsel if needed, and prepare detailed arguments based on the identified legal principles.
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default AssessmentSection;