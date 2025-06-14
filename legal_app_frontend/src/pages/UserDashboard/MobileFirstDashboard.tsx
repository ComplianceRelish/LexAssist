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
  Container
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
  
  // ✅ Fixed: Get user's name properly without firstName
  const userName = user?.name || user?.email?.split('@')[0] || 'User';
  
  const [stats, setStats] = useState({
    activeCases: 0,
    documents: 0,
    deadlines: 0,
  });
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headerBg = useColorModeValue('gray.50', 'gray.900');
  const primaryColor = "rgb(7, 71, 94)";
  
  // Mock data - will be replaced with real data later
  const cases: Case[] = [];
  const documents: Document[] = [];
  const deadlines: Deadline[] = [];
  
  const quickActions: QuickAction[] = [
    { icon: FaPlus, title: 'New Case Brief Entry', color: primaryColor },
    { icon: FaFileAlt, title: 'Upload Document', color: "rgb(242, 190, 34)" },
    { icon: FaSearch, title: 'Legal Research', color: "purple.500" },
    { icon: FaClock, title: 'Add Reminder', color: "orange.500" },
  ];

  return (
    <Container maxW="100%" p={0} bg={useColorModeValue('gray.50', 'gray.900')} minH="100vh">
      <Box px={4} py={4}>
        {/* Welcome Banner - Fixed for mobile */}
        <Flex
          direction="column"
          align="center"
          bg={headerBg}
          p={6}
          borderRadius="xl"
          mb={6}
          boxShadow="sm"
          border="1px solid"
          borderColor={borderColor}
        >
          <Image
            src={logoUrl || "/images/logo.png"}
            alt="LexAssist Logo"
            height="60px"
            mb={3}
          />
          <Heading size="lg" color={primaryColor} textAlign="center" mb={2}>
            Welcome Back, {userName}
          </Heading>
          <Text fontSize="sm" color="gray.600" textAlign="center">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} • {stats.activeCases} cases active
          </Text>
        </Flex>
        
        {/* Stats Cards - Mobile Optimized */}
        <SimpleGrid columns={4} spacing={3} mb={6}>
          <Stack
            bg={cardBg}
            p={4}
            borderRadius="lg"
            shadow="sm"
            borderTop="4px solid"
            borderTopColor={primaryColor}
            align="center"
            spacing={2}
            minH="100px"
          >
            <Icon as={FaFolder} boxSize={5} color={primaryColor} />
            <Text fontWeight="bold" fontSize="2xl" color={primaryColor}>
              {stats.activeCases}
            </Text>
            <Text fontSize="xs" color="gray.500" textAlign="center" lineHeight="1.2">
              Active<br />Cases
            </Text>
          </Stack>
          
          <Stack
            bg={cardBg}
            p={4}
            borderRadius="lg"
            shadow="sm"
            borderTop="4px solid"
            borderTopColor="orange.400"
            align="center"
            spacing={2}
            minH="100px"
          >
            <Icon as={FaFileAlt} boxSize={5} color="orange.400" />
            <Text fontWeight="bold" fontSize="2xl" color="orange.400">
              {stats.deadlines}
            </Text>
            <Text fontSize="xs" color="gray.500" textAlign="center" lineHeight="1.2">
              Pending<br />Deadlines
            </Text>
          </Stack>
          
          <Stack
            bg={cardBg}
            p={4}
            borderRadius="lg"
            shadow="sm"
            borderTop="4px solid"
            borderTopColor="blue.400"
            align="center"
            spacing={2}
            minH="100px"
          >
            <Icon as={FaSearch} boxSize={5} color="blue.400" />
            <Text fontWeight="bold" fontSize="2xl" color="blue.400">
              {stats.documents}
            </Text>
            <Text fontSize="xs" color="gray.500" textAlign="center" lineHeight="1.2">
              Documents<br />Reviewed
            </Text>
          </Stack>
          
          <Stack
            bg={cardBg}
            p={4}
            borderRadius="lg"
            shadow="sm"
            borderTop="4px solid"
            borderTopColor="green.400"
            align="center"
            spacing={2}
            minH="100px"
          >
            <Icon as={FaClock} boxSize={5} color="green.400" />
            <Text fontWeight="bold" fontSize="2xl" color="green.400">
              0%
            </Text>
            <Text fontSize="xs" color="gray.500" textAlign="center" lineHeight="1.2">
              Success<br />Rate
            </Text>
          </Stack>
        </SimpleGrid>
        
        {/* Main Action Button */}
        <Button
          leftIcon={<FaPlus />}
          colorScheme="yellow"
          bg="rgb(242, 190, 34)"
          color="black"
          size="lg"
          width="full"
          mb={6}
          borderRadius="lg"
          py={6}
          fontSize="lg"
          fontWeight="600"
          _hover={{
            bg: "rgb(220, 170, 20)",
            transform: "translateY(-2px)",
            boxShadow: "lg"
          }}
          onClick={() => {
            // Handle new case brief entry
            console.log('New Case Brief Entry clicked');
          }}
        >
          + New Case Brief Entry
        </Button>
        
        {/* Content Tabs */}
        <Tabs variant="soft-rounded" colorScheme="blue" isFitted>
          <TabList mb={4} bg={cardBg} p={1} borderRadius="lg">
            <Tab 
              _selected={{ color: 'white', bg: primaryColor }}
              fontSize="sm"
              fontWeight="medium"
            >
              Case Analytics
            </Tab>
            <Tab 
              _selected={{ color: 'white', bg: primaryColor }}
              fontSize="sm"
              fontWeight="medium"
            >
              Recent Cases
            </Tab>
          </TabList>
          
          <TabPanels>
            {/* Case Analytics Tab */}
            <TabPanel p={0}>
              <Box
                bg={cardBg}
                p={6}
                borderRadius="lg"
                boxShadow="sm"
                textAlign="center"
              >
                <Text color="gray.500" fontSize="lg" mb={4}>
                  No case data available yet
                </Text>
                <Text color="gray.400" fontSize="sm">
                  Submit your first case brief to see analytics
                </Text>
              </Box>
            </TabPanel>
            
            {/* Recent Cases Tab */}
            <TabPanel p={0}>
              <Box
                bg={cardBg}
                p={6}
                borderRadius="lg"
                boxShadow="sm"
                textAlign="center"
              >
                <Text color="gray.500" fontSize="lg" mb={2}>
                  No cases yet.
                </Text>
                <Text color="gray.400" fontSize="sm" mb={4}>
                  Create your first case
                </Text>
                <Button
                  size="sm"
                  colorScheme="blue"
                  variant="outline"
                  onClick={() => {
                    console.log('View all cases clicked');
                  }}
                >
                  View All Cases
                </Button>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Container>
  );
};

export default MobileFirstDashboard;