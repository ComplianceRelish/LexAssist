// legal_app_frontend/src/components/Dashboard/CaseBriefModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, Input, Textarea, Select, VStack, HStack, IconButton,
  Text, useToast, Box, Spinner, Progress, Alert, AlertIcon, Badge,
  Flex, Divider, Circle, InputGroup, InputRightElement
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { 
  FaMicrophone, FaMicrophoneSlash, FaStop, FaFileAudio, FaVolumeUp
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

interface CaseBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

type FieldName = 'title' | 'brief_text' | 'court' | 'case_type';

const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
`;

const CaseBriefModal: React.FC<CaseBriefModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '', 
    brief_text: '', 
    court: '', 
    case_type: '', 
    urgency_level: 'medium'
  });
  
  // Speech input states
  const [activeField, setActiveField] = useState<FieldName | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [microphoneError, setMicrophoneError] = useState('');
  const [recordingError, setRecordingError] = useState('');
  const [interimText, setInterimText] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    checkMicrophonePermissions();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const cleanup = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsRecording(false);
    setActiveField(null);
    setAudioLevel(0);
    setInterimText('');
  };

  const checkMicrophonePermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setIsPermissionGranted(true);
      setMicrophoneError('');
    } catch (error) {
      setIsPermissionGranted(false);
      setMicrophoneError('Please allow microphone access to use speech input.');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', brief_text: '', court: '', case_type: '', urgency_level: 'medium' });
    setRecordingError('');
    cleanup();
  };

  const startAudioLevelMonitoring = (stream: MediaStream) => {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current!.createAnalyser();
      const microphone = audioContextRef.current!.createMediaStreamSource(stream);
      
      analyserRef.current.fftSize = 256;
      microphone.connect(analyserRef.current);
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          setAudioLevel(average);
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Error setting up audio level monitoring:', error);
    }
  };

  const startSpeechForField = async (fieldName: FieldName) => {
    if (!isPermissionGranted) {
      await checkMicrophonePermissions();
      if (!isPermissionGranted) {
        toast({
          title: "Microphone Access Required",
          description: "Please enable microphone access in your browser settings",
          status: "error",
          duration: 5000
        });
        return;
      }
    }

    if (isRecording) {
      stopSpeechRecording();
      return;
    }

    try {
      setRecordingError('');
      setActiveField(fieldName);
      setInterimText('');
      
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognitionClass) {
        throw new Error('Speech recognition not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      
      streamRef.current = stream;
      startAudioLevelMonitoring(stream);

      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      recognition.maxAlternatives = 1;

      let finalTranscript = '';

      recognition.onresult = (event: any) => {
      let finalTranscript = '';
        console.log('Speech recognition result event received:', event);
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          console.log(`Result ${i}: transcript = "${transcript}", isFinal = ${event.results[i].isFinal}`);
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            console.log(`Final transcript for ${fieldName}: "${finalTranscript}"`); 
            // Update the specific field with final transcript
            setFormData(prev => {
              const updatedData = {
                ...prev,
                [fieldName]: fieldName === 'brief_text' 
                  ? (prev[fieldName] + ' ' + transcript).trim()
                  : transcript.trim()
              };
              console.log(`Updated form data for ${fieldName}:`, updatedData);
              return updatedData;
            });
          } else {
            interimTranscript = transcript;
            console.log(`Interim transcript: "${interimTranscript}"`);
          }
        }
        
        // Show interim results
        setInterimText(interimTranscript);
        console.log('Setting interimText state:', interimTranscript);
      };

      recognition.onstart = () => {
        console.log(`Speech recognition started for field: ${fieldName}`);
        setIsRecording(true);
        startRecordingTimer();
        
        const fieldLabels = {
          title: 'Case Title',
          brief_text: 'Case Description',
          court: 'Court Level',
          case_type: 'Case Type'
        };
        console.log('Current form data before recording:', formData);
        
        toast({
          title: `🎤 Recording for ${fieldLabels[fieldName]}`,
          description: "Speak clearly into your microphone",
          status: "info",
          duration: 2000
        });
      };

      recognition.onend = () => {
        console.log(`Speech recognition ended for field: ${fieldName}`);
        console.log('Final form data after recording:', formData);
        setIsRecording(false);
        setActiveField(null);
        setInterimText('');
        stopRecordingTimer();
        setAudioLevel(0);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        toast({
          title: "Recording Complete",
          description: `Text added to ${fieldName.replace('_', ' ')}`,
          status: "success",
          duration: 2000
        });
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        setActiveField(null);
        setInterimText('');
        stopRecordingTimer();
        setAudioLevel(0);
        setRecordingError(`Speech recognition error: ${event.error}`);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
        toast({
          title: "Recording Error",
          description: `Could not process speech: ${event.error}`,
          status: "error",
          duration: 3000
        });
      };

      recognition.start();

    } catch (error) {
      console.error('Error starting speech recording:', error);
      setRecordingError('Could not start recording. Please try again.');
      setActiveField(null);
      toast({
        title: "Recording Error",
        description: "Could not start speech recognition",
        status: "error",
        duration: 3000
      });
    }
  };

  const stopSpeechRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setActiveField(null);
    setInterimText('');
    stopRecordingTimer();
    setAudioLevel(0);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startRecordingTimer = () => {
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(prev => {
        if (prev >= 60) { // 1 minute max per field
          stopSpeechRecording();
          toast({
            title: "Recording Stopped",
            description: "Maximum recording time reached (1 minute per field)",
            status: "warning",
            duration: 3000
          });
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const formatDuration = (seconds: number) => {
    return `${seconds}s`;
  };

  const handleSubmit = () => {
    console.log('Form submission attempt with data:', formData);
    if (!formData.title.trim() || !formData.brief_text.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide both title and brief description",
        status: "error",
        duration: 3000
      });
      return;
    }

    onSubmit({
      title: formData.title.trim(),
      brief_text: formData.brief_text.trim(),
      court: formData.court || 'Not Specified',
      case_type: formData.case_type || 'general',
      urgency_level: formData.urgency_level,
      speech_input: false, // This was speech-enabled input
      user_id: user?.id
    });
  };

  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await checkMicrophonePermissions();
    } catch (error) {
      setMicrophoneError('Microphone access denied. Please enable in browser settings.');
    }
  };

  const renderSpeechButton = (fieldName: FieldName) => {
    const isActiveForThisField = activeField === fieldName && isRecording;
    
    return (
      <IconButton
        icon={isActiveForThisField ? <FaStop /> : <FaMicrophone />}
        colorScheme={isActiveForThisField ? "red" : "blue"}
        variant={isActiveForThisField ? "solid" : "ghost"}
        size="sm"
        onClick={() => startSpeechForField(fieldName)}
        aria-label={`Speech input for ${fieldName}`}
        disabled={!isPermissionGranted || (isRecording && !isActiveForThisField)}
        css={isActiveForThisField ? { animation: `${pulseAnimation} 1s infinite` } : undefined}
        title={isActiveForThisField ? "Stop recording" : "Start speech input"}
      />
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent maxW="4xl">
        <ModalHeader>
          <Flex justify="space-between" align="center">
            <Text>Create Case Brief</Text>
            {isRecording && activeField && (
              <Badge colorScheme="red" variant="solid">
                <FaFileAudio style={{ marginRight: '4px' }} />
                Recording {activeField.replace('_', ' ')} - {formatDuration(recordingDuration)}
              </Badge>
            )}
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={6}>
            {/* Microphone Permission Alert */}
            {!isPermissionGranted && (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <Box flex="1">
                  <Text fontWeight="bold">Microphone Access Required</Text>
                  <Text fontSize="sm">Enable microphone access to use speech input for form fields</Text>
                </Box>
                <Button size="sm" colorScheme="blue" onClick={requestMicrophonePermission}>
                  Enable
                </Button>
              </Alert>
            )}

            {/* Recording Status */}
            {isRecording && activeField && (
              <Box w="full" p={3} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.200">
                <HStack justify="space-between" mb={2}>
                  <HStack>
                    <Circle size="8px" bg="red.500" css={{ animation: `${pulseAnimation} 1s infinite` }} />
                    <Text color="red.600" fontSize="sm" fontWeight="bold">
                      Recording {activeField.replace('_', ' ')}
                    </Text>
                  </HStack>
                  <Text color="red.600" fontSize="sm">
                    {formatDuration(recordingDuration)}
                  </Text>
                </HStack>
                
                {audioLevel > 0 && (
                  <Progress 
                    value={Math.min((audioLevel / 255) * 100, 100)} 
                    colorScheme="red" 
                    size="sm" 
                    bg="red.100"
                  />
                )}
                
                {interimText && (
                  <Box mt={2} p={2} bg="white" borderRadius="sm" border="1px solid" borderColor="red.200">
                    <Text fontSize="sm" color="gray.600" fontStyle="italic">
                      "{interimText}"
                    </Text>
                  </Box>
                )}
              </Box>
            )}

            {/* Form Fields */}
            <VStack spacing={4} w="full">
              {/* Case Title with Speech Input */}
              <FormControl isRequired>
                <FormLabel>Case Title</FormLabel>
                <InputGroup>
                  <Input
                    value={formData.title}
                    onChange={(e) => {
                      console.log('Title changed manually:', e.target.value);
                      setFormData({...formData, title: e.target.value});
                    }}
                    placeholder="Enter a descriptive title for your case"
                    size="lg"
                    pr="12"
                  />
                  <InputRightElement width="12" height="100%">
                    {renderSpeechButton('title')}
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              {/* Brief Description with Speech Input */}
              <FormControl isRequired>
                <FormLabel>Brief Description</FormLabel>
                <Box position="relative">
                  <Textarea
                    value={formData.brief_text}
                    onChange={(e) => {
                      console.log('Brief text changed manually:', e.target.value);
                      setFormData({...formData, brief_text: e.target.value});
                    }}
                    placeholder="Describe your legal case in detail. Include key facts, parties involved, and main legal issues..."
                    rows={8}
                    resize="vertical"
                    pr="12"
                  />
                  <Box position="absolute" top="2" right="2">
                    {renderSpeechButton('brief_text')}
                  </Box>
                </Box>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {formData.brief_text.length} characters
                </Text>
              </FormControl>

              <HStack w="full" spacing={4}>
                {/* Court Level with Speech Input */}
                <FormControl>
                  <FormLabel>Court Level</FormLabel>
                  <InputGroup>
                    <Select
                      value={formData.court}
                      onChange={(e) => setFormData({...formData, court: e.target.value})}
                      placeholder="Select or speak court level"
                      pr="12"
                    >
                      <option value="Supreme Court">Supreme Court of India</option>
                      <option value="High Court">High Court</option>
                      <option value="District Court">District Court</option>
                      <option value="Magistrate Court">Magistrate Court</option>
                      <option value="Tribunal">Tribunal</option>
                    </Select>
                    <InputRightElement width="12" height="100%">
                      {renderSpeechButton('court')}
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {/* Case Type with Speech Input */}
                <FormControl>
                  <FormLabel>Case Type</FormLabel>
                  <InputGroup>
                    <Select
                      value={formData.case_type}
                      onChange={(e) => setFormData({...formData, case_type: e.target.value})}
                      placeholder="Select or speak case type"
                      pr="12"
                    >
                      <option value="civil">Civil Law</option>
                      <option value="criminal">Criminal Law</option>
                      <option value="property">Property Law</option>
                      <option value="family">Family Law</option>
                      <option value="corporate">Corporate Law</option>
                      <option value="constitutional">Constitutional Law</option>
                      <option value="labor">Labor Law</option>
                      <option value="tax">Tax Law</option>
                    </Select>
                    <InputRightElement width="12" height="100%">
                      {renderSpeechButton('case_type')}
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
              </HStack>

              {/* Urgency Level (no speech input needed) */}
              <FormControl>
                <FormLabel>Urgency Level</FormLabel>
                <Select
                  value={formData.urgency_level}
                  onChange={(e) => setFormData({...formData, urgency_level: e.target.value})}
                >
                  <option value="low">Low - Standard processing</option>
                  <option value="medium">Medium - Priority processing</option>
                  <option value="high">High - Expedited analysis</option>
                  <option value="urgent">Urgent - Immediate attention required</option>
                </Select>
              </FormControl>
            </VStack>

            {/* Error Display */}
            {recordingError && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Text fontSize="sm">{recordingError}</Text>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose} disabled={isRecording}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleSubmit}
              disabled={!formData.title.trim() || !formData.brief_text.trim() || isRecording}
              size="lg"
            >
              Analyze Brief
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CaseBriefModal;