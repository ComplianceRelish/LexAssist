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
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service'; // ✅ Use the updated auth service
import { countries } from '../../data/countryData';

// Import custom components
import FormControl from '../../components/forms/FormControl';
import FormLabel from '../../components/forms/FormLabel';
import FormErrorMessage from '../../components/forms/FormErrorMessage';
import InputRightElement from '../../components/ui/InputRightElement';

interface RegisterPageProps {
  onRegister?: (user: any) => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onRegister }) => {
  const navigate = useNavigate();
  
  // Form states
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [country, setCountry] = useState<string>('US'); // Default
  const [countryCode, setCountryCode] = useState<string>('+1'); // Default
  const [mobile, setMobile] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [userType, setUserType] = useState<string>('client'); // client, lawyer, admin
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
  
  // UI states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Chakra UI hooks
  const bgColor = useColorModeValue('white', 'gray.800');
  const primaryColor = "rgb(7, 71, 94)"; // Deep teal blue
  const accentColor = "rgb(242, 190, 34)"; // Golden yellow
  const pageBg = useColorModeValue("rgb(245, 241, 236)", "gray.900"); // Light beige background

  /**
   * Validate form inputs
   * @returns boolean - true if valid, false otherwise
   */
  const validateForm = () => {
    const newErrors: any = {};
    let isValid = true;
    
    // Validate first name
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
      isValid = false;
    }
    
    // Validate last name
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
      isValid = false;
    }
    
    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }
    
    // Validate country
    if (!country.trim()) {
      newErrors.country = 'Country is required';
      isValid = false;
    }
    
    // Validate mobile
    if (!mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
      isValid = false;
    } else if (!/^\d{10,15}$/.test(mobile.replace(/\D/g, ''))) {
      newErrors.mobile = 'Mobile number is invalid';
      isValid = false;
    }
    
    // Validate password
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }
    
    // Validate confirm password
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
    
    // Validate form
    if (!validateForm()) {
      alert("Please correct the errors in the form.");
      return;
    }
    
    // Start loading
    setIsLoading(true);
    
    try {
      // ✅ Use the updated auth service
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
      
      const user = await .register(userData);
      
      console.log('Registration successful:', user);
      alert("Registration successful! Your account has been created. You can now login.");
      
      // If onRegister callback is provided, use it, otherwise navigate to login
      if (onRegister) {
        onRegister(user);
      } else {
        // Navigate to login page after successful registration
        setTimeout(() => navigate('/login'), 1000);
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Handle specific error cases
      const errorMessage = err.message || "An error occurred during registration. Please try again.";
      alert(errorMessage);
    } finally {
      setIsLoading(false);
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
                    isLoading={isLoading}
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