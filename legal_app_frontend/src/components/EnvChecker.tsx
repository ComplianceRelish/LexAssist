import React, { useEffect, useState } from 'react';
import { Box, Heading, Text, Code, Alert, AlertIcon, AlertTitle, AlertDescription, Stack, Button } from '@chakra-ui/react';
import { checkEnvironmentVariables } from '../utils/envCheck';

const EnvChecker: React.FC = () => {
  const [envStatus, setEnvStatus] = useState<{
    isValid: boolean;
    variables: Record<string, string | undefined>;
    missingVars: string[];
  }>({
    isValid: false,
    variables: {},
    missingVars: []
  });

  useEffect(() => {
    // Check environment variables on component mount
    const checkEnv = () => {
      // Get all Vite environment variables
      const envVars: Record<string, string | undefined> = {};
      const missingVars: string[] = [];
      
      // Critical variables that must be present
      const criticalVars = [
        'VITE_BACKEND_URL',
        'VITE_SUPABASE_URL', 
        'VITE_SUPABASE_ANON_KEY',
        'VITE_INLEGALBERT_MODEL_PATH'
      ];
      
      // Check all environment variables that start with VITE_
      Object.keys(import.meta.env).forEach(key => {
        if (key.startsWith('VITE_')) {
          const value = import.meta.env[key];
          envVars[key] = value;
          
          // Check if critical variable is missing or empty
          if (criticalVars.includes(key) && (!value || value === '')) {
            missingVars.push(key);
          }
        }
      });
      
      setEnvStatus({
        isValid: missingVars.length === 0,
        variables: envVars,
        missingVars
      });
    };
    
    checkEnv();
  }, []);

  return (
    <Box p={6} borderWidth="1px" borderRadius="lg" bg="white" boxShadow="md">
      <Heading size="lg" mb={4}>Environment Variables Check</Heading>
      
      {!envStatus.isValid ? (
        <Alert status="error" mb={4}>
          <AlertIcon />
          <AlertTitle>Missing Critical Variables!</AlertTitle>
          <AlertDescription>
            The following environment variables are missing or empty: {envStatus.missingVars.join(', ')}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert status="success" mb={4}>
          <AlertIcon />
          <AlertTitle>Environment Variables Loaded Successfully</AlertTitle>
          <AlertDescription>
            All critical environment variables are present.
          </AlertDescription>
        </Alert>
      )}
      
      <Heading size="md" mb={2}>Available Environment Variables:</Heading>
      <Stack spacing={2} mb={4}>
        {Object.entries(envStatus.variables).map(([key, value]) => (
          <Box key={key} p={2} borderWidth="1px" borderRadius="md" bg="gray.50">
            <Text fontWeight="bold">{key}:</Text>
            <Code>
              {key.includes('KEY') ? 
                (value ? '[PRESENT]' : '[MISSING]') : 
                (value || '[EMPTY]')}
            </Code>
          </Box>
        ))}
      </Stack>
      
      <Button colorScheme="blue" onClick={() => checkEnvironmentVariables()}>
        Log Environment Variables to Console
      </Button>
    </Box>
  );
};

export default EnvChecker;
