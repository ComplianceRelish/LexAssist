// src/pages/UserDashboard/MobileFirstDashboard.tsx
import { useState } from 'react';
import { User, AnalysisResults, MobileFirstDashboardProps } from '../../types';
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
  TabPanel
} from '@chakra-ui/react';
import { FaFolder, FaFileAlt, FaClock, FaSearch } from 'react-icons/fa';
import { useBrand } from '../../contexts/BrandContext';
import type { IconType } from 'react-icons';

// Define types for our data
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

const MobileFirstDashboard: React.FC<MobileFirstDashboardProps> = ({ user, onBriefSubmit, isAnalyzing, analysisResults, hasAccess }) => {
  const { logoUrl } = useBrand();
  const [stats, setStats] = useState({
    activeCases: 5,
    documents: 12,
    deadlines: 3,
  });
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headerBg = useColorModeValue('brand.background', 'gray.900');
  const primaryColor = "rgb(7, 71, 94)"; // Deep teal blue
  
  // Mock data for demonstration
  const cases: Case[] = [
    { id: 1, title: 'Smith vs. Johnson', status: 'Active', updated: '2025-05-30' },
    { id: 2, title: 'Estate Planning - R. Williams', status: 'Pending', updated: '2025-06-01' },
  ];
  
  const documents: Document[] = [
    { id: 1, title: 'Legal Brief - Case #1242', type: 'PDF', updated: '2025-06-01' },
    { id: 2, title: 'Contract Agreement', type: 'DOCX', updated: '2025-05-29' },
  ];
  
  const deadlines: Deadline[] = [
    { id: 1, title: 'Filing Deadline - Smith Case', date: '2025-06-05' },
    { id: 2, title: 'Client Meeting - Williams', date: '2025-06-03' },
  ];
  
  const quickActions: QuickAction[] = [
    { icon: FaFolder, title: 'New Case', color: primaryColor },
    { icon: FaFileAlt, title: 'Upload Document', color: "rgb(242, 190, 34)" },
    { icon: FaSearch, title: 'Legal Research', color: "purple.500" },
    { icon: FaClock, title: 'Add Reminder', color: "orange.500" },
  ];

  return (
    <Box px={4} pb={4}>
      {/* Welcome Banner with Logo - Mobile Optimized */}
      <Flex
        direction="column"
        align="center"
        bg={headerBg}
        p={4}
        borderRadius="lg"
        mb={4}
        boxShadow="sm"
      >
        <Image
          src={logoUrl}
          alt="LexAssist Logo"
          height="50px"
          mb={2}
        />
        <Heading size="md" color={primaryColor} textAlign="center">
          Welcome, User
        </Heading>
        <Text fontSize="sm" color="gray.500">
          Today is {new Date().toLocaleDateString()}
        </Text>
      </Flex>
      
      {/* Stats Cards - Mobile Optimized */}
      <SimpleGrid columns={3} spacingX={3} spacingY={3} mb={4}>
        <Stack
          bg={cardBg}
          p={3}
          borderRadius="lg"
          shadow="sm"
          borderTop="3px solid"
          borderTopColor={primaryColor}
          align="center"
          spacing={1}
        >
          <Icon as={FaFolder} boxSize={6} color={primaryColor} mb={2} />
          <Text fontWeight="bold" fontSize="xl">{stats.activeCases}</Text>
          <Text fontSize="xs" color="gray.500">Cases</Text>
        </Stack>
        
        <Stack
          bg={cardBg}
          p={3}
          borderRadius="lg"
          shadow="sm"
          borderTop="3px solid"
          borderTopColor="rgb(242, 190, 34)"
          align="center"
          spacing={1}
        >
          <Icon as={FaFileAlt} boxSize={6} color="rgb(242, 190, 34)" mb={2} />
          <Text fontWeight="bold" fontSize="xl">{stats.documents}</Text>
          <Text fontSize="xs" color="gray.500">Docs</Text>
        </Stack>
        
        <Stack
          bg={cardBg}
          p={3}
          borderRadius="lg"
          shadow="sm"
          borderTop="3px solid"
          borderTopColor="red.500"
          align="center"
          spacing={1}
        >
          <Icon as={FaClock} boxSize={6} color="red.500" mb={2} />
          <Text fontWeight="bold" fontSize="xl">{stats.deadlines}</Text>
          <Text fontSize="xs" color="gray.500">Due Soon</Text>
        </Stack>
      </SimpleGrid>
      
      {/* Tabbed Interface for Mobile */}
      <Tabs isFitted variant="enclosed" colorScheme="blue">
        <TabList mb="1em">
          <Tab _selected={{ color: primaryColor, borderColor: primaryColor, borderBottomColor: 'transparent' }}>
            Cases
          </Tab>
          <Tab _selected={{ color: primaryColor, borderColor: primaryColor, borderBottomColor: 'transparent' }}>
            Documents
          </Tab>
          <Tab _selected={{ color: primaryColor, borderColor: primaryColor, borderBottomColor: 'transparent' }}>
            Deadlines
          </Tab>
        </TabList>
        
        <TabPanels>
          {/* Cases Tab */}
          <TabPanel p={0}>
            <Stack spacing={3} align="stretch">
              {cases.map(caseItem => (
                <Box 
                  key={caseItem.id}
                  p={3} 
                  bg={cardBg} 
                  borderRadius="md" 
                  boxShadow="sm"
                  borderLeft="3px solid"
                  borderLeftColor={primaryColor}
                >
                  <Flex justify="space-between" align="center">
                    <Stack align="start" spacing={0}>
                      <Text fontWeight="bold">{caseItem.title}</Text>
                      <Text fontSize="xs" color="gray.500">
                        Updated: {caseItem.updated}
                      </Text>
                    </Stack>
                    <Badge colorScheme={caseItem.status === 'Active' ? 'green' : 'yellow'}>
                      {caseItem.status}
                    </Badge>
                  </Flex>
                </Box>
              ))}
              <Text fontSize="sm" color={primaryColor} textAlign="center" mt={2}>
                View All Cases
              </Text>
            </Stack>
          </TabPanel>
          
          {/* Documents Tab */}
          <TabPanel p={0}>
            <Stack spacing={3} align="stretch">
              {documents.map(doc => (
                <Box 
                  key={doc.id}
                  p={3} 
                  bg={cardBg} 
                  borderRadius="md" 
                  boxShadow="sm"
                  borderLeft="3px solid"
                  borderLeftColor="rgb(242, 190, 34)"
                >
                  <Flex justify="space-between" align="center">
                    <Stack align="start" spacing={0}>
                      <Text fontWeight="bold">{doc.title}</Text>
                      <Text fontSize="xs" color="gray.500">
                        Updated: {doc.updated}
                      </Text>
                    </Stack>
                    <Badge colorScheme={doc.type === 'PDF' ? 'red' : 'blue'}>
                      {doc.type}
                    </Badge>
                  </Flex>
                </Box>
              ))}
              <Text fontSize="sm" color={primaryColor} textAlign="center" mt={2}>
                View All Documents
              </Text>
            </Stack>
          </TabPanel>
          
          {/* Deadlines Tab */}
          <TabPanel p={0}>
            <Stack spacing={3} align="stretch">
              {deadlines.map(deadline => (
                <Box 
                  key={deadline.id}
                  p={3} 
                  bg={cardBg} 
                  borderRadius="md" 
                  boxShadow="sm"
                  borderLeft="3px solid"
                  borderLeftColor="red.500"
                >
                  <Flex justify="space-between" align="center">
                    <Text fontWeight="bold">{deadline.title}</Text>
                    <Text fontSize="sm" color="red.500" fontWeight="bold">
                      {deadline.date}
                    </Text>
                  </Flex>
                </Box>
              ))}
              <Text fontSize="sm" color={primaryColor} textAlign="center" mt={2}>
                View All Deadlines
              </Text>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* Quick Actions Section */}
      <Box mt={6} mb={3}>
        <Heading size="sm" mb={2}>Quick Actions</Heading>
        <SimpleGrid columns={2} spacingX={3} spacingY={3}>
          {quickActions.map((action, index) => (
            <Stack
              key={index}
              p={4}
              bg={cardBg}
              borderRadius="md"
              boxShadow="sm"
              align="center"
              spacing={2}
            >
              <Icon as={action.icon} boxSize={6} color={action.color} />
              <Text fontSize="sm" fontWeight="medium">{action.title}</Text>
            </Stack>
          ))}
        </SimpleGrid>
      </Box>
    </Box>
  );
};

export default MobileFirstDashboard;
