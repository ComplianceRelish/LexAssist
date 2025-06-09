// legal_app_frontend/src/pages/AdminDashboard.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Input,
  Badge,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Switch,
  FormControl,
  FormLabel,
  useColorModeValue,
  Alert,
  AlertIcon,
  Flex,
  Grid,
  GridItem,
  Progress
} from '@chakra-ui/react';
import { AdminDashboardProps } from '../types';

// ✅ REMOVED THE PROBLEMATIC CSS IMPORT
// import './AdminDashboard.css';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const navigate = useNavigate();
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const primaryColor = "rgb(7, 71, 94)";
  
  // State for users and analytics data
  const [users, setUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    totalUsers: 0,
    activeSubscriptions: {
      free: 0,
      pro: 0,
      enterprise: 0
    },
    monthlyRevenue: '₹0',
    averageUsageTime: '0 minutes',
    topFeatures: []
  });
  
  const [settings, setSettings] = useState<any>({
    apiKeys: {
      indianKanoon: '',
      supabase: ''
    },
    currencies: [
      { code: 'INR', symbol: '₹', name: 'Indian Rupee' }
    ],
    features: {
      voiceInput: false,
      caseFileDrafting: false,
      judgmentPrediction: false
    }
  });
  
  // Fetch data when component mounts
  React.useEffect(() => {
    // In production, these would make API calls to fetch real data
    fetchUsers();
    fetchAnalytics();
    fetchSettings();
  }, []);
  
  // These functions would make real API calls in production
  const fetchUsers = async () => {
    try {
      // const response = await apiClient.getAllUsers();
      // setUsers(response);
      setUsers([]);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };
  
  const fetchAnalytics = async () => {
    try {
      // const response = await apiClient.getAnalytics();
      // setAnalytics(response);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };
  
  const fetchSettings = async () => {
    try {
      // const response = await apiClient.getSystemSettings();
      // setSettings(response);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  if (!user) {
    return (
      <Container maxW="7xl" py={8}>
        <Flex justify="center" align="center" h="50vh">
          <Text>Loading admin dashboard...</Text>
        </Flex>
      </Container>
    );
  }

  // Check if user has admin privileges
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return (
      <Container maxW="7xl" py={8}>
        <Alert status="error">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Heading size="md">Access Denied</Heading>
            <Text>You do not have permission to access the admin dashboard.</Text>
            <Button onClick={() => navigate('/')} colorScheme="blue" variant="outline">
              Return to Home
            </Button>
          </VStack>
        </Alert>
      </Container>
    );
  }

  const renderUsersTab = () => {
    return (
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Heading size="md">User Management</Heading>
          <HStack>
            <Button colorScheme="blue" size="sm">Add User</Button>
            <Input placeholder="Search users..." maxW="300px" />
          </HStack>
        </HStack>
        
        <Card bg={cardBg}>
          <CardBody>
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>ID</Th>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    <Th>Subscription</Th>
                    <Th>Registered Date</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {users.length === 0 ? (
                    <Tr>
                      <Td colSpan={7} textAlign="center" py={8}>
                        <Text color="gray.500">No users found</Text>
                      </Td>
                    </Tr>
                  ) : (
                    users.map(user => (
                      <Tr key={user.id}>
                        <Td>{user.id}</Td>
                        <Td>{user.name}</Td>
                        <Td>{user.email}</Td>
                        <Td>
                          <Badge colorScheme={user.role === 'admin' ? 'purple' : 'blue'}>
                            {user.role}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme={
                            user.subscription === 'enterprise' ? 'purple' :
                            user.subscription === 'pro' ? 'blue' : 'gray'
                          }>
                            {user.subscription}
                          </Badge>
                        </Td>
                        <Td>{user.registeredDate}</Td>
                        <Td>
                          <HStack spacing={2}>
                            <Button size="xs" colorScheme="blue" variant="outline">Edit</Button>
                            <Button size="xs" colorScheme="red" variant="outline">Delete</Button>
                          </HStack>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      </VStack>
    );
  };

  const renderAnalyticsTab = () => {
    return (
      <VStack spacing={6} align="stretch">
        <Heading size="md">Analytics Dashboard</Heading>
        
        {/* Stats Cards */}
        <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6}>
          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Total Users</StatLabel>
                <StatNumber>{analytics.totalUsers}</StatNumber>
                <StatHelpText>Active users</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Monthly Revenue</StatLabel>
                <StatNumber>{analytics.monthlyRevenue}</StatNumber>
                <StatHelpText>Current month</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <StatLabel>Avg. Usage Time</StatLabel>
                <StatNumber>{analytics.averageUsageTime}</StatNumber>
                <StatHelpText>Per session</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </Grid>
        
        {/* Subscription Distribution */}
        <Card bg={cardBg}>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="sm">Subscription Distribution</Heading>
              <VStack spacing={3}>
                <HStack justify="space-between" w="full">
                  <Text>Free</Text>
                  <Text>{analytics.activeSubscriptions.free}</Text>
                </HStack>
                <Progress 
                  value={analytics.totalUsers > 0 ? (analytics.activeSubscriptions.free / analytics.totalUsers) * 100 : 0} 
                  colorScheme="gray" 
                  w="full" 
                />
                
                <HStack justify="space-between" w="full">
                  <Text>Pro</Text>
                  <Text>{analytics.activeSubscriptions.pro}</Text>
                </HStack>
                <Progress 
                  value={analytics.totalUsers > 0 ? (analytics.activeSubscriptions.pro / analytics.totalUsers) * 100 : 0} 
                  colorScheme="blue" 
                  w="full" 
                />
                
                <HStack justify="space-between" w="full">
                  <Text>Enterprise</Text>
                  <Text>{analytics.activeSubscriptions.enterprise}</Text>
                </HStack>
                <Progress 
                  value={analytics.totalUsers > 0 ? (analytics.activeSubscriptions.enterprise / analytics.totalUsers) * 100 : 0} 
                  colorScheme="purple" 
                  w="full" 
                />
              </VStack>
            </VStack>
          </CardBody>
        </Card>
        
        {/* Top Features */}
        <Card bg={cardBg}>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="sm">Top Features Used</Heading>
              {analytics.topFeatures.length === 0 ? (
                <Text color="gray.500">No feature data available</Text>
              ) : (
                <VStack align="stretch">
                  {analytics.topFeatures.map((feature: string, index: number) => (
                    <Text key={index}>{feature}</Text>
                  ))}
                </VStack>
              )}
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    );
  };

  const renderSettingsTab = () => {
    return (
      <VStack spacing={6} align="stretch">
        <Heading size="md">System Settings</Heading>
        
        {/* API Keys */}
        <Card bg={cardBg}>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="sm">API Keys</Heading>
              <VStack spacing={3}>
                <HStack w="full">
                  <Text minW="150px">Indian Kanoon API:</Text>
                  <Input type="password" value={settings.apiKeys.indianKanoon} isReadOnly />
                  <Button size="sm" variant="outline">Show</Button>
                  <Button size="sm" colorScheme="blue">Update</Button>
                </HStack>
                <HStack w="full">
                  <Text minW="150px">Supabase API:</Text>
                  <Input type="password" value={settings.apiKeys.supabase} isReadOnly />
                  <Button size="sm" variant="outline">Show</Button>
                  <Button size="sm" colorScheme="blue">Update</Button>
                </HStack>
              </VStack>
            </VStack>
          </CardBody>
        </Card>
        
        {/* Currency Settings */}
        <Card bg={cardBg}>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <Heading size="sm">Currency Settings</Heading>
                <Button size="sm" colorScheme="blue">Add Currency</Button>
              </HStack>
              <TableContainer>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Code</Th>
                      <Th>Symbol</Th>
                      <Th>Name</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {settings.currencies.map((currency: { code: string; symbol: string; name: string }, index: number) => (
                      <Tr key={index}>
                        <Td>{currency.code}</Td>
                        <Td>{currency.symbol}</Td>
                        <Td>{currency.name}</Td>
                        <Td>
                          <HStack spacing={2}>
                            <Button size="xs" colorScheme="blue" variant="outline">Edit</Button>
                            <Button size="xs" colorScheme="red" variant="outline">Delete</Button>
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </VStack>
          </CardBody>
        </Card>
        
        {/* Feature Toggles */}
        <Card bg={cardBg}>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Heading size="sm">Feature Toggles</Heading>
              <VStack spacing={3}>
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="voice-input" mb="0" flex="1">
                    Voice Input
                  </FormLabel>
                  <Switch id="voice-input" isChecked={settings.features.voiceInput} />
                </FormControl>
                
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="case-drafting" mb="0" flex="1">
                    Case File Drafting
                  </FormLabel>
                  <Switch id="case-drafting" isChecked={settings.features.caseFileDrafting} />
                </FormControl>
                
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="judgment-prediction" mb="0" flex="1">
                    Judgment Prediction
                  </FormLabel>
                  <Switch id="judgment-prediction" isChecked={settings.features.judgmentPrediction} />
                </FormControl>
              </VStack>
            </VStack>
          </CardBody>
        </Card>
        
        {/* Actions */}
        <HStack>
          <Button colorScheme="blue">Save Settings</Button>
          <Button variant="outline">Reset to Defaults</Button>
        </HStack>
      </VStack>
    );
  };

  return (
    <Box bg={bgColor} minH="100vh">
      <Container maxW="7xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          {/* Header */}
          <Box>
            <Heading size="lg" color={primaryColor} mb={2}>
              Admin Dashboard
            </Heading>
            <Text color="gray.600">
              Welcome, {user?.name || 'Admin'}. You are logged in as {user?.role || 'admin'}.
            </Text>
          </Box>
          
          {/* Tabs */}
          <Tabs index={activeTab} onChange={setActiveTab}>
            <TabList>
              <Tab>Users</Tab>
              <Tab>Analytics</Tab>
              <Tab>Settings</Tab>
            </TabList>
            
            <TabPanels>
              <TabPanel px={0}>
                {renderUsersTab()}
              </TabPanel>
              <TabPanel px={0}>
                {renderAnalyticsTab()}
              </TabPanel>
              <TabPanel px={0}>
                {renderSettingsTab()}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </Box>
  );
};

export default AdminDashboard;