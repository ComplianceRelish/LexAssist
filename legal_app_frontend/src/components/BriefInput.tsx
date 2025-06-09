// src/components/BriefInput.tsx
import React, { useState } from 'react';
import { Box, Button, Textarea, Heading, VStack, useToast } from '@chakra-ui/react';

interface BriefInputProps {
  onSubmit: (brief: string) => void;
  isLoading: boolean;
}

const BriefInput: React.FC<BriefInputProps> = ({ onSubmit, isLoading }) => {
  const [briefText, setBriefText] = useState<string>('');
  const toast = useToast();
  
  const handleSubmit = () => {
    if (!briefText.trim()) {
      toast({
        title: 'Brief required',
        description: 'Please enter your legal brief before submitting.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    onSubmit(briefText);
  };
  
  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" bg="white" shadow="md">
      <VStack spacing={4} align="stretch">
        <Heading size="md">Enter Legal Brief</Heading>
        <Textarea
          placeholder="Enter your legal situation or query here..."
          value={briefText}
          onChange={(e) => setBriefText(e.target.value)}
          size="lg"
          height="200px"
          resize="vertical"
        />
        <Button 
          colorScheme="blue" 
          isLoading={isLoading}
          onClick={handleSubmit}
          width="full"
        >
          {isLoading ? 'Analyzing...' : 'Analyze Brief'}
        </Button>
      </VStack>
    </Box>
  );
};

export default BriefInput;