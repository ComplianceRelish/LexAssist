import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Select,
  Stack,
  Text,
  Textarea,
  VStack,
  useColorModeValue,
  useToast,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Badge,
  Spinner,
  Link,
  IconButton,
  Tooltip,
  HStack
} from '@chakra-ui/react';
import { ChevronDownIcon, AddIcon, TimeIcon, CheckCircleIcon, WarningIcon, InfoIcon } from '@chakra-ui/icons';
import { format } from 'date-fns';
import { useParams } from 'react-router-dom';
import { supabase } from '../../supabase';

// Define types for our component
interface CaseDiaryEntry {
  id: string;
  case_id: string;
  entry_text: string;
  entry_type: string;
  entry_date: string;
  created_at: string;
  updated_at?: string;
  ai_status?: string;
  ai_analysis?: any;
  ai_error?: string;
}

interface Statute {
  code: string;
  title: string;
  sections: string[];
}

interface CaseDiaryData {
  case: {
    id: string;
    title: string;
    description: string;
    created_at: string;
    updated_at: string;
  };
  diary_entries: CaseDiaryEntry[];
  ai_analyses: any[];
  statute_timeline: {
    timestamp: string;
    statutes: Statute[];
    analysis_id: string;
  }[];
}

const EnhancedCaseDiary: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [diaryData, setDiaryData] = useState<CaseDiaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [entryText, setEntryText] = useState('');
  const [entryType, setEntryType] = useState('update');
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [aiAnalyze, setAiAnalyze] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const highlightColor = useColorModeValue('blue.50', 'blue.900');

  // Fetch case diary data
  useEffect(() => {
    if (!caseId) return;
    fetchCaseDiary();
  }, [caseId]);
  
  const fetchCaseDiary = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('get_case_diary', {
        body: { caseId }
      });
      
      if (error) throw error;
      
      setDiaryData(data);
    } catch (error) {
      console.error('Error fetching case diary:', error);
      toast({
        title: 'Error fetching case diary',
        description: error.message || 'Please try again later',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit new diary entry
  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryText.trim()) {
      toast({
        title: 'Entry text is required',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase.functions.invoke('add_case_diary_entry', {
        body: {
          caseId,
          entry: {
            entry_text: entryText,
            entry_type: entryType,
            entry_date: entryDate,
            ai_analyze: aiAnalyze
          }
        }
      });

      if (error) throw error;
      
      // Reset form and refresh data
      setEntryText('');
      fetchCaseDiary();
      
      toast({
        title: 'Entry added successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Scroll to bottom to show the new entry
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
      
    } catch (error) {
      console.error('Error adding diary entry:', error);
      toast({
        title: 'Error adding entry',
        description: error.message || 'Please try again later',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  // Get status badge for AI analysis
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge colorScheme="green">Analysis Complete</Badge>;
      case 'processing':
        return <Badge colorScheme="blue">Processing...</Badge>;
      case 'failed':
        return <Badge colorScheme="red">Analysis Failed</Badge>;
      case 'skipped':
        return <Badge colorScheme="gray">No AI Analysis</Badge>;
      default:
        return <Badge>Pending</Badge>;
    }
  };

  // Group entries by date for timeline display
  const groupedEntries = React.useMemo(() => {
    if (!diaryData?.diary_entries) return {};
    
    const grouped = {};
    diaryData.diary_entries.forEach(entry => {
      const date = entry.entry_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });
    
    return grouped;
  }, [diaryData?.diary_entries]);

  if (loading) {
    return (
      <Flex justify="center" align="center" height="50vh">
        <Spinner size="xl" color="blue.500" />
        <Text ml={4} fontSize="lg">Loading case diary...</Text>
      </Flex>
    );
  }

  return (
    <Box p={4}>
      {diaryData && (
        <VStack spacing={6} align="stretch">
          <Card>
            <CardHeader>
              <Heading size="lg">{diaryData.case.title}</Heading>
              <Text color="gray.500" fontSize="sm" mt={1}>
                Created on {formatDate(diaryData.case.created_at)}
              </Text>
            </CardHeader>
            <CardBody>
              <Text>{diaryData.case.description}</Text>
            </CardBody>
          </Card>
          
          <Heading size="md" pt={4}>Case Timeline</Heading>
          <Divider />
          
          {Object.entries(groupedEntries).length > 0 ? (
            Object.entries(groupedEntries)
              .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
              .map(([date, entries]) => (
                <Box key={date} mb={6}>
                  <Flex align="center" mb={2}>
                    <TimeIcon mr={2} color="blue.500" />
                    <Heading size="sm">{formatDate(date)}</Heading>
                  </Flex>
                  
                  <Stack spacing={4} pl={8} borderLeft="1px" borderColor="blue.200">
                    {entries.map((entry: CaseDiaryEntry) => (
                      <Card 
                        key={entry.id}
                        variant="outline"
                        bgColor={entry.entry_type === 'important' ? highlightColor : bgColor}
                        borderColor={borderColor}
                        borderWidth="1px"
                        borderRadius="md"
                      >
                        <CardHeader pb={2}>
                          <Flex justify="space-between" align="center">
                            <Badge colorScheme={entry.entry_type === 'important' ? 'red' : 'blue'}>
                              {entry.entry_type.charAt(0).toUpperCase() + entry.entry_type.slice(1)}
                            </Badge>
                            <Text fontSize="xs" color="gray.500">
                              {format(new Date(entry.created_at), 'h:mm a')}
                            </Text>
                          </Flex>
                        </CardHeader>
                        <CardBody pt={0}>
                          <Text whiteSpace="pre-wrap">{entry.entry_text}</Text>
                          
                          {entry.ai_status && (
                            <Box mt={3}>
                              <Flex align="center" mb={2}>
                                {getStatusBadge(entry.ai_status)}
                                {entry.ai_status === 'processing' && (
                                  <Spinner size="sm" ml={2} color="blue.500" />
                                )}
                                {entry.ai_status === 'failed' && entry.ai_error && (
                                  <Tooltip label={entry.ai_error}>
                                    <InfoIcon ml={2} color="red.500" />
                                  </Tooltip>
                                )}
                              </Flex>
                              
                              {entry.ai_analysis && (
                                <Accordion allowToggle mt={2}>
                                  <AccordionItem border="none">
                                    <h2>
                                      <AccordionButton 
                                        _hover={{ bg: 'gray.100' }} 
                                        borderRadius="md"
                                        px={2}
                                      >
                                        <Box flex="1" textAlign="left" fontSize="sm">
                                          <HStack>
                                            <InfoIcon color="blue.500" />
                                            <Text>AI Analysis</Text>
                                          </HStack>
                                        </Box>
                                        <AccordionIcon />
                                      </AccordionButton>
                                    </h2>
                                    <AccordionPanel pb={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md">
                                      {entry.ai_analysis.analysis && (
                                        <Text fontSize="sm" whiteSpace="pre-wrap">{entry.ai_analysis.analysis}</Text>
                                      )}
                                      
                                      {entry.ai_analysis.law_sections && entry.ai_analysis.law_sections.length > 0 && (
                                        <Box mt={3}>
                                          <Text fontWeight="bold" fontSize="sm">Relevant Statutes:</Text>
                                          <VStack align="start" spacing={1} mt={1}>
                                            {entry.ai_analysis.law_sections.map((statute, idx) => (
                                              <Text key={idx} fontSize="sm">
                                                • {statute.code}: {statute.title}
                                              </Text>
                                            ))}
                                          </VStack>
                                        </Box>
                                      )}
                                      
                                      {entry.ai_analysis.case_references && entry.ai_analysis.case_references.length > 0 && (
                                        <Box mt={3}>
                                          <Text fontWeight="bold" fontSize="sm">Relevant Cases:</Text>
                                          <VStack align="start" spacing={1} mt={1}>
                                            {entry.ai_analysis.case_references.map((caseRef, idx) => (
                                              <Text key={idx} fontSize="sm">
                                                • {caseRef.title} ({caseRef.year})
                                              </Text>
                                            ))}
                                          </VStack>
                                        </Box>
                                      )}
                                    </AccordionPanel>
                                  </AccordionItem>
                                </Accordion>
                              )}
                            </Box>
                          )}
                        </CardBody>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              ))
          ) : (
            <Box p={6} textAlign="center" borderWidth="1px" borderRadius="lg">
              <InfoIcon boxSize={6} color="blue.500" />
              <Text mt={4}>No case diary entries yet. Add your first entry below.</Text>
            </Box>
          )}
          
          <div ref={bottomRef} />
          
          {/* Statute Timeline */}
          {diaryData.statute_timeline && diaryData.statute_timeline.length > 0 && (
            <>
              <Heading size="md" pt={4}>Statute Timeline</Heading>
              <Divider mb={4} />
              <Accordion allowMultiple>
                {diaryData.statute_timeline.map((timelineItem, idx) => (
                  <AccordionItem key={idx}>
                    <h2>
                      <AccordionButton>
                        <Box flex="1" textAlign="left">
                          <Text fontWeight="bold">
                            {formatDate(timelineItem.timestamp)} 
                            <Badge ml={2} colorScheme="purple">
                              {timelineItem.statutes.length} statutes
                            </Badge>
                          </Text>
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                    </h2>
                    <AccordionPanel pb={4}>
                      <VStack align="start" spacing={2}>
                        {timelineItem.statutes.map((statute, idx) => (
                          <Box key={idx} p={2} borderWidth="1px" borderRadius="md" w="100%">
                            <Text fontWeight="bold">{statute.code}</Text>
                            <Text fontSize="sm">{statute.title}</Text>
                            {statute.sections && statute.sections.length > 0 && (
                              <Text fontSize="xs" color="gray.500" mt={1}>
                                Sections: {statute.sections.join(', ')}
                              </Text>
                            )}
                          </Box>
                        ))}
                      </VStack>
                      <Link 
                        color="blue.500" 
                        href={`/analysis/${timelineItem.analysis_id}`}
                        fontSize="sm" 
                        display="block" 
                        mt={3}
                      >
                        View full analysis →
                      </Link>
                    </AccordionPanel>
                  </AccordionItem>
                ))}
              </Accordion>
            </>
          )}
          
          {/* Add new entry form */}
          <Card mt={8}>
            <CardHeader>
              <Heading size="md">Add Diary Entry</Heading>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleSubmitEntry}>
                <VStack spacing={4} align="stretch">
                  <FormControl isRequired>
                    <FormLabel>Entry</FormLabel>
                    <Textarea 
                      value={entryText}
                      onChange={(e) => setEntryText(e.target.value)}
                      placeholder="Enter your case diary update..."
                      rows={5}
                    />
                  </FormControl>
                  
                  <FormControl>
                    <FormLabel>Entry Type</FormLabel>
                    <Select 
                      value={entryType}
                      onChange={(e) => setEntryType(e.target.value)}
                    >
                      <option value="update">Update</option>
                      <option value="important">Important</option>
                      <option value="note">Note</option>
                      <option value="question">Question</option>
                      <option value="document">Document</option>
                    </Select>
                  </FormControl>
                  
                  <HStack spacing={4}>
                    <FormControl>
                      <FormLabel>Date</FormLabel>
                      <Input 
                        type="date" 
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                      />
                    </FormControl>
                    
                    <FormControl>
                      <FormLabel>
                        <Flex align="center">
                          <Text>AI Analysis</Text>
                          <Tooltip label="Use AI to analyze this entry for legal insights">
                            <InfoIcon ml={1} color="blue.500" />
                          </Tooltip>
                        </Flex>
                      </FormLabel>
                      <Select 
                        value={aiAnalyze ? "true" : "false"}
                        onChange={(e) => setAiAnalyze(e.target.value === "true")}
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Select>
                    </FormControl>
                  </HStack>
                  
                  <Button
                    mt={4}
                    colorScheme="blue"
                    type="submit"
                    leftIcon={<AddIcon />}
                    isLoading={submitting}
                    loadingText="Adding entry..."
                  >
                    Add Entry
                  </Button>
                </VStack>
              </form>
            </CardBody>
          </Card>
        </VStack>
      )}
    </Box>
  );
};

export default EnhancedCaseDiary;
