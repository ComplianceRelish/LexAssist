// legal_app_frontend/src/components/legal/PrecedentsSection.tsx
import React from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Badge,
  Icon,
  VStack,
  HStack,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Progress,
  useColorModeValue,
  Button,
  Flex,
  Divider
} from '@chakra-ui/react';
import { FaGavel, FaCalendar, FaBuilding, FaExternalLinkAlt, FaCopy, FaStar } from 'react-icons/fa';
import { CaseHistory } from '../../types';

interface PrecedentsSectionProps {
  caseHistories: CaseHistory[];
}

const PrecedentsSection: React.FC<PrecedentsSectionProps> = ({ caseHistories }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const primaryColor = '#07475E';

  const getRelevanceColor = (score: number): string => {
    if (score >= 0.8) return 'green';
    if (score >= 0.6) return 'yellow';
    return 'red';
  };

  const getCourtLevel = (court: string): string => {
    if (court.toLowerCase().includes('supreme')) return 'Supreme Court';
    if (court.toLowerCase().includes('high')) return 'High Court';
    return 'Other Courts';
  };

  const getCourtBadgeColor = (court: string): string => {
    if (court.toLowerCase().includes('supreme')) return 'purple';
    if (court.toLowerCase().includes('high')) return 'blue';
    return 'gray';
  };

  return (
    <VStack spacing={4} align="stretch">
      <Heading size="md" color={primaryColor} mb={2}>
        ⚖️ Relevant Legal Precedents & Judgments
      </Heading>
      
      <Accordion allowMultiple>
        {caseHistories.map((caseItem: CaseHistory, index: number) => (
          <AccordionItem key={caseItem.id || index} border="1px solid" borderColor="gray.200">
            <AccordionButton p={4} _hover={{ bg: 'gray.50' }}>
              <Box flex="1" textAlign="left">
                <Flex justify="space-between" align="start" mb={3}>
                  <VStack align="start" spacing={1} flex="1">
                    <Heading size="sm" color={primaryColor}>
                      {caseItem.title || caseItem.case_name}
                    </Heading>
                    <HStack spacing={2} flexWrap="wrap">
                      <Badge 
                        colorScheme={getCourtBadgeColor(caseItem.court)}
                        fontSize="xs"
                      >
                        <Icon as={FaBuilding} mr={1} />
                        {getCourtLevel(caseItem.court)}
                      </Badge>
                      <Badge colorScheme="gray" fontSize="xs">
                        <Icon as={FaCalendar} mr={1} />
                        {caseItem.year || caseItem.date}
                      </Badge>
                    </HStack>
                    <Text fontSize="xs" color="gray.600" fontFamily="mono">
                      Citation: {caseItem.citation}
                    </Text>
                  </VStack>
                  
                  <VStack align="end" spacing={1} minW="120px">
                    <HStack>
                      {[...Array(5)].map((_, i: number) => (
                        <Icon
                          key={i}
                          as={FaStar}
                          color={i < Math.round((caseItem.relevance || caseItem.relevance_score || 0) * 5) ? 'gold' : 'gray.300'}
                          boxSize={3}
                        />
                      ))}
                    </HStack>
                    <Badge 
                      colorScheme={getRelevanceColor(caseItem.relevance || caseItem.relevance_score || 0)}
                      fontSize="xs"
                    >
                      {Math.round((caseItem.relevance || caseItem.relevance_score || 0) * 100)}% Match
                    </Badge>
                  </VStack>
                </Flex>
                
                <Progress
                  value={(caseItem.relevance || caseItem.relevance_score || 0) * 100}
                  size="sm"
                  colorScheme={getRelevanceColor(caseItem.relevance || caseItem.relevance_score || 0)}
                  borderRadius="full"
                />
              </Box>
              <AccordionIcon />
            </AccordionButton>
            
            <AccordionPanel pb={4}>
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Heading size="xs" color={primaryColor} mb={2}>
                    📋 Case Summary
                  </Heading>
                  <Box p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid" borderLeftColor="blue.400">
                    <Text fontSize="sm" lineHeight="1.6">
                      {caseItem.summary || caseItem.content}
                    </Text>
                  </Box>
                </Box>
                
                <Divider />
                
                <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
                  <HStack>
                    <Icon as={FaGavel} color={primaryColor} />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="xs" color="gray.500">Court:</Text>
                      <Text fontSize="sm" fontWeight="medium">{caseItem.court}</Text>
                    </VStack>
                  </HStack>
                  
                  <HStack spacing={2}>
                    <Button size="xs" leftIcon={<FaCopy />} variant="outline">
                      Copy Citation
                    </Button>
                    <Button size="xs" leftIcon={<FaExternalLinkAlt />} variant="outline">
                      Full Judgment
                    </Button>
                  </HStack>
                </Flex>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </VStack>
  );
};

export default PrecedentsSection;