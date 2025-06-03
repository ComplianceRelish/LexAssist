// src/pages/LandingPage/LandingPage.tsx
import { 
  Box, 
  Button, 
  Container, 
  Flex, 
  Heading, 
  Image, 
  Text, 
  SimpleGrid,
  Stack,
  Icon,
  LinkBox,
  Link,
  BoxProps,
  HeadingProps,
  FlexProps,
  ButtonProps,
  TextProps
} from '@chakra-ui/react';
import { Global, css } from '@emotion/react';
import { Link as RouterLink } from 'react-router-dom';
import { FaBalanceScale, FaSearch, FaFileAlt, FaShieldAlt } from 'react-icons/fa';
import { IconType } from 'react-icons';

// Define feature item interface
interface FeatureItem {
  icon: IconType;
  title: string;
  description: string;
}

const LandingPage = () => {
  // Colors derived from the 3D logo
  const bgColor = "rgb(245, 241, 236)"; // Light beige background from logo
  const primaryColor = "rgb(7, 71, 94)"; // Deep teal blue
  const accentColor = "rgb(242, 190, 34)"; // Golden yellow
  const textColor = "gray.800";
  
  // Feature data
  const features: FeatureItem[] = [
    {
      icon: FaBalanceScale,
      title: 'Legal Document Analysis',
      description: 'Advanced AI algorithms analyze legal documents with high precision and accuracy.'
    },
    {
      icon: FaSearch,
      title: 'Case Research',
      description: 'Comprehensive legal research capabilities with access to extensive case databases.'
    },
    {
      icon: FaFileAlt,
      title: 'Document Management',
      description: 'Secure storage and organization of all your important legal documents.'
    },
    {
      icon: FaShieldAlt,
      title: 'Data Security',
      description: 'End-to-end encryption ensuring your sensitive legal information remains protected.'
    }
  ];

  // Type-safe button props for navigation
  const registerButtonProps: ButtonProps & { as: typeof RouterLink; to: string } = {
    as: RouterLink,
    to: "/register",  // Updated to match the actual registration route
    size: { base: "md", md: "lg" },
    bg: primaryColor,
    color: "white",
    fontWeight: "bold",
    _hover: { bg: 'teal.700' },
    w: { base: '100%', md: 'auto' },
    mb: { base: 2, md: 0 }
  };

  const loginButtonProps: ButtonProps & { as: typeof RouterLink; to: string } = {
    as: RouterLink,
    to: "/login",  // This matches the route in App.tsx
    size: { base: "md", md: "lg" },
    variant: "outline",
    color: primaryColor,
    fontWeight: "bold",
    borderColor: primaryColor,
    _hover: { bg: `${primaryColor}10` },
    w: { base: '100%', md: 'auto' }
  };
  
  return (
    <Box bg={bgColor} minH="100vh">
      {/* Global styles for animations */}
      <Global
        styles={css`
          @keyframes float {
            0% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-15px);
            }
            100% {
              transform: translateY(0px);
            }
          }
          
          .logo-3d {
            animation: float 6s ease-in-out infinite;
            filter: drop-shadow(0 10px 15px rgba(0,0,0,0.15));
          }
          
          @media (prefers-reduced-motion) {
            .logo-3d {
              animation: none;
            }
          }
        `}
      />
      
      {/* Hero Logo Section - Logo at the top */}
      <Container maxW="1200px" pt={{ base: 5, md: 8 }} pb={{ base: 5, md: 6 }} h="calc(100vh - 80px)" display="flex" alignItems="center">
        <Stack spacing={4} w="100%" justifyContent="center">
          {/* Prominent Logo Display as Hero Element */}
          <Box
            w="100%"
            display="flex"
            justifyContent="center"
            alignItems="center"
            py={{ base: 3, md: 5 }}
          >
            <Image
              src="/images/LexAssist_Logo.png"
              alt="LexAssist 3D Logo"
              maxW={{ base: "200px", md: "260px", lg: "320px" }}
              w="100%"
              h="auto"
              objectFit="contain"
              className="logo-static"
            />
          </Box>
          
          {/* Tagline and CTA */}
          <Stack spacing={4} textAlign="center" maxW="800px" mx="auto" px={4}>
            <Heading
              as="h1"
              fontSize={{ base: '2xl', md: '3xl', lg: '4xl' }}
              fontWeight="bold"
              color={primaryColor}
              lineHeight="1.2"
            >
              Empowering Your Legal Journey
            </Heading>
            
            <Stack 
              direction={{ base: 'column', md: 'row' }} 
              spacing={4} 
              pt={4} 
              justify="center"
              width="100%"
            >
              <Button {...registerButtonProps}>
                Register
              </Button>
              <Button {...loginButtonProps}>
                Login
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Container>
      
      {/* Features Section */}
      <Box
        as="section"
        py={{ base: '60px', md: '80px' }}
        bg="white"
        borderTopRadius="3xl"
        boxShadow="0 -10px 30px rgba(0,0,0,0.05)"
      >
        <Container maxW="1200px">
          <Stack spacing={12}>
            <Stack spacing={3} align="center">
              <Heading
                as="h2"
                fontSize={{ base: '2xl', md: '3xl' }}
                fontWeight="bold"
                color={primaryColor}
                textAlign="center"
              >
                Powerful Legal Tools
              </Heading>
              <Text
                fontSize={{ base: 'md', md: 'lg' }}
                color={textColor}
                textAlign="center"
                maxW="800px"
              >
                Designed for legal professionals, our platform offers comprehensive tools to streamline your workflow
              </Text>
            </Stack>
            
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacingX={8} spacingY={8}>
              {features.map((feature, index) => (
                <Stack
                  key={index}
                  p={6}
                  bg="white"
                  borderRadius="lg"
                  boxShadow="md"
                  alignItems="flex-start"
                  borderTop="4px solid"
                  borderTopColor={index % 2 === 0 ? primaryColor : accentColor}
                  transition="transform 0.3s ease"
                  _hover={{ transform: 'translateY(-5px)' }}
                  spacing={3}
                >
                  <Box
                    borderRadius="full"
                    bg={index % 2 === 0 ? `${primaryColor}20` : `${accentColor}20`}
                    p={3}
                  >
                    <Icon
                      as={feature.icon}
                      boxSize={6}
                      color={index % 2 === 0 ? primaryColor : accentColor}
                    />
                  </Box>
                  <Heading as="h3" fontSize="lg" fontWeight="bold" color={primaryColor}>
                    {feature.title}
                  </Heading>
                  <Text fontSize="sm" color="gray.600">
                    {feature.description}
                  </Text>
                </Stack>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>
      
      {/* CTA Section */}
      <Box as="section" py={{ base: '60px', md: '80px' }} bg={bgColor}>
        <Container maxW="900px">
          <Box
            bg="linear-gradient(135deg, rgba(7,71,94,0.95) 0%, rgba(7,71,94,0.8) 100%)"
            borderRadius="xl"
            p={{ base: 6, md: 10 }}
            textAlign="center"
            boxShadow="xl"
          >
            <Stack spacing={6} align="center">
              <Heading color="white" fontSize={{ base: 'xl', md: '2xl' }}>
                Ready to Transform Your Legal Practice?
              </Heading>
              <Text color="whiteAlpha.900" maxW="600px">
                Join thousands of legal professionals who have streamlined their workflow with LexAssist's powerful tools.
              </Text>
              <Button
                size="lg"
                bg={accentColor}
                color={primaryColor}
                fontWeight="bold"
                _hover={{ bg: 'yellow.500' }}
              >
                Start Your Free Trial
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
      
      {/* Footer */}
      <Box as="footer" bg={primaryColor} color="white" py={10}>
        <Container maxW="1200px">
          <Flex 
            direction={{ base: 'column', md: 'row' }} 
            justify="space-between" 
            align="flex-start"
            gap={8}
          >
            <Stack align="flex-start" spacing={4}>
              <Image src="/images/LexAssist_Logo.png" alt="LexAssist Logo" height="40px" />
              <Text fontSize="sm">© 2025 LexAssist. All rights reserved.</Text>
            </Stack>
            
            <SimpleGrid columns={{ base: 2, md: 3 }} spacingX={8} spacingY={8}>
              <Stack align="flex-start" spacing={3}>
                <Text fontWeight="bold">Company</Text>
                <Link href="#" fontSize="sm">About Us</Link>
                <Link href="#" fontSize="sm">Careers</Link>
                <Link href="#" fontSize="sm">Contact</Link>
              </Stack>
              
              <Stack align="flex-start" spacing={3}>
                <Text fontWeight="bold">Product</Text>
                <Link href="#" fontSize="sm">Features</Link>
                <Link href="#" fontSize="sm">Pricing</Link>
                <Link href="#" fontSize="sm">Documentation</Link>
              </Stack>
              
              <Stack align="flex-start" spacing={3}>
                <Text fontWeight="bold">Legal</Text>
                <Link href="#" fontSize="sm">Privacy Policy</Link>
                <Link href="#" fontSize="sm">Terms of Service</Link>
                <Link href="#" fontSize="sm">Security</Link>
              </Stack>
            </SimpleGrid>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;