// src/pages/LandingPage/LandingPage.tsx - ENHANCED WITH PROPER BRANDING
import React from 'react';
import {
  Box,
  Flex,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Image,
  Grid,
  GridItem,
  Icon,
  useColorModeValue,
  Badge,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { 
  FaBalanceScale, 
  FaGavel, 
  FaBook, 
  FaShieldAlt,
  FaRocket,
  FaBrain,
  FaChartLine,
  FaUsers,
  FaStar
} from 'react-icons/fa';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBrand } from '../../contexts/BrandContext';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { logoUrl, companyName } = useBrand();
  
  const primaryColor = "#1A365D";
  const goldColor = "#D4AF37";
  const bgGradient = useColorModeValue(
    'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)'
  );

  // If user is already logged in, redirect to dashboard
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <Box minH="100vh" bg={bgGradient}>
      {/* Navigation Header */}
      <Box bg="white" boxShadow="sm" position="sticky" top={0} zIndex={100}>
        <Container maxW="7xl" py={4}>
          <Flex justify="space-between" align="center">
            <Flex align="center">
              <Image src={logoUrl} alt={`${companyName} Logo`} height="50px" mr={4} />
              <Heading size="lg" color={primaryColor} fontFamily="Playfair Display, serif">
                {companyName}
              </Heading>
            </Flex>
            <HStack spacing={4}>
              <Button
                as={RouterLink}
                to="/login"
                variant="outline"
                borderColor={primaryColor}
                color={primaryColor}
                _hover={{ bg: `${primaryColor}15` }}
              >
                Sign In
              </Button>
              <Button
                as={RouterLink}
                to="/register"
                bg={goldColor}
                color={primaryColor}
                _hover={{ bg: `${goldColor}90` }}
              >
                Get Started
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Hero Section */}
      <Container maxW="7xl" py={20}>
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={12} alignItems="center">
          <VStack align="start" spacing={8}>
            <Badge bg={`${goldColor}20`} color={goldColor} px={4} py={2} borderRadius="full">
              AI-Powered Legal Technology
            </Badge>
            
            <Heading 
              size="3xl" 
              color={primaryColor} 
              fontFamily="Playfair Display, serif"
              lineHeight="1.2"
            >
              Advanced Legal Technology at Your Fingertips
            </Heading>
            
            <Text fontSize="xl" color="gray.600" lineHeight="1.6">
              Powered by <strong>InLegalBERT</strong> and cutting-edge AI, LexAssist provides 
              comprehensive legal analysis, case research, and document processing for modern 
              legal professionals.
            </Text>

            <HStack spacing={6} color={goldColor} fontSize="2xl">
              <Icon as={FaBalanceScale} />
              <Icon as={FaGavel} />
              <Icon as={FaBook} />
              <Icon as={FaBrain} />
            </HStack>

            <VStack align="start" spacing={4} w="full">
              <Button
                as={RouterLink}
                to="/register"
                size="lg"
                bg={primaryColor}
                color="white"
                _hover={{ bg: "#2A4A6B", transform: "translateY(-2px)" }}
                transition="all 0.3s ease"
                leftIcon={<Icon as={FaRocket} />}
              >
                Start Free Trial
              </Button>
              
              <Text fontSize="sm" color="gray.500">
                <Icon as={FaShieldAlt} color={goldColor} mr={2} />
                Protected by enterprise-grade security
              </Text>
            </VStack>
          </VStack>

          <Box>
            <Box
              bg="white"
              borderRadius="2xl"
              boxShadow="2xl"
              p={8}
              border="1px"
              borderColor="gray.200"
              position="relative"
            >
              {/* Mock Dashboard Preview */}
              <VStack spacing={4} align="stretch">
                <Flex justify="space-between" align="center">
                  <Text fontWeight="bold" color={primaryColor}>Dashboard Preview</Text>
                  <Badge colorScheme="green">Live</Badge>
                </Flex>
                
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <Card size="sm" bg={`${primaryColor}10`}>
                    <CardBody>
                      <Text fontSize="2xl" fontWeight="bold" color={primaryColor}>12</Text>
                      <Text fontSize="sm" color="gray.600">Active Cases</Text>
                    </CardBody>
                  </Card>
                  <Card size="sm" bg={`${goldColor}10`}>
                    <CardBody>
                      <Text fontSize="2xl" fontWeight="bold" color={goldColor}>86%</Text>
                      <Text fontSize="sm" color="gray.600">Success Rate</Text>
                    </CardBody>
                  </Card>
                </Grid>
                
                <Box h="100px" bg="gray.50" borderRadius="md" position="relative">
                  <Flex h="full" align="center" justify="center" color="gray.400">
                    <Icon as={FaChartLine} fontSize="2xl" mr={2} />
                    <Text>Case Analytics Chart</Text>
                  </Flex>
                </Box>
              </VStack>
            </Box>
          </Box>
        </Grid>
      </Container>

      {/* Features Section */}
      <Box bg="white" py={20}>
        <Container maxW="7xl">
          <VStack spacing={12}>
            <VStack spacing={4} textAlign="center">
              <Heading size="xl" color={primaryColor} fontFamily="Playfair Display, serif">
                Why Choose LexAssist?
              </Heading>
              <Text fontSize="lg" color="gray.600" maxW="2xl">
                Built specifically for Indian legal system with advanced AI capabilities
              </Text>
            </VStack>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={8}>
              <Card borderTop="4px" borderTopColor={primaryColor} _hover={{ transform: "translateY(-4px)" }} transition="all 0.3s ease">
                <CardBody>
                  <VStack spacing={4}>
                    <Box p={4} bg={`${primaryColor}15`} borderRadius="full">
                      <Icon as={FaBrain} color={primaryColor} fontSize="2xl" />
                    </Box>
                    <Heading size="md" color={primaryColor}>AI-Powered Analysis</Heading>
                    <Text textAlign="center" color="gray.600">
                      Advanced InLegalBERT model trained specifically on Indian legal corpus for precise analysis
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card borderTop="4px" borderTopColor={goldColor} _hover={{ transform: "translateY(-4px)" }} transition="all 0.3s ease">
                <CardBody>
                  <VStack spacing={4}>
                    <Box p={4} bg={`${goldColor}15`} borderRadius="full">
                      <Icon as={FaBook} color={goldColor} fontSize="2xl" />
                    </Box>
                    <Heading size="md" color={primaryColor}>Comprehensive Research</Heading>
                    <Text textAlign="center" color="gray.600">
                      Access to vast legal database with instant case law, statutes, and precedent retrieval
                    </Text>
                  </VStack>
                </CardBody>
              </Card>

              <Card borderTop="4px" borderTopColor="green.500" _hover={{ transform: "translateY(-4px)" }} transition="all 0.3s ease">
                <CardBody>
                  <VStack spacing={4}>
                    <Box p={4} bg="green.50" borderRadius="full">
                      <Icon as={FaChartLine} color="green.500" fontSize="2xl" />
                    </Box>
                    <Heading size="md" color={primaryColor}>Smart Analytics</Heading>
                    <Text textAlign="center" color="gray.600">
                      Track case progress, success rates, and get insights for better legal strategy
                    </Text>
                  </VStack>
                </CardBody>
              </Card>
            </Grid>
          </VStack>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box bg={`${primaryColor}05`} py={20}>
        <Container maxW="7xl">
          <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={8}>
            <VStack>
              <Text fontSize="4xl" fontWeight="bold" color={primaryColor}>1000+</Text>
              <Text color="gray.600">Legal Professionals</Text>
            </VStack>
            <VStack>
              <Text fontSize="4xl" fontWeight="bold" color={goldColor}>95%</Text>
              <Text color="gray.600">Accuracy Rate</Text>
            </VStack>
            <VStack>
              <Text fontSize="4xl" fontWeight="bold" color="green.500">24/7</Text>
              <Text color="gray.600">AI Support</Text>
            </VStack>
            <VStack>
              <Text fontSize="4xl" fontWeight="bold" color="purple.500">50M+</Text>
              <Text color="gray.600">Legal Documents</Text>
            </VStack>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box bg={primaryColor} py={20}>
        <Container maxW="7xl">
          <VStack spacing={8} textAlign="center">
            <Heading size="xl" color="white" fontFamily="Playfair Display, serif">
              Ready to Transform Your Legal Practice?
            </Heading>
            <Text fontSize="lg" color="gray.300" maxW="2xl">
              Join thousands of legal professionals who trust LexAssist for their AI-powered legal research and analysis
            </Text>
            <HStack spacing={4}>
              <Button
                as={RouterLink}
                to="/register"
                size="lg"
                bg={goldColor}
                color={primaryColor}
                _hover={{ bg: `${goldColor}90`, transform: "translateY(-2px)" }}
                transition="all 0.3s ease"
              >
                Start Free Trial
              </Button>
              <Button
                as={RouterLink}
                to="/login"
                size="lg"
                variant="outline"
                borderColor="white"
                color="white"
                _hover={{ bg: "whiteAlpha.200" }}
              >
                Sign In
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Footer */}
      <Box bg="gray.900" py={12}>
        <Container maxW="7xl">
          <Flex justify="center" align="center">
            <Text color="gray.400" textAlign="center">
              © 2025 {companyName}. All rights reserved. | 
              <Text as="span" color={goldColor} ml={2}>
                Powered by InLegalBERT & Advanced AI
              </Text>
            </Text>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;