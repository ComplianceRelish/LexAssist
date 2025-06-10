// src/pages/Auth/VerifyEmailPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
  Image,
  useColorModeValue,
  Alert,
  AlertIcon,
  HStack,
  PinInput,
  PinInputField,
} from '@chakra-ui/react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import axios from 'axios';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Get email, message and verification method from both URL params and location state
  const stateData = location.state as { email?: string; message?: string; verificationType?: string } || {};
  const email = stateData.email || searchParams.get('email') || '';
  const verificationType = stateData.verificationType || searchParams.get('type') || 'code';
  
  const [code, setCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>(stateData.message || 'Please verify your email to continue.');
  const [error, setError] = useState<string>('');
  const [isResending, setIsResending] = useState<boolean>(false);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const primaryColor = "rgb(7, 71, 94)";
  const pageBg = useColorModeValue("rgb(245, 241, 236)", "gray.900");

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://lexassist-backend.onrender.com';
      
      const response = await axios.post(`${API_URL}/api/auth/verify-code`, {
        contact: email,
        code: code
      });

      setMessage(response.data.message);
      
      // Redirect to login after successful verification
      setTimeout(() => {
        navigate('/login?verified=true');
      }, 2000);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError('');
    
    try {
      const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://lexassist-backend.onrender.com';
      
      await axios.post(`${API_URL}/api/auth/send-verification`, {
        email: email
      });

      setMessage('Verification code sent successfully! Please check your email.');
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
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
              Verify Your Email
            </Heading>
            <Text color={'gray.600'} fontSize={'lg'}>
              We've sent a verification code to
            </Text>
            <Text color={primaryColor} fontSize={'lg'} fontWeight="bold">
              {email}
            </Text>
          </Stack>
          
          <Box
            rounded={'lg'}
            bg={bgColor}
            boxShadow={'lg'}
            p={8}
          >
            {message && (
              <Alert status="success" mb={4}>
                <AlertIcon />
                {message}
              </Alert>
            )}

            {error && (
              <Alert status="error" mb={4}>
                <AlertIcon />
                {error}
              </Alert>
            )}

            <Stack gap={6}>
              {/* Show different UI based on verification type */}
              {verificationType === 'link' ? (
                <>
                  <Text textAlign="center" color="gray.600">
                    Please check your email for a verification link and click it to verify your account.
                  </Text>
                  
                  <Button
                    size="lg"
                    bg={primaryColor}
                    color={'white'}
                    _hover={{
                      bg: 'teal.700',
                    }}
                    onClick={() => window.open('https://mail.google.com', '_blank')}
                  >
                    Open Gmail
                  </Button>
                </>
              ) : (
                <>
                  <Text textAlign="center" color="gray.600">
                    Enter the 6-digit verification code
                  </Text>
                  
                  <Flex justify="center">
                    <HStack>
                      <PinInput 
                        value={code} 
                        onChange={setCode}
                        size="lg"
                        focusBorderColor={primaryColor}
                      >
                        <PinInputField />
                        <PinInputField />
                        <PinInputField />
                        <PinInputField />
                        <PinInputField />
                        <PinInputField />
                      </PinInput>
                    </HStack>
                  </Flex>
                  
                  <Button
                    onClick={handleVerify}
                    size="lg"
                    bg={primaryColor}
                    color={'white'}
                    _hover={{
                      bg: 'teal.700',
                    }}
                    isLoading={isLoading}
                    loadingText="Verifying..."
                    isDisabled={code.length !== 6}
                  >
                    Verify Email
                  </Button>
                  
                  <Stack align="center" gap={2}>
                    <Text color="gray.600" fontSize="sm">
                      Didn't receive the code?
                    </Text>
                    <Button
                      variant="link"
                      color={primaryColor}
                      onClick={handleResendCode}
                      isLoading={isResending}
                      loadingText="Sending..."
                      size="sm"
                    >
                      Resend Code
                    </Button>
                  </Stack>
                </>
              )}
              
              <Stack pt={6}>
                <Text textAlign={'center'}>
                  <Button
                    variant="link"
                    color={primaryColor}
                    onClick={() => navigate('/login')}
                  >
                    Back to Login
                  </Button>
                </Text>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </Flex>
  );
};

export default VerifyEmailPage;