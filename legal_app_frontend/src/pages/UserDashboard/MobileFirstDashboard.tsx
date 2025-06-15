// legal_app_frontend/src/pages/UserDashboard/MobileFirstDashboard.tsx
import { useState } from 'react';
import { User, AnalysisResults, MobileFirstDashboardProps } from '../../types';
import { IconType } from 'react-icons';
import {
  Box,
  Flex,
  Heading,
  Text,
  Image,
  SimpleGrid,
  Icon,
  Stack,
  Badge,
  useColorModeValue,
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Button,
  Container,
  VStack,
  HStack,
  Card,
  CardBody
} from '@chakra-ui/react';
import { FaFolder, FaFileAlt, FaClock, FaSearch, FaPlus } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';

interface Case {
  id: number;
  title: string;
  status: string;
  updated: string;
}

interface Document {
  id: number;
  title: string;
  type: string;
  updated: string;
}

interface Deadline {
  id: number;
  title: string;
  date: string;
}

interface QuickAction {
  icon: IconType;
  title: string;
  color: string;
}

const MobileFirstDashboard: React.FC<MobileFirstDashboardProps> = ({ 
  user, 
  onBriefSubmit, 
  isAnalyzing, 
  analysisResults, 
  hasAccess 
}) => {
  const { logoUrl } = useBrand();
  
  // ✅ Fixed: Get user's name properly with proper typing
  const userName = user?.full_name || user?.name || user?.email?.split('@')[0] || 'User';
  
  const [stats, setStats] = useState({
    activeCases: 0,
    documents: 0,
    deadlines: 0,
  });
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headerBg = useColorModeValue('gray.50', 'gray.900');
  const primaryColor = "rgb(7, 71, 94)";
  const goldColor = "rgb(242, 190, 34)";
  
  // Mock data - will be replaced with real data later
  const cases: Case[] = [];
  const documents: Document[] = [];
  const deadlines: Deadline[] = [];
  
  const quickActions: QuickAction[] = [
    { icon: FaPlus, title: 'New Case Brief Entry', color: primaryColor },
    { icon: FaFileAlt, title: 'Upload Document', color: goldColor },
    { icon: FaSearch, title: 'Legal Research', color: "purple.500" },
    { icon: FaClock, title: 'Add Reminder', color: "orange.500" },
  ];

  return (
    <Box bg={useColorModeValue('gray.50', 'gray.900')} minH="100vh">
      {/* Mobile-Optimized Container */}
      <Container maxW="100%" px={4} py={6}>
        
        {/* Welcome Header - Mobile Optimized */}
        <Card
          bg={headerBg}
          borderRadius="2xl"
          mb={6}
          boxShadow="lg"
          border="1px solid"
          borderColor={borderColor}
          overflow="hidden"
        >
          <CardBody p={6}>
            <VStack spacing={4}>
              <Image
                src={logoUrl || "/images/logo.png"}
                alt="LexAssist Logo"
                height="50px"
                borderRadius="md"
              />
              <VStack spacing={2}>
                <Heading 
                  size="xl" 
                  color={primaryColor} 
                  textAlign="center"
                  fontFamily="Playfair Display, serif"
                  lineHeight="1.2"
                >
                  Welcome Back, {userName}
                </Heading>
                <Text 
                  fontSize="md" 
                  color="gray.600" 
                  textAlign="center"
                  fontWeight="medium"
                >
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
                <Badge 
                  colorScheme="blue" 
                  fontSize="sm" 
                  px={3} 
                  py={1} 
                  borderRadius="full"
                >
                  {stats.activeCases} cases active
                </Badge>
              </VStack>
            </VStack>
          </CardBody>
        </Card>
        
        {/* Stats Cards - Mobile Optimized Grid */}
        <SimpleGrid columns={2} spacing={4} mb={6}>
          <Card
            bg={cardBg}
            borderRadius="xl"
            boxShadow="md"
            borderTop="4px solid"
            borderTopColor={primaryColor}
            _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
            transition="all 0.3s ease"
          >
            <CardBody p={5}>
              <VStack spacing={3}>
                <Box 
                  p={3} 
                  bg={`${primaryColor}15`} 
                  borderRadius="full"
                >
                  <Icon as={FaFolder} boxSize={6} color={primaryColor} />
                </Box>
                <Text fontWeight="bold" fontSize="3xl" color={primaryColor}>
                  {stats.activeCases}
                </Text>
                <Text 
                  fontSize="sm" 
                  color="gray.600" 
                  textAlign="center" 
                  fontWeight="medium"
                >
                  Active Cases
                </Text>
              </VStack>
            </CardBody>
          </Card>
          
          <Card
            bg={cardBg}
            borderRadius="xl"
            boxShadow="md"
            borderTop="4px solid"
            borderTopColor="orange.400"
            _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
            transition="all 0.3s ease"
          >
            <CardBody p={5}>
              <VStack spacing={3}>
                <Box 
                  p={3} 
                  bg="orange.50" 
                  borderRadius="full"
                >
                  <Icon as={FaClock} boxSize={6} color="orange.400" />
                </Box>
                <Text fontWeight="bold" fontSize="3xl" color="orange.400">
                  {stats.deadlines}
                </Text>
                <Text 
                  fontSize="sm" 
                  color="gray.600" 
                  textAlign="center" 
                  fontWeight="medium"
                >
                  Pending Deadlines
                </Text>
              </VStack>
            </CardBody>
          </Card>
          
          <Card
            bg={cardBg}
            borderRadius="xl"
            boxShadow="md"
            borderTop="4px solid"
            borderTopColor="blue.400"
            _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
            transition="all 0.3s ease"
          >
            <CardBody p={5}>
              <VStack spacing={3}>
                <Box 
                  p={3} 
                  bg="blue.50" 
                  borderRadius="full"
                >
                  <Icon as={FaFileAlt} boxSize={6} color="blue.400" />
                </Box>
                <Text fontWeight="bold" fontSize="3xl" color="blue.400">
                  {stats.documents}
                </Text>
                <Text 
                  fontSize="sm" 
                  color="gray.600" 
                  textAlign="center" 
                  fontWeight="medium"
                >
                  Documents Reviewed
                </Text>
              </VStack>
            </CardBody>
          </Card>
          
          <Card
            bg={cardBg}
            borderRadius="xl"
            boxShadow="md"
            borderTop="4px solid"
            borderTopColor="green.400"
            _hover={{ transform: 'translateY(-2px)', boxShadow: 'lg' }}
            transition="all 0.3s ease"
          >
            <CardBody p={5}>
              <VStack spacing={3}>
                <Box 
                  p={3} 
                  bg="green.50" 
                  borderRadius="full"
                >
                  <Icon as={FaSearch} boxSize={6} color="green.400" />
                </Box>
                <Text fontWeight="bold" fontSize="3xl" color="green.400">
                  0%
                </Text>
                <Text 
                  fontSize="sm" 
                  color="gray.600" 
                  textAlign="center" 
                  fontWeight="medium"
                >
                  Success Rate
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>
        
        {/* Main Action Button - Mobile Optimized */}
        <Card bg={goldColor} borderRadius="2xl" mb={6} boxShadow="lg">
          <CardBody p={0}>
            <Button
              leftIcon={<Icon as={FaPlus} boxSize={5} />}
              bg="transparent"
              color={primaryColor}
              size="lg"
              width="full"
              height="70px"
              borderRadius="2xl"
              fontSize="lg"
              fontWeight="700"
              _hover={{
                transform: "scale(1.02)",
                boxShadow: "xl"
              }}
              transition="all 0.3s ease"
              onClick={() => {
                console.log('New Case Brief Entry clicked');
              }}
            >
              New Case Brief Entry
            </Button>
          </CardBody>
        </Card>
        
        {/* Content Tabs - Mobile Optimized */}
        <Card bg={cardBg} borderRadius="2xl" boxShadow="lg">
          <CardBody p={0}>
            <Tabs variant="soft-rounded" colorScheme="blue">
              <TabList mb={4} bg="gray.50" mx={4} mt={4} p={1} borderRadius="xl">
                <Tab 
                  _selected={{ color: 'white', bg: primaryColor }}
                  fontSize="sm"
                  fontWeight="600"
                  flex={1}
                  borderRadius="lg"
                >
                  Case Analytics
                </Tab>
                <Tab 
                  _selected={{ color: 'white', bg: primaryColor }}
                  fontSize="sm"
                  fontWeight="600"
                  flex={1}
                  borderRadius="lg"
                >
                  Recent Cases
                </Tab>
              </TabList>
              
              <TabPanels>
                {/* Case Analytics Tab */}
                <TabPanel px={6} pb={6}>
                  <VStack spacing={4}>
                    <Icon as={FaSearch} boxSize={12} color="gray.300" />
                    <Text 
                      color="gray.500" 
                      fontSize="lg" 
                      fontWeight="medium"
                      textAlign="center"
                    >
                      No case data available yet
                    </Text>
                    <Text 
                      color="gray.400" 
                      fontSize="sm" 
                      textAlign="center"
                      lineHeight="1.5"
                    >
                      Submit your first case brief to see detailed analytics and insights
                    </Text>
                  </VStack>
                </TabPanel>
                
                {/* Recent Cases Tab */}
                <TabPanel px={6} pb={6}>
                  <VStack spacing={4}>
                    <Icon as={FaFolder} boxSize={12} color="gray.300" />
                    <Text 
                      color="gray.500" 
                      fontSize="lg" 
                      fontWeight="medium"
                      textAlign="center"
                    >
                      No cases yet
                    </Text>
                    <Text 
                      color="gray.400" 
                      fontSize="sm" 
                      textAlign="center"
                      lineHeight="1.5"
                      mb={4}
                    >
                      Create your first case to get started with legal analysis
                    </Text>
                    <Button
                      size="md"
                      colorScheme="blue"
                      variant="outline"
                      borderRadius="lg"
                      px={6}
                      onClick={() => {
                        console.log('View all cases clicked');
                      }}
                    >
                      Create First Case
                    </Button>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </Container>
    </Box>
  );
};

export default MobileFirstDashboard;