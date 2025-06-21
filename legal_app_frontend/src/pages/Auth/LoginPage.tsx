// src/pages/Auth/LoginPage.tsx
import React, { useState, useEffect } from 'react';
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
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // ✅ Use AuthContext instead of API client
import { LoginProps } from '../../types';

// Import custom components
import FormControl from '../../components/forms/FormControl';
import FormLabel from '../../components/forms/FormLabel';
import InputRightElement from '../../components/ui/InputRightElement';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '../../components/ui/Tabs';

const LoginPage: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error, clearError, user } = useAuth(); // ✅ Use AuthContext
  
  // States for form fields and UI
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [message, setMessage] = useState<string>(''); // ✅ For success messages
  
  // Color values
  const bgColor = useColorModeValue('white', 'gray.800');
  const primaryColor = "rgb(7, 71, 94)";
  const pageBg = useColorModeValue("rgb(245, 241, 236)", "gray.900");

  // ✅ Step 4: Handle URL parameters for success messages
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    
    if (searchParams.get('verified') === 'true') {
      setMessage('Email verified successfully! You can now login.');
    }
    
    if (searchParams.get('registered') === 'true') {
      setMessage('Registration successful! Please check your email for verification code.');
    }

    // Clear error when component mounts
    clearError();
  }, [location, clearError]);

  // 🔧 ADD THIS: Auto-redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      console.log('User already logged in, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  // Handle email login
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); // Clear any success messages
    
    try {
      const loggedInUser = await login(email, password);
      console.log('Login successful, redirecting to dashboard...');
      
      // 🔧 ADD THIS: Direct redirect after successful login
      navigate('/dashboard');
      
    } catch (err: any) {
      console.error('Login error:', err);
      // Error is handled in AuthContext
    }
  };
  
  // Handle OTP login (send or verify)
  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); // Clear any success messages
    
    if (!otpSent) {
      // Send OTP
      if (validateMobile(mobile)) {
        try {
          // Use direct API call for OTP (since it's not in AuthContext)
          const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
          const response = await fetch(`${API_URL}/api/auth/otp/request`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone: mobile }),
          });

          if (response.ok) {
            setOtpSent(true);
            setMessage("A verification code has been sent to your mobile number.");
          } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to send OTP");
          }
        } catch (err: any) {
          console.error('OTP request error:', err);
          setMessage('');
          alert(err.message || "An error occurred while sending OTP. Please try again.");
        }
      } else {
        alert("Please enter a valid mobile number.");
      }
    } else {
      // Verify OTP
      try {
        const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://lexassist-europe-west1.run.app';
        const response = await fetch(`${API_URL}/api/auth/otp/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone: mobile, code: otp }),
        });

        if (response.ok) {
          const result = await response.json();
          setMessage(result.message);
          
          // After OTP verification, user still needs to login with email/password
          alert("Phone verified successfully! Please login with your email and password.");
          setTabIndex(0); // Switch to email login tab
          setOtpSent(false);
          setOtp('');
          setMobile('');
        } else {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Invalid OTP");
        }
      } catch (err: any) {
        console.error('OTP verification error:', err);
        alert(err.message || "An error occurred during OTP verification. Please try again.");
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
            {/* ✅ Show success messages */}
            {message && (
              <Alert status="success" mb={4}>
                <AlertIcon />
                {message}
              </Alert>
            )}

            {/* ✅ Show error messages from AuthContext */}
            {error && (
              <Alert status="error" mb={4}>
                <AlertIcon />
                {error}
              </Alert>
            )}

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
                          disabled={loading}
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
                            disabled={loading}
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
                          isLoading={loading}
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
                      <Text fontSize="sm" color="gray.600" mb={2}>
                        ℹ️ OTP verification is for phone number verification only. You'll still need to login with email after verification.
                      </Text>
                      
                      <FormControl id="mobile" isRequired>
                        <FormLabel>Mobile Number</FormLabel>
                        <Input 
                          type="tel" 
                          value={mobile} 
                          onChange={(e) => setMobile(e.target.value)} 
                          disabled={loading || otpSent}
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
                            disabled={loading}
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
                          isLoading={loading}
                          loadingText={otpSent ? "Verifying..." : "Sending..."}
                        >
                          {otpSent ? 'Verify OTP' : 'Send OTP'}
                        </Button>
                        
                        {otpSent && (
                          <Button
                            variant="outline"
                            colorScheme="blue"
                            onClick={() => {
                              setOtpSent(false);
                              setOtp('');
                              setMessage('');
                            }}
                            disabled={loading}
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