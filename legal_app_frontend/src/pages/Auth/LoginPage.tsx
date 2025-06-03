// src/pages/Auth/LoginPage.tsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Input,
  InputGroup,
  Link,
  Stack,
  Text,
  Image,
  useColorModeValue,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { LoginProps } from '../../types';
import LexAssistApiClient from '../../services/LexAssistApiClient';

// Import custom components
import FormControl from '../../components/forms/FormControl';
import FormLabel from '../../components/forms/FormLabel';
import InputRightElement from '../../components/ui/InputRightElement';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../../components/ui/Tabs';

// Import User type from application types
import { User as AppUser } from '../../types';

const LoginPage: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  
  // Initialize API client with environment variables
  const apiClient = React.useMemo(() => new LexAssistApiClient(
    import.meta.env.VITE_BACKEND_URL || 'https://lexassist-backend.onrender.com',
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  ), []);
  
  // States for form fields and UI
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Color values
  const bgColor = useColorModeValue('white', 'gray.800');
  const primaryColor = "rgb(7, 71, 94)"; // Deep teal blue
  const pageBg = useColorModeValue("rgb(245, 241, 236)", "gray.900"); // Light beige background
  
  // Handle email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const success = await apiClient.login(email, password);
      if (success) {
        // Get user from client after successful login
        const apiUser = apiClient.getCurrentUser();
        if (apiUser && 'id' in apiUser && 'email' in apiUser) {
          // Convert API user to application User type
          const appUser: AppUser = {
            id: apiUser.id,
            name: apiUser.full_name || apiUser.email.split('@')[0], // Use full_name or fallback to email username
            email: apiUser.email,
            role: apiUser.role,
            // Add other required fields with defaults
            subscription: apiUser.subscription_tier ? {
              id: apiUser.id, // Use user ID as subscription ID
              tier: apiUser.subscription_tier,
              features: [],
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Default to 30 days from now
            } : undefined
          };
          
          // Call onLogin with properly typed user object
          onLogin(appUser);
          // Navigate to dashboard after successful login
          navigate('/dashboard');
        } else {
          alert("Login successful but user data could not be retrieved.");
        }
      } else {
        alert("Invalid email or password. Please try again.");
      }
    } catch (err) {
      console.error('Login error:', err);
      alert("An error occurred during login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle OTP login (send or verify)
  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpSent) {
      // Send OTP
      if (validateMobile(mobile)) {
        setIsLoading(true);
        
        try {
          const success = await apiClient.requestOTP(mobile);
          if (success) {
            setOtpSent(true);
            alert("A verification code has been sent to your mobile number.");
          } else {
            alert("Failed to send OTP. Please try again.");
          }
        } catch (err) {
          console.error('OTP request error:', err);
          alert("An error occurred while sending OTP. Please try again.");
        } finally {
          setIsLoading(false);
        }
      } else {
        alert("Please enter a valid mobile number.");
      }
    } else {
      // Verify OTP
      setIsLoading(true);
      
      try {
        const success = await apiClient.loginWithOTP(mobile, otp);
        if (success) {
          const apiUser = apiClient.getCurrentUser();
          if (apiUser && 'id' in apiUser && 'email' in apiUser) {
            // Convert API user to application User type
            const appUser: AppUser = {
              id: apiUser.id,
              name: apiUser.full_name || apiUser.email.split('@')[0], // Use full_name or fallback to email username
              email: apiUser.email,
              role: apiUser.role,
              // Add other required fields with defaults
              subscription: apiUser.subscription_tier ? {
                id: apiUser.id, // Use user ID as subscription ID
                tier: apiUser.subscription_tier,
                features: [],
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Default to 30 days from now
              } : undefined
            };
            
            // Call onLogin with properly typed user object
            onLogin(appUser);
            // Navigate to dashboard after successful login
            navigate('/dashboard');
          } else {
            alert("OTP verification successful but user data could not be retrieved.");
          }
        } else {
          alert("Invalid OTP. Please try again.");
        }
      } catch (err) {
        console.error('OTP verification error:', err);
        alert("An error occurred during OTP verification. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Helper function to validate mobile format
  const validateMobile = (mobile: string): boolean => {
    return mobile.length >= 10 && /^\d+$/.test(mobile);
  };

  return (
    <Flex 
      minH={'100vh'} 
      align={'center'} 
      justify={'center'} 
      bg={pageBg}
    >
      <Container maxW={'md'} px={6} py={8}>
        <Stack gap={8}>
          <Stack align={'center'} gap={4} textAlign={'center'}>
            <Image 
              src="/images/logo.png" 
              alt="LexAssist Logo" 
              maxH="80px" 
              mx="auto" 
            />
            <Heading fontSize={'3xl'} color={primaryColor}>
              Welcome to LexAssist
            </Heading>
          </Stack>
          
          <Box
            rounded={'lg'}
            bg={bgColor}
            boxShadow={'lg'}
            p={8}
          >
            <Tabs index={tabIndex} onChange={setTabIndex}>
              <TabList mb={4}>
                <Tab _selected={{ color: 'white', bg: primaryColor }}>Email Login</Tab>
                <Tab _selected={{ color: 'white', bg: primaryColor }}>OTP Login</Tab>
              </TabList>
              
              <TabPanels>
                {/* Email Login Tab */}
                <TabPanel>
                  <form onSubmit={handleEmailLogin}>
                    <Stack gap={4}>
                      <FormControl id="email" isRequired>
                        <FormLabel>Email</FormLabel>
                        <Input 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          disabled={isLoading}
                          placeholder="Enter your email"
                          borderColor={primaryColor}
                        />
                      </FormControl>
                      
                      <FormControl id="password" isRequired>
                        <FormLabel>Password</FormLabel>
                        <InputGroup>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                            placeholder="Enter your password"
                            borderColor={primaryColor}
                          />
                          <InputRightElement width="4.5rem">
                            <Box>
                              <Button
                                h="1.75rem"
                                size="sm"
                                onClick={() => setShowPassword(!showPassword)}
                                variant="ghost"
                              >
                                {showPassword ? <ViewOffIcon /> : <ViewIcon />}
                              </Button>
                            </Box>
                          </InputRightElement>
                        </InputGroup>
                      </FormControl>
                      
                      <Stack gap={6} pt={2}>
                        <Button
                          type="submit"
                          size="lg"
                          bg={primaryColor}
                          color={'white'}
                          _hover={{
                            bg: 'teal.700',
                          }}
                          isLoading={isLoading}
                          loadingText="Logging in..."
                        >
                          Login
                        </Button>
                      </Stack>
                      
                      <Stack pt={2}>
                        <Link color={primaryColor} alignSelf="center" fontWeight="medium">
                          Forgot password?
                        </Link>
                      </Stack>
                    </Stack>
                  </form>
                </TabPanel>
                
                {/* OTP Login Tab */}
                <TabPanel>
                  <form onSubmit={handleOtpLogin}>
                    <Stack gap={4}>
                      <FormControl id="mobile" isRequired>
                        <FormLabel>Mobile Number</FormLabel>
                        <Input 
                          type="tel" 
                          value={mobile} 
                          onChange={(e) => setMobile(e.target.value)} 
                          disabled={isLoading || otpSent}
                          placeholder="Enter your mobile number"
                          borderColor={primaryColor}
                        />
                      </FormControl>
                      
                      {otpSent && (
                        <FormControl id="otp" isRequired>
                          <FormLabel>OTP</FormLabel>
                          <Input 
                            type="text" 
                            value={otp} 
                            onChange={(e) => setOtp(e.target.value)} 
                            disabled={isLoading}
                            placeholder="Enter 6-digit OTP"
                            maxLength={6}
                            borderColor={primaryColor}
                          />
                        </FormControl>
                      )}
                      
                      <Stack gap={3} pt={2}>
                        <Button
                          type="submit"
                          size="lg"
                          bg={primaryColor}
                          color={'white'}
                          _hover={{
                            bg: 'teal.700',
                          }}
                          isLoading={isLoading}
                          loadingText={otpSent ? "Verifying..." : "Sending..."}
                        >
                          {otpSent ? 'Verify OTP' : 'Send OTP'}
                        </Button>
                        
                        {otpSent && (
                          <Button
                            variant="outline"
                            colorScheme="blue"
                            onClick={() => setOtpSent(false)}
                            disabled={isLoading}
                          >
                            Resend OTP
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </form>
                </TabPanel>
              </TabPanels>
            </Tabs>
            
            <Text mt={6} textAlign="center" fontSize="sm">
              New user? <RouterLink to="/register"><Link as="span" color={primaryColor} fontWeight="medium">Create an account</Link></RouterLink>
            </Text>
          </Box>
        </Stack>
      </Container>
    </Flex>
  );
};

export default LoginPage;