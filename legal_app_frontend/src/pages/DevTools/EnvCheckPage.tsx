import React from 'react';
import { Box, Container, Heading, Button, Link, Flex } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import EnvChecker from '../../components/EnvChecker';

const EnvCheckPage: React.FC = () => {
  const navigate = useNavigate();
  const primaryColor = "rgb(7, 71, 94)"; // Deep teal blue to match existing brand styling
  
  return (
    <Box minH="100vh" bg="rgb(245, 241, 236)" py={8}>
      <Container maxW="container.lg">
        <Flex direction="column" align="center" mb={8}>
          <Heading color={primaryColor} mb={4}>LexAssist Environment Check</Heading>
          <Button 
            colorScheme="blue" 
            mb={4} 
            onClick={() => navigate('/')}
          >
            Return to Home
          </Button>
        </Flex>
        
        <EnvChecker />
        
        <Box mt={8} textAlign="center">
          <RouterLink to="/login">
            <Link color={primaryColor} fontWeight="medium">Go to Login Page</Link>
          </RouterLink>
        </Box>
      </Container>
    </Box>
  );
};

export default EnvCheckPage;
