// legal_app_frontend/src/components/Dashboard/CaseBriefModal.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  VStack,
  HStack,
  IconButton,
  Text,
  useToast,
  Box,
  Spinner,
  Progress,
  Alert,
  AlertIcon,
  Badge,
  Collapse,
  useDisclosure,
  Flex,
  Divider
} from '@chakra-ui/react';
import { 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaStop, 
  FaPlay,
  FaChevronDown,
  FaChevronUp,
  FaFileAudio
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';

interface CaseBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

interface TranscriptionHistoryItem {
  id: number;
  text: string;
  confidence: number;
  timestamp: string;
}

const CaseBriefModal: React.FC<CaseBriefModalProps> = ({ isOpen, onClose, onSubmit }) => {
  // Existing state
  const [formData, setFormData] = useState({
    title: '',
    brief_text: '',
    court: '',
    case_type: '',
    urgency_level: 'medium'
  });

  // Speech recording state
  const [isRecording, setIsRecording] = useState(false);
  const [speechToText, setSpeechToText] = useState("");
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [legalTermsDetected, setLegalTermsDetected] = useState<string[]>([]);
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionHistoryItem[]>([]);
  
  // UI state
  const { isOpen: isAdvancedOpen, onToggle: toggleAdvanced } = useDisclosure();
  const [recordingError, setRecordingError] = useState('');
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const toast = useToast();
  const { user } = useAuth();

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      title: '',
      brief_text: '',
      court: '',
      case_type: '',
      urgency_level: 'medium'
    });
    setSpeechToText('');
    setRecordingDuration(0);
    setConfidenceScore(0);
    setLegalTermsDetected([]);
    setRecordingError('');
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  // Speech recognition functions
  const startSpeechRecording = async () => {
    try {
      setRecordingError('');
      
      // Check if browser supports speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        // Fallback to audio recording for server-side processing
        await startAudioRecording();
        return;
      }

      // Use browser's speech recognition for real-time transcription
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Indian English
      recognition.maxAlternatives = 3;

      let finalTranscript = '';
      let interimTranscript = '';

      recognition.onresult = (event) => {
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update the brief text in real-time
        const fullTranscript = finalTranscript + interimTranscript;
        setSpeechToText(fullTranscript);
        setFormData(prev => ({
          ...prev,
          brief_text: fullTranscript,
          speech_input: true
        }));
      };

      recognition.onstart = () => {
        setIsRecording(true);
        startRecordingTimer();
        toast({
          title: "Recording Started",
          description: "Speak your case brief details clearly",
          status: "info",
          duration: 2000
        });
      };

      recognition.onend = () => {
        setIsRecording(false);
        stopRecordingTimer();
        
        if (finalTranscript.trim()) {
          processTranscriptWithAI(finalTranscript.trim());
        }
      };

      recognition.onerror = (event) => {
        setIsRecording(false);
        stopRecordingTimer();
        setRecordingError(`Speech recognition error: ${event.error}`);
        
        // Fallback to audio recording
        startAudioRecording();
      };

      recognition.start();

    } catch (error) {
      toast({
        title: "Recording Error",
        description: "Could not start speech recognition. Trying audio recording...",
        status: "warning",
        duration: 3000
      });
      
      // Fallback to audio recording
      await startAudioRecording();
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        await processAudioToText(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      startRecordingTimer();
      
      toast({
        title: "Audio Recording Started",
        description: "Speak your case brief details",
        status: "info",
        duration: 2000
      });

    } catch (error) {
      setRecordingError('Could not access microphone. Please check permissions.');
      toast({
        title: "Recording Error",
        description: "Could not access microphone",
        status: "error",
        duration: 3000
      });
    }
  };

  const stopSpeechRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    stopRecordingTimer();
  };

  const startRecordingTimer = () => {
    setRecordingDuration(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const processAudioToText = async (audioBlob: Blob) => {
    setIsProcessingSpeech(true);
    
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');

      const response = await fetch('/api/legal/speech-to-brief', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        setSpeechToText(result.transcribed_text);
        setConfidenceScore(result.confidence_score || 0);
        setLegalTermsDetected(result.legal_terms_detected || []);
        
        // Add to transcription history
        setTranscriptionHistory(prev => [...prev, {
          id: Date.now(),
          text: result.transcribed_text,
          confidence: result.confidence_score,
          timestamp: new Date().toLocaleTimeString()
        }]);
        
        // Auto-fill form with speech data
        setFormData(prev => ({
          ...prev,
          brief_text: result.formatted_brief?.formatted_text || result.transcribed_text,
          title: result.suggestions?.title || prev.title,
          case_type: result.suggestions?.case_type || prev.case_type,
          court: result.suggestions?.court || prev.court,
          speech_input: true
        }));

        toast({
          title: "Speech Processed Successfully",
          description: `Transcribed with ${result.confidence_score}% confidence`,
          status: "success",
          duration: 3000
        });
      } else {
        throw new Error('Failed to process speech');
      }
    } catch (error) {
      setRecordingError('Could not process speech to text');
      toast({
        title: "Processing Error",
        description: "Could not process speech to text",
        status: "error",
        duration: 3000
      });
    } finally {
      setIsProcessingSpeech(false);
    }
  };

  const processTranscriptWithAI = async (transcript: string) => {
    try {
      // Use AI to improve and structure the transcript
      const response = await fetch('/api/legal/format-speech-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ 
          transcribed_text: transcript,
          user_id: user?.id 
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update form with AI-enhanced content
        setFormData(prev => ({
          ...prev,
          title: result.suggested_title || prev.title,
          case_type: result.suggested_case_type || prev.case_type,
          court: result.suggested_court || prev.court
        }));
      }
    } catch (error) {
      console.log('AI processing failed, using raw transcript');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
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
      ...formData,
      user_id: user?.id,
      speech_input: !!speechToText
    });
  };

  const clearSpeechInput = () => {
    setSpeechToText('');
    setFormData(prev => ({ ...prev, brief_text: '', speech_input: false }));
    setConfidenceScore(0);
    setLegalTermsDetected([]);
    setTranscriptionHistory([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent maxW="4xl">
        <ModalHeader>
          <Flex justify="space-between" align="center">
            <Text>Create Case Brief</Text>
            {speechToText && (
              <Badge colorScheme="green" variant="subtle">
                <FaFileAudio style={{ marginRight: '4px' }} />
                Speech Input Active
              </Badge>
            )}
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={6}>
            {/* Speech Input Section */}
            <Box w="full" p={4} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
              <HStack justify="space-between" mb={3}>
                <Text fontWeight="bold" fontSize="lg">🎤 Speech Input</Text>
                <HStack spacing={2}>
                  {!isRecording ? (
                    <IconButton
                      icon={<FaMicrophone />}
                      colorScheme="red"
                      size="lg"
                      onClick={startSpeechRecording}
                      aria-label="Start Recording"
                      disabled={isProcessingSpeech}
                      isLoading={isProcessingSpeech}
                    />
                  ) : (
                    <IconButton
                      icon={<FaStop />}
                      colorScheme="gray"
                      size="lg"
                      onClick={stopSpeechRecording}
                      aria-label="Stop Recording"
                    />
                  )}
                  
                  {speechToText && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearSpeechInput}
                    >
                      Clear
                    </Button>
                  )}
                </HStack>
              </HStack>
              
              {/* Recording Status */}
              {isRecording && (
                <Box mb={3}>
                  <HStack justify="space-between" mb={2}>
                    <Text color="red.500" fontSize="sm" fontWeight="bold">
                      🔴 Recording Active
                    </Text>
                    <Text color="gray.600" fontSize="sm">
                      Duration: {formatDuration(recordingDuration)}
                    </Text>
                  </HStack>
                  <Progress value={Math.min((recordingDuration / 300) * 100, 100)} colorScheme="red" size="sm" />
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Maximum recording time: 5 minutes
                  </Text>
                </Box>
              )}
              
              {/* Processing Status */}
              {isProcessingSpeech && (
                <Box mb={3}>
                  <HStack>
                    <Spinner size="sm" color="blue.500" />
                    <Text color="blue.500" fontSize="sm">
                      Processing speech to text...
                    </Text>
                  </HStack>
                </Box>
              )}
              
              {/* Error Display */}
              {recordingError && (
                <Alert status="error" size="sm" mb={3}>
                  <AlertIcon />
                  <Text fontSize="sm">{recordingError}</Text>
                </Alert>
              )}
              
              {/* Transcription Result */}
              {speechToText && (
                <Box>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" color="gray.600" fontWeight="bold">
                      Transcribed Text:
                    </Text>
                    {confidenceScore > 0 && (
                      <Badge 
                        colorScheme={confidenceScore > 80 ? 'green' : confidenceScore > 60 ? 'yellow' : 'red'}
                        variant="subtle"
                      >
                        {confidenceScore.toFixed(1)}% confidence
                      </Badge>
                    )}
                  </HStack>
                  
                  <Box 
                    p={3} 
                    bg="white" 
                    borderRadius="md" 
                    border="1px solid" 
                    borderColor="gray.200"
                    maxH="150px"
                    overflowY="auto"
                  >
                    <Text fontSize="sm" lineHeight="1.5">
                      {speechToText}
                    </Text>
                  </Box>
                  
                  {/* Legal Terms Detected */}
                  {legalTermsDetected.length > 0 && (
                    <Box mt={2}>
                      <Text fontSize="xs" color="gray.600" mb={1}>
                        Legal terms detected:
                      </Text>
                      <Flex flexWrap="wrap" gap={1}>
                        {legalTermsDetected.map((term, index) => (
                          <Badge key={index} colorScheme="blue" variant="outline" fontSize="xs">
                            {term}
                          </Badge>
                        ))}
                      </Flex>
                    </Box>
                  )}
                </Box>
              )}
              
              {/* Advanced Speech Options */}
              <Box mt={3}>
                <Button
                  size="xs"
                  variant="link"
                  onClick={toggleAdvanced}
                  rightIcon={isAdvancedOpen ? <FaChevronUp /> : <FaChevronDown />}
                >
                  Advanced Options
                </Button>
                
                <Collapse in={isAdvancedOpen} animateOpacity>
                  <Box mt={2} p={2} bg="white" borderRadius="md" fontSize="xs">
                    <Text color="gray.600" mb={1}>Speech Recognition Tips:</Text>
                    <ul style={{ paddingLeft: '16px', color: 'gray.500' }}>
                      <li>Speak clearly and at a moderate pace</li>
                      <li>Use legal terminology when applicable</li>
                      <li>Pause between different topics or sections</li>
                      <li>Spell out important names or case numbers</li>
                    </ul>
                    
                    {transcriptionHistory.length > 0 && (
                      <Box mt={2}>
                        <Text color="gray.600" mb={1}>Transcription History:</Text>
                        {transcriptionHistory.slice(-3).map((item) => (
                          <Text key={item.id} fontSize="xs" color="gray.500">
                            {item.timestamp}: {item.text.substring(0, 50)}...
                          </Text>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </Box>
            </Box>

            <Divider />

            {/* Existing Form Fields */}
            <VStack spacing={4} w="full">
              <FormControl isRequired>
                <FormLabel>Case Title</FormLabel>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Enter a descriptive title for your case"
                  size="lg"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Brief Description</FormLabel>
                <Textarea
                  value={formData.brief_text}
                  onChange={(e) => setFormData({...formData, brief_text: e.target.value})}
                  placeholder="Describe your legal case in detail. Include key facts, parties involved, and main legal issues..."
                  rows={8}
                  resize="vertical"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {formData.brief_text.length} characters
                </Text>
              </FormControl>

              <HStack w="full" spacing={4}>
                <FormControl>
                  <FormLabel>Court Level</FormLabel>
                  <Select
                    value={formData.court}
                    onChange={(e) => setFormData({...formData, court: e.target.value})}
                    placeholder="Select court level"
                  >
                    <option value="Supreme Court">Supreme Court of India</option>
                    <option value="High Court">High Court</option>
                    <option value="District Court">District Court</option>
                    <option value="Magistrate Court">Magistrate Court</option>
                    <option value="Tribunal">Tribunal</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Case Type</FormLabel>
                  <Select
                    value={formData.case_type}
                    onChange={(e) => setFormData({...formData, case_type: e.target.value})}
                    placeholder="Select case type"
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
                </FormControl>
              </HStack>

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
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleSubmit}
              disabled={!formData.title.trim() || !formData.brief_text.trim()}
              isLoading={isProcessingSpeech}
              loadingText="Processing..."
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