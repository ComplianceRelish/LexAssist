// src/components/BriefInput.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Textarea, Heading, VStack, useToast, HStack, IconButton, Tooltip } from '@chakra-ui/react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';

interface BriefInputProps {
  onSubmit: (brief: string) => void;
  isLoading: boolean;
}

const BriefInput: React.FC<BriefInputProps> = ({ onSubmit, isLoading }) => {
  const [briefText, setBriefText] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [hasRecognitionSupport, setHasRecognitionSupport] = useState<boolean>(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const toast = useToast();

  // Check browser support for speech recognition
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      setHasRecognitionSupport(true);
    }
  }, []);

  // Toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Start speech recognition
  const startListening = () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      if (!recognitionRef.current) {
        throw new Error('Speech recognition not supported');
      }

      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US'; // Default to English

      recognition.onresult = (event) => {
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;

        setBriefText((prev) => {
          // Append new speech to existing text
          return prev + (prev ? ' ' : '') + transcript;
        });
      };

      recognition.onend = () => {
        // Auto-restart if we're still in listening mode
        if (isListening && recognitionRef.current) {
          recognitionRef.current.start();
        }
      };

      recognition.start();
      setIsListening(true);

      toast({
        title: 'Listening',
        description: 'Speak now. Your voice will be transcribed to text.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Speech recognition error:', error);
      toast({
        title: 'Speech Recognition Error',
        description: 'Could not start speech recognition. Please try again or use keyboard input.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      setIsListening(false);
    }
  };

  // Stop speech recognition
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      toast({
        title: 'Stopped listening',
        description: 'Speech input has been stopped.',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

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
        <HStack spacing={2}>
          <Textarea
            placeholder="Enter your legal situation or query here..."
            value={briefText}
            onChange={(e) => setBriefText(e.target.value)}
            size="lg"
            height="200px"
            resize="vertical"
            flex="1"
          />
          {hasRecognitionSupport && (
            <Tooltip label={isListening ? "Stop voice input" : "Start voice input"}>
              <IconButton
                aria-label="Toggle speech recognition"
                icon={isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
                onClick={toggleListening}
                colorScheme={isListening ? "red" : "blue"}
                alignSelf="flex-start"
              />
            </Tooltip>
          )}
        </HStack>
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