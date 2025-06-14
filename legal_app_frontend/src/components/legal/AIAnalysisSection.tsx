// legal_app_frontend/src/components/legal/AIAnalysisSection.tsx
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
  List,
  ListItem,
  ListIcon,
  useColorModeValue
} from '@chakra-ui/react';
import { 
  FaLightbulb, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaBrain,
  FaClipboardList
} from 'react-icons/fa';

// Type definitions that match your existing types
interface AnalysisItem {
  title: string;
  content?: string;
}

// Union type to handle both string and object formats
type AnalysisValue = string | AnalysisItem;

interface Analysis {
  summary?: string;
  keyIssues: AnalysisValue[];
  arguments: AnalysisValue[];
  recommendations: AnalysisValue[];
}

interface AIAnalysisSectionProps {
  analysis: Analysis;
}

const AIAnalysisSection: React.FC<AIAnalysisSectionProps> = ({ analysis }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const primaryColor = '#07475E';

  // Helper function to normalize data (handle both string and object formats)
  const normalizeAnalysisItem = (item: AnalysisValue): AnalysisItem => {
    if (typeof item === 'string') {
      return { title: item, content: '' };
    }
    return item;
  };

  // Helper function to get title safely
  const getTitle = (item: AnalysisValue): string => {
    if (typeof item === 'string') {
      return item;
    }
    return item.title;
  };

  // Helper function to get content safely
  const getContent = (item: AnalysisValue): string | undefined => {
    if (typeof item === 'string') {
      return undefined;
    }
    return item.content;
  };

  return (
    <VStack spacing={6} align="stretch">
      <Heading size="md" color={primaryColor} mb={2}>
        🤖 AI-Powered Legal Analysis
      </Heading>

      {/* Executive Summary */}
      {analysis.summary && (
        <Card bg={cardBg} border="1px solid" borderColor="blue.200">
          <CardHeader pb={2}>
            <HStack>
              <Icon as={FaBrain} color="blue.500" boxSize={5} />
              <Heading size="sm" color={primaryColor}>
                Executive Summary
              </Heading>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderLeftColor="blue.400">
              <Text fontSize="sm" lineHeight="1.7" whiteSpace="pre-wrap">
                {analysis.summary}
              </Text>
            </Box>
          </CardBody>
        </Card>
      )}

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Key Issues */}
        {analysis.keyIssues && analysis.keyIssues.length > 0 && (
          <Card bg={cardBg} border="1px solid" borderColor="orange.200">
            <CardHeader pb={2}>
              <HStack>
                <Icon as={FaExclamationTriangle} color="orange.500" boxSize={5} />
                <Heading size="sm" color={primaryColor}>
                  Key Legal Issues Identified
                </Heading>
              </HStack>
            </CardHeader>
            <CardBody pt={0}>
              <List spacing={3}>
                {analysis.keyIssues.map((issue: AnalysisValue, index: number) => (
                  <ListItem key={index}>
                    <ListIcon as={FaClipboardList} color="orange.500" />
                    <Box display="inline-block">
                      <Text fontWeight="medium" fontSize="sm" color={primaryColor}>
                        {getTitle(issue)}
                      </Text>
                      {getContent(issue) && (
                        <Text fontSize="xs" color="gray.600" mt={1}>
                          {getContent(issue)}
                        </Text>
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
            </CardBody>
          </Card>
        )}

        {/* Legal Arguments */}
        {analysis.arguments && analysis.arguments.length > 0 && (
          <Card bg={cardBg} border="1px solid" borderColor="purple.200">
            <CardHeader pb={2}>
              <HStack>
                <Icon as={FaCheckCircle} color="purple.500" boxSize={5} />
                <Heading size="sm" color={primaryColor}>
                  Legal Arguments & Principles
                </Heading>
              </HStack>
            </CardHeader>
            <CardBody pt={0}>
              <List spacing={3}>
                {analysis.arguments.map((argument: AnalysisValue, index: number) => (
                  <ListItem key={index}>
                    <ListIcon as={FaCheckCircle} color="purple.500" />
                    <Box display="inline-block">
                      <Text fontWeight="medium" fontSize="sm" color={primaryColor}>
                        {getTitle(argument)}
                      </Text>
                      {getContent(argument) && (
                        <Text fontSize="xs" color="gray.600" mt={1}>
                          {getContent(argument)}
                        </Text>
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
            </CardBody>
          </Card>
        )}
      </SimpleGrid>

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <Card bg={cardBg} border="1px solid" borderColor="green.200">
          <CardHeader pb={2}>
            <HStack>
              <Icon as={FaLightbulb} color="green.500" boxSize={5} />
              <Heading size="sm" color={primaryColor}>
                AI Recommendations & Next Steps
              </Heading>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            <List spacing={3}>
              {analysis.recommendations.map((recommendation: AnalysisValue, index: number) => (
                <ListItem key={index}>
                  <ListIcon as={FaLightbulb} color="green.500" />
                  <Box display="inline-block">
                    <Text fontWeight="medium" fontSize="sm" color={primaryColor}>
                      {getTitle(recommendation)}
                    </Text>
                    {getContent(recommendation) && (
                      <Text fontSize="xs" color="gray.600" mt={1}>
                        {getContent(recommendation)}
                      </Text>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
};

export default AIAnalysisSection;