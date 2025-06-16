// src/pages/UserDashboard/EnhancedUserDashboard.tsx - COMPLETE CORRECTED VERSION
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Text,
  Heading,
  Button,
  useColorModeValue,
  Card,
  CardBody,
  SimpleGrid,
  useToast,
  Spinner,
  Center,
  VStack,
  Flex,
  Badge,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Alert,
  AlertIcon,
  Divider,
  Progress,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import { 
  FaArrowUp, 
  FaExclamationCircle, 
  FaCheckCircle, 
  FaGavel,
  FaFileUpload,
  FaChevronRight,
  FaLightbulb,
  FaBalanceScale,
  FaClock,
  FaCheckDouble
} from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Legend } from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { apiService, UserCase, UserDocument, UserStats, CaseBriefSubmission } from '../../services/api.service';
import CaseBriefModal from '../../components/Dashboard/CaseBriefModal';

interface BriefAnalysisResult {
  analysis_id: string;
  status: string;
  law_codes: Array<{
    act_name: string;
    section: string;
    description: string;
    relevance: string;
  }>;
  precedent_cases: Array<{
    case_name: string;
    citation: string;
    court: string;
    year: string;
    relevance_score: number;
    judgment_summary: string;
  }>;
  ai_analysis: {
    case_summary: string;
    legal_issues: string[];
    strengths: string[];
    weaknesses: string[];
    timeline_estimate: string;
    success_probability: number;
    estimated_costs: string;
    procedural_steps: string[];
  };
  recommendations: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
    action_items: string[];
  }>;
}

const EnhancedUserDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [showCaseBriefModal, setShowCaseBriefModal] = useState(false);
  const [submittingBrief, setSubmittingBrief] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<BriefAnalysisResult | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  
  // User-specific state
  const [userCases, setUserCases] = useState<UserCase[]>([]);
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  const cardBg = useColorModeValue('white', 'gray.800');
  const primaryColor = "#1A365D";
  const goldColor = "#D4AF37";

  useEffect(() => {
    if (user?.id) {
      loadUserData();
    }
  }, [user?.id]);

  const loadUserData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const [cases, documents, stats] = await Promise.all([
        apiService.getUserCases(user.id),
        apiService.getUserDocuments(user.id),
        apiService.getUserStats(user.id),
      ]);

      setUserCases(cases);
      setUserDocuments(documents);
      setUserStats(stats);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Error loading dashboard data',
        description: error.message || 'Failed to load user data',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCaseBriefSubmit = async (briefData: any) => {
    setSubmittingBrief(true);
    try {
      console.log('Submitting case brief:', briefData);
      
      // FIXED: Properly map briefData to CaseBriefSubmission interface
      const submissionData: CaseBriefSubmission = {
        userId: user?.id || '',
        clientName: briefData.clientName || user?.full_name || user?.name || 'Unknown Client',
        caseTitle: briefData.title || briefData.caseTitle || 'Untitled Case',
        caseType: briefData.case_type || briefData.caseType || 'General',
        briefDescription: briefData.brief_text || briefData.briefDescription || '',
        court: briefData.court || 'Not Specified',
        jurisdiction: briefData.jurisdiction || 'IN',
        urgencyLevel: briefData.urgency_level || briefData.urgencyLevel || 'medium',
        speechInput: briefData.speech_input || briefData.speechInput || false,
        // Additional fields that might be required
        ...(briefData.documents && { documents: briefData.documents }),
        ...(briefData.tags && { tags: briefData.tags }),
        ...(briefData.notes && { notes: briefData.notes })
      };

      const result = await apiService.submitCaseBrief(submissionData);
      
      console.log('Analysis result received:', result);
      
      if (result && result.analysis_id) {
        setAnalysisResult(result);
        setShowAnalysisModal(true);
        
        toast({
          title: '✅ Case Brief Analyzed Successfully!',
          description: 'AI analysis completed. Review the results below.',
          status: 'success',
          duration: 5000,
        });
      } else {
        throw new Error('No analysis results received');
      }

      setShowCaseBriefModal(false);
      loadUserData(); // Refresh dashboard data
    } catch (error: any) {
      console.error('Case brief submission error:', error);
      toast({
        title: 'Error analyzing case brief',
        description: error.response?.data?.detail || error.message || 'Failed to analyze case brief',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSubmittingBrief(false);
    }
  };

  const generateChartData = () => {
    if (!userCases.length) return [];
    
    const monthlyData = userCases.reduce((acc: any, case_: UserCase) => {
      const month = new Date(case_.createdAt).toLocaleDateString('en', { month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(monthlyData).map(([month, count]) => ({
      name: month,
      active: count,
      closed: Math.floor(Number(count) * 0.7),
    }));
  };

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" p={6}>
        <Center h="400px">
          <VStack>
            <Spinner size="xl" color={primaryColor} />
            <Text>Loading your dashboard...</Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" p={6}>
      {/* Welcome Section */}
      <Box mb={6}>
        <Heading size="lg" color={primaryColor} fontFamily="Playfair Display, serif" mb={1}>
          Welcome Back, {user?.full_name || user?.name || 'User'}
        </Heading>
        <Text color="gray.600">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })} | <Text as="span" color={primaryColor}>{userStats?.activeCases || 0} cases active</Text>
        </Text>
      </Box>

      {/* Stats Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={6}>
        <Card
          bg={cardBg}
          borderTop="4px solid"
          borderTopColor={primaryColor}
          _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
          transition="all 0.3s ease"
        >
          <CardBody>
            <VStack align="start" spacing={2}>
              <Text fontSize="sm" color="gray.600">Active Cases</Text>
              <Flex justify="space-between" align="end" w="full">
                <Text fontSize="3xl" fontWeight="bold" color={primaryColor}>
                  {userStats?.activeCases || 0}
                </Text>
                <Text fontSize="sm" color="green.500">
                  <Icon as={FaArrowUp} mr={1} />
                  {userStats?.monthlyGrowth?.cases || 0}%
                </Text>
              </Flex>
              <Text fontSize="xs" color="gray.500">from last month</Text>
            </VStack>
          </CardBody>
        </Card>

        <Card
          bg={cardBg}
          borderTop="4px solid"
          borderTopColor="orange.500"
          _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
          transition="all 0.3s ease"
        >
          <CardBody>
            <VStack align="start" spacing={2}>
              <Text fontSize="sm" color="gray.600">Pending Deadlines</Text>
              <Flex justify="space-between" align="end" w="full">
                <Text fontSize="3xl" fontWeight="bold" color="orange.600">
                  {userStats?.pendingDeadlines || 0}
                </Text>
                <Text fontSize="sm" color="orange.500">
                  <Icon as={FaExclamationCircle} mr={1} />
                  urgent
                </Text>
              </Flex>
              <Text fontSize="xs" color="gray.500">next 7 days</Text>
            </VStack>
          </CardBody>
        </Card>

        <Card
          bg={cardBg}
          borderTop="4px solid"
          borderTopColor="purple.500"
          _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
          transition="all 0.3s ease"
        >
          <CardBody>
            <VStack align="start" spacing={2}>
              <Text fontSize="sm" color="gray.600">Documents Reviewed</Text>
              <Flex justify="space-between" align="end" w="full">
                <Text fontSize="3xl" fontWeight="bold" color="purple.600">
                  {userStats?.documentsReviewed || 0}
                </Text>
                <Text fontSize="sm" color="green.500">
                  <Icon as={FaArrowUp} mr={1} />
                  {userStats?.monthlyGrowth?.documents || 0}%
                </Text>
              </Flex>
              <Text fontSize="xs" color="gray.500">this month</Text>
            </VStack>
          </CardBody>
        </Card>

        <Card
          bg={cardBg}
          borderTop="4px solid"
          borderTopColor={goldColor}
          _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
          transition="all 0.3s ease"
        >
          <CardBody>
            <VStack align="start" spacing={2}>
              <Text fontSize="sm" color="gray.600">Success Rate</Text>
              <Flex justify="space-between" align="end" w="full">
                <Text fontSize="3xl" fontWeight="bold" color="green.600">
                  {userStats?.successRate || 0}%
                </Text>
                <Text fontSize="sm" color="green.500">
                  <Icon as={FaCheckCircle} mr={1} />
                  Good
                </Text>
              </Flex>
              <Text fontSize="xs" color="gray.500">last 12 months</Text>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* New Case Brief Button */}
      <Box mb={6}>
        <Button
          bg={goldColor}
          color={primaryColor}
          size="lg"
          onClick={() => setShowCaseBriefModal(true)}
          _hover={{ bg: `${goldColor}90` }}
          leftIcon={<Icon as={FaFileUpload} />}
          isLoading={submittingBrief}
          loadingText="Analyzing..."
        >
          + New Case Brief Entry
        </Button>
      </Box>

      {/* Two Column Layout */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6} mb={6}>
        {/* Case Analytics Chart */}
        <Card bg={cardBg}>
          <CardBody>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="md" color={primaryColor}>Case Analytics</Heading>
            </Flex>
            <Box h="220px">
              {generateChartData().length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={generateChartData()}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="active" 
                      stroke={primaryColor} 
                      strokeWidth={2}
                      name="Active Cases"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="closed" 
                      stroke={goldColor} 
                      strokeWidth={2}
                      name="Closed Cases"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Center h="100%">
                  <VStack spacing={4}>
                    <Icon as={FaGavel} fontSize="4xl" color="gray.300" />
                    <Text color="gray.500" textAlign="center">
                      No case data available yet
                    </Text>
                    <Text fontSize="sm" color="gray.400" textAlign="center">
                      Submit your first case brief to see analytics
                    </Text>
                  </VStack>
                </Center>
              )}
            </Box>
          </CardBody>
        </Card>

        {/* Recent Cases */}
        <Card bg={cardBg}>
          <CardBody>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="md" color={primaryColor}>Recent Cases</Heading>
              <Button variant="link" color={primaryColor} size="sm" rightIcon={<FaChevronRight />}>
                View All
              </Button>
            </Flex>
            <VStack spacing={4} align="stretch">
              {userCases.length > 0 ? (
                userCases.slice(0, 3).map((case_) => (
                  <Flex
                    key={case_.id}
                    align="center"
                    p={3}
                    bg="blue.50"
                    borderRadius="lg"
                    borderLeft="4px solid"
                    borderLeftColor={primaryColor}
                  >
                    <Box p={2} bg={primaryColor} borderRadius="md" color="white" mr={4}>
                      <Icon as={FaGavel} />
                    </Box>
                    <Box flex="1">
                      <Text fontWeight="semibold">{case_.title}</Text>
                      <Text fontSize="sm" color="gray.600">
                        {case_.caseType} - {case_.court}
                      </Text>
                    </Box>
                    <VStack align="end" spacing={1}>
                      <Badge colorScheme={case_.status === 'active' ? 'blue' : 'orange'}>
                        {case_.status}
                      </Badge>
                      <Text fontSize="xs" color="gray.500">
                        {case_.nextHearing ? `Hearing: ${new Date(case_.nextHearing).toLocaleDateString()}` : 'No hearing scheduled'}
                      </Text>
                    </VStack>
                  </Flex>
                ))
              ) : (
                <Center p={8}>
                  <VStack spacing={4}>
                    <Icon as={FaGavel} fontSize="4xl" color="gray.300" />
                    <Text color="gray.500" textAlign="center">
                      No cases yet. Create your first case brief!
                    </Text>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => setShowCaseBriefModal(true)}
                    >
                      Create First Case
                    </Button>
                  </VStack>
                </Center>
              )}
            </VStack>
          </CardBody>
        </Card>
      </Grid>

      {/* Case Brief Modal */}
      <CaseBriefModal
        isOpen={showCaseBriefModal}
        onClose={() => setShowCaseBriefModal(false)}
        onSubmit={handleCaseBriefSubmit}
      />

      {/* Analysis Results Modal */}
      <Modal isOpen={showAnalysisModal} onClose={() => setShowAnalysisModal(false)} size="6xl">
        <ModalOverlay />
        <ModalContent maxW="90vw" maxH="90vh">
          <ModalHeader bg={primaryColor} color="white" borderTopRadius="md">
            <Flex align="center">
              <Icon as={FaCheckDouble} mr={3} />
              Case Brief Analysis Results
            </Flex>
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody p={6} maxH="70vh" overflowY="auto">
            {analysisResult && (
              <VStack spacing={6} align="stretch">
                {/* Success Alert */}
                <Alert status="success" borderRadius="md">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="bold">Analysis Complete!</Text>
                    <Text fontSize="sm">
                      Your case brief has been analyzed using AI and legal databases.
                    </Text>
                  </Box>
                </Alert>

                {/* Case Summary */}
                <Card>
                  <CardBody>
                    <Heading size="md" color={primaryColor} mb={3}>
                      <Icon as={FaBalanceScale} mr={2} />
                      Case Summary
                    </Heading>
                    <Text>{analysisResult.ai_analysis.case_summary}</Text>
                    
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={4}>
                      <Box p={3} bg="blue.50" borderRadius="md">
                        <Text fontSize="sm" color="gray.600">Timeline Estimate</Text>
                        <Text fontWeight="bold" color="blue.600">
                          <Icon as={FaClock} mr={1} />
                          {analysisResult.ai_analysis.timeline_estimate}
                        </Text>
                      </Box>
                      <Box p={3} bg="green.50" borderRadius="md">
                        <Text fontSize="sm" color="gray.600">Success Probability</Text>
                        <Text fontWeight="bold" color="green.600">
                          {Math.round(analysisResult.ai_analysis.success_probability * 100)}%
                        </Text>
                      </Box>
                      <Box p={3} bg="orange.50" borderRadius="md">
                        <Text fontSize="sm" color="gray.600">Estimated Costs</Text>
                        <Text fontWeight="bold" color="orange.600">
                          {analysisResult.ai_analysis.estimated_costs}
                        </Text>
                      </Box>
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Legal Issues & Analysis */}
                <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
                  <Card>
                    <CardBody>
                      <Heading size="sm" color={primaryColor} mb={3}>Legal Issues Identified</Heading>
                      <List spacing={2}>
                        {analysisResult.ai_analysis.legal_issues.map((issue, index) => (
                          <ListItem key={index}>
                            <ListIcon as={FaCheckCircle} color="blue.500" />
                            <Text fontSize="sm">{issue}</Text>
                          </ListItem>
                        ))}
                      </List>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardBody>
                      <Heading size="sm" color={primaryColor} mb={3}>Strengths & Weaknesses</Heading>
                      <VStack align="stretch" spacing={3}>
                        <Box>
                          <Text fontSize="sm" fontWeight="bold" color="green.600" mb={1}>Strengths:</Text>
                          {analysisResult.ai_analysis.strengths.map((strength, index) => (
                            <Text key={index} fontSize="xs" color="green.700">• {strength}</Text>
                          ))}
                        </Box>
                        <Box>
                          <Text fontSize="sm" fontWeight="bold" color="red.600" mb={1}>Weaknesses:</Text>
                          {analysisResult.ai_analysis.weaknesses.map((weakness, index) => (
                            <Text key={index} fontSize="xs" color="red.700">• {weakness}</Text>
                          ))}
                        </Box>
                      </VStack>
                    </CardBody>
                  </Card>
                </Grid>

                {/* Applicable Laws */}
                {analysisResult.law_codes.length > 0 && (
                  <Card>
                    <CardBody>
                      <Heading size="md" color={primaryColor} mb={3}>
                        <Icon as={FaBalanceScale} mr={2} />
                        Applicable Laws & Sections
                      </Heading>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        {analysisResult.law_codes.map((law, index) => (
                          <Box key={index} p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
                            <Text fontWeight="bold" color={primaryColor}>{law.act_name}</Text>
                            <Text fontSize="sm" color="blue.600" mb={2}>{law.section}</Text>
                            <Text fontSize="sm" mb={2}>{law.description}</Text>
                            <Text fontSize="xs" color="gray.600" fontStyle="italic">{law.relevance}</Text>
                          </Box>
                        ))}
                      </SimpleGrid>
                    </CardBody>
                  </Card>
                )}

                {/* Precedent Cases */}
                {analysisResult.precedent_cases.length > 0 && (
                  <Card>
                    <CardBody>
                      <Heading size="md" color={primaryColor} mb={3}>
                        <Icon as={FaGavel} mr={2} />
                        Relevant Precedent Cases
                      </Heading>
                      <VStack spacing={4} align="stretch">
                        {analysisResult.precedent_cases.map((case_, index) => (
                          <Box key={index} p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
                            <Flex justify="space-between" align="start" mb={2}>
                              <Box>
                                <Text fontWeight="bold" color={primaryColor}>{case_.case_name}</Text>
                                <Text fontSize="sm" color="gray.600">{case_.citation} | {case_.court} ({case_.year})</Text>
                              </Box>
                              <Badge colorScheme="blue" variant="outline">
                                {Math.round(case_.relevance_score * 100)}% relevance
                              </Badge>
                            </Flex>
                            <Text fontSize="sm">{case_.judgment_summary}</Text>
                          </Box>
                        ))}
                      </VStack>
                    </CardBody>
                  </Card>
                )}

                {/* Recommendations */}
                <Card>
                  <CardBody>
                    <Heading size="md" color={primaryColor} mb={3}>
                      <Icon as={FaLightbulb} mr={2} />
                      Recommendations & Next Steps
                    </Heading>
                    <VStack spacing={4} align="stretch">
                      {analysisResult.recommendations.map((rec, index) => (
                        <Box key={index} p={4} bg={
                          rec.priority === 'high' ? 'red.50' : 
                          rec.priority === 'medium' ? 'yellow.50' : 'blue.50'
                        } borderRadius="md" borderLeft="4px solid" borderLeftColor={
                          rec.priority === 'high' ? 'red.500' : 
                          rec.priority === 'medium' ? 'yellow.500' : 'blue.500'
                        }>
                          <Flex justify="space-between" align="center" mb={2}>
                            <Text fontWeight="bold">{rec.title}</Text>
                            <Badge colorScheme={
                              rec.priority === 'high' ? 'red' : 
                              rec.priority === 'medium' ? 'yellow' : 'blue'
                            }>
                              {rec.priority} priority
                            </Badge>
                          </Flex>
                          <Text fontSize="sm" mb={2}>{rec.description}</Text>
                          <List spacing={1}>
                            {rec.action_items.map((item, itemIndex) => (
                              <ListItem key={itemIndex}>
                                <ListIcon as={FaCheckCircle} color="green.500" />
                                <Text fontSize="xs">{item}</Text>
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      ))}
                    </VStack>
                  </CardBody>
                </Card>

                {/* Procedural Steps */}
                <Card>
                  <CardBody>
                    <Heading size="md" color={primaryColor} mb={3}>Procedural Steps</Heading>
                    <List spacing={2}>
                      {analysisResult.ai_analysis.procedural_steps.map((step, index) => (
                        <ListItem key={index}>
                          <ListIcon as={FaCheckCircle} color="blue.500" />
                          <Text fontSize="sm">{step}</Text>
                        </ListItem>
                      ))}
                    </List>
                  </CardBody>
                </Card>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={() => setShowAnalysisModal(false)}>
              Close Analysis
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              Print Report
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default EnhancedUserDashboard;