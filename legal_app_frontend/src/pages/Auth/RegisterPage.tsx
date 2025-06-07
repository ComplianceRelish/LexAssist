// src/pages/Auth/RegisterPage.tsx
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
  HStack,
  Image,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button as ChakraButton,
  Select,
  InputLeftAddon,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // ✅ Use AuthContext
import { countries } from '../../data/countryData';

// Import custom components
import FormControl from '../../components/forms/FormControl';
import FormLabel from '../../components/forms/FormLabel';
import FormErrorMessage from '../../components/forms/FormErrorMessage';
import InputRightElement from '../../components/ui/InputRightElement';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, loading, error, clearError } = useAuth(); // ✅ Use AuthContext
  
  // Form states
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [country, setCountry] = useState<string>('US');
  const [countryCode, setCountryCode] = useState<string>('+1');
  const [mobile, setMobile] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [userType, setUserType] = useState<string>('client');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  
  // Form validation states
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    country?: string;
    mobile?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  
  // Chakra UI hooks
  const bgColor = useColorModeValue('white', 'gray.800');
  const primaryColor = "rgb(7, 71, 94)";
  const pageBg = useColorModeValue("rgb(245, 241, 236)", "gray.900");

  /**
   * Validate form inputs
   */
  const validateForm = () => {
    const newErrors: any = {};
    let isValid = true;
    
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }
    
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }
    
    if (!country.trim()) {
      newErrors.country = 'Country is required';
      isValid = false;
    }
    
    if (!mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
      isValid = false;
    } else if (!/^\d{10,15}$/.test(mobile.replace(/\D/g, ''))) {
      newErrors.mobile = 'Mobile number is invalid';
      isValid = false;
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous errors
    clearError();
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      // ✅ Use AuthContext signUp with userData object
      const userData = {
        firstName,
        lastName,
        email,
        country,
        countryCode,
        mobileNumber: mobile,
        password,
        userType
      };
      
      await signUp(userData);
      // Navigation is handled in AuthContext
      
    } catch (err: any) {
      console.error('Registration error:', err);
      // Error is handled in AuthContext
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
              Create Your Account
            </Heading>
            <Text color={'gray.600'} fontSize={'lg'}>
              Join LexAssist for powerful legal assistance tools
            </Text>
          </Stack>
          
          <Box
            rounded={'lg'}
            bg={bgColor}
            boxShadow={'lg'}
            p={8}
          >
            {/* ✅ Show error message if any */}
            {error && (
              <Alert status="error" mb={4}>
                <AlertIcon />
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack gap={4}>
                <HStack>
                  <FormControl id="firstName" isRequired isInvalid={!!errors.firstName}>
                    <FormLabel>First Name</FormLabel>
                    <Input 
                      type="text" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                      borderColor={primaryColor}
                    />
                    {errors.firstName && (
                      <FormErrorMessage>{errors.firstName}</FormErrorMessage>
                    )}
                  </FormControl>
                  
                  <FormControl id="lastName" isRequired isInvalid={!!errors.lastName}>
                    <FormLabel>Last Name</FormLabel>
                    <Input 
                      type="text" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                      borderColor={primaryColor}
                    />
                    {errors.lastName && (
                      <FormErrorMessage>{errors.lastName}</FormErrorMessage>
                    )}
                  </FormControl>
                </HStack>
                
                <FormControl id="email" isRequired isInvalid={!!errors.email}>
                  <FormLabel>Email</FormLabel>
                  <Input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    borderColor={primaryColor}
                  />
                  {errors.email && (
                    <FormErrorMessage>{errors.email}</FormErrorMessage>
                  )}
                </FormControl>
                
                <FormControl id="country" isRequired isInvalid={!!errors.country}>
                  <FormLabel>Country</FormLabel>
                  <Select
                    value={country}
                    onChange={(e) => {
                      const selectedCountry = countries.find(c => c.code === e.target.value);
                      setCountry(e.target.value);
                      if (selectedCountry) {
                        setCountryCode(selectedCountry.phoneCode);
                      }
                    }}
                    borderColor={primaryColor}
                  >
                    {countries.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl id="mobile" isRequired isInvalid={!!errors.mobile}>
                  <FormLabel>Mobile Number</FormLabel>
                  <InputGroup>
                    <InputLeftAddon>
                      {countryCode}
                    </InputLeftAddon>
                    <Input 
                      type="tel" 
                      value={mobile} 
                      onChange={(e) => setMobile(e.target.value)} 
                      borderColor={primaryColor}
                    />
                  </InputGroup>
                  {errors.mobile && (
                    <FormErrorMessage>{errors.mobile}</FormErrorMessage>
                  )}
                </FormControl>
                
                <FormControl id="userType" isRequired>
                  <FormLabel>I am a</FormLabel>
                  <Menu>
                    <MenuButton as={ChakraButton} rightIcon={<ChevronDownIcon />} width="100%" borderColor={primaryColor} variant="outline" textAlign="left">
                      {userType === 'client' ? 'Client' : 'Lawyer'}
                    </MenuButton>
                    <MenuList>
                      <MenuItem onClick={() => setUserType('client')}>Client</MenuItem>
                      <MenuItem onClick={() => setUserType('lawyer')}>Lawyer</MenuItem>
                    </MenuList>
                  </Menu>
                </FormControl>
                
                <FormControl id="password" isRequired isInvalid={!!errors.password}>
                  <FormLabel>Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                  {errors.password && (
                    <FormErrorMessage>{errors.password}</FormErrorMessage>
                  )}
                </FormControl>
                
                <FormControl id="confirmPassword" isRequired isInvalid={!!errors.confirmPassword}>
                  <FormLabel>Confirm Password</FormLabel>
                  <InputGroup>
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      borderColor={primaryColor}
                    />
                    <InputRightElement width="4.5rem">
                      <Box>
                        <Button
                          h="1.75rem"
                          size="sm"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          variant="ghost"
                        >
                          {showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
                        </Button>
                      </Box>
                    </InputRightElement>
                  </InputGroup>
                  {errors.confirmPassword && (
                    <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
                  )}
                </FormControl>
                
                <Stack gap={10} pt={2}>
                  <Button
                    type="submit"
                    size="lg"
                    bg={primaryColor}
                    color={'white'}
                    _hover={{
                      bg: 'teal.700',
                    }}
                    isLoading={loading}
                    loadingText="Creating Account..."
                  >
                    Sign Up
                  </Button>
                </Stack>
                
                <Stack pt={6}>
                  <Text textAlign={'center'}>
                    Already a user?{' '}
                    <Link href="/login" color={primaryColor} fontWeight="medium">
                      Login
                    </Link>
                  </Text>
                </Stack>
              </Stack>
            </form>
          </Box>
        </Stack>
      </Container>
    </Flex>
  );
};

export default RegisterPage;