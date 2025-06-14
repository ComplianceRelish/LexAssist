// legal_app_frontend/src/components/legal/LawCodesSection.tsx
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
  Flex
} from '@chakra-ui/react';
import { FaBookOpen, FaExternalLinkAlt, FaCopy } from 'react-icons/fa';
import { LawSection } from '../../types';

interface LawCodesSectionProps {
  lawSections: LawSection[];
}

const LawCodesSection: React.FC<LawCodesSectionProps> = ({ lawSections }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const primaryColor = '#07475E';

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'green';
    if (score >= 0.6) return 'yellow';
    return 'red';
  };

  const getRelevanceText = (score: number) => {
    if (score >= 0.8) return 'Highly Relevant';
    if (score >= 0.6) return 'Moderately Relevant';
    return 'Low Relevance';
  };

  return (
    <VStack spacing={4} align="stretch">
      <Heading size="md" color={primaryColor} mb={2}>
        📚 Relevant Indian Law Sections
      </Heading>
      
      <Accordion allowMultiple>
        {lawSections.map((section, index) => (
          <AccordionItem key={section.id || index} border="1px solid" borderColor="gray.200">
            <AccordionButton p={4} _hover={{ bg: 'gray.50' }}>
              <Box flex="1" textAlign="left">
                <Flex justify="space-between" align="center" mb={2}>
                  <VStack align="start" spacing={1}>
                    <Heading size="sm" color={primaryColor}>
                      {section.act_name}
                    </Heading>
                    <Text fontSize="sm" fontWeight="medium">
                      Section {section.section_number}: {section.title}
                    </Text>
                  </VStack>
                  <VStack align="end" spacing={1}>
                    <Badge 
                      colorScheme={getRelevanceColor(section.relevance_score || 0)}
                      fontSize="xs"
                    >
                      {getRelevanceText(section.relevance_score || 0)}
                    </Badge>
                    <HStack spacing={1}>
                      <Text fontSize="xs" color="gray.500">Relevance:</Text>
                      <Text fontSize="xs" fontWeight="bold">
                        {Math.round((section.relevance_score || 0) * 100)}%
                      </Text>
                    </HStack>
                  </VStack>
                </Flex>
                <Progress
                  value={(section.relevance_score || 0) * 100}
                  size="sm"
                  colorScheme={getRelevanceColor(section.relevance_score || 0)}
                  borderRadius="full"
                />
              </Box>
              <AccordionIcon />
            </AccordionButton>
            
            <AccordionPanel pb={4}>
              <VStack align="stretch" spacing={4}>
                <Box p={4} bg="gray.50" borderRadius="md" borderLeft="4px solid" borderLeftColor={primaryColor}>
                  <Text fontSize="sm" lineHeight="1.6" whiteSpace="pre-wrap">
                    {section.content}
                  </Text>
                </Box>
                
                <HStack justify="space-between">
                  <HStack>
                    <Icon as={FaBookOpen} color={primaryColor} />
                    <Text fontSize="sm" color="gray.600">
                      {section.act_name} - Section {section.section_number}
                    </Text>
                  </HStack>
                  <HStack>
                    <Button size="xs" leftIcon={<FaCopy />} variant="outline">
                      Copy
                    </Button>
                    <Button size="xs" leftIcon={<FaExternalLinkAlt />} variant="outline">
                      View Full Act
                    </Button>
                  </HStack>
                </HStack>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </VStack>
  );
};

export default LawCodesSection;