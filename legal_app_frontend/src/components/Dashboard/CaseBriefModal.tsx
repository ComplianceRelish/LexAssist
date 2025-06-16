// legal_app_frontend/src/components/Dashboard/CaseBriefModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton,
  Button, FormControl, FormLabel, Input, Textarea, Select, VStack, HStack, IconButton,
  Text, useToast, Box, Spinner, Progress, Alert, AlertIcon, Badge, Collapse, useDisclosure,
  Flex, Divider, Circle
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { 
  FaMicrophone, FaMicrophoneSlash, FaStop, FaChevronDown, FaChevronUp, FaFileAudio, FaVolumeUp
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
  
  const [isRecording, setIsRecording] = useState(false);
  const [speechToText, setSpeechToText] = useState("");
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [legalTermsDetected, setLegalTermsDetected] = useState<string[]>([]);
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionHistoryItem[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [microphoneError, setMicrophoneError] = useState('');
  const { isOpen: isAdvancedOpen, onToggle: toggleAdvanced } = useDisclosure();
  const [recordingError, setRecordingError] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    checkMicrophonePermissions();
    return () => cleanup();
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const cleanup = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) recognitionRef.current.stop();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) audioContextRef.current.close();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

  const checkMicrophonePermissions = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permission.state === 'granted') {
        setIsPermissionGranted(true);
        setMicrophoneError('');
      } else if (permission.state === 'denied') {
        setIsPermissionGranted(false);
        setMicrophoneError('Microphone access denied. Please enable in browser settings.');
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          setIsPermissionGranted(true);
          setMicrophoneError('');
        } catch (error) {
          setIsPermissionGranted(false);
          setMicrophoneError('Please allow microphone access to use speech input.');
        }
      }
    } catch (error) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setIsPermissionGranted(true);
        setMicrophoneError('');
      } catch (error) {
        setIsPermissionGranted(false);
        setMicrophoneError('Could not access microphone. Please check browser permissions.');
      }
    }
  };

  const resetForm = () => {
    setFormData({ title: '', brief_text: '', court: '', case_type: '', urgency_level: 'medium' });
    setSpeechToText('');
    setRecordingDuration(0);
    setConfidenceScore(0);
    setLegalTermsDetected([]);
    setRecordingError('');
    setAudioLevel(0);
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
        if (analyserRef.current && audioContextRef.current && isRecording) {
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

  const startSpeechRecording = async () => {
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

    try {
      setRecordingError('');
      setMicrophoneError('');
      
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognitionClass) {
        await startWebSpeechRecognition(SpeechRecognitionClass);
      } else {
        await startAudioRecording();
      }
    } catch (error) {
      console.error('Error starting speech recording:', error);
      setRecordingError('Could not start recording. Please try again.');
      toast({
        title: "Recording Error",
        description: "Could not start speech recognition. Trying audio recording...",
        status: "warning",
        duration: 3000
      });
      await startAudioRecording();
    }
  };

  const startWebSpeechRecognition = async (SpeechRecognitionClass: any) => {
    try {
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
      recognition.maxAlternatives = 3;

      let finalTranscript = '';
      let interimTranscript = '';

      recognition.onresult = (event: any) => {
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        const fullTranscript = finalTranscript + interimTranscript;
        setSpeechToText(fullTranscript);
        setFormData(prev => ({ ...prev, brief_text: fullTranscript }));
      };

      recognition.onstart = () => {
        setIsRecording(true);
        startRecordingTimer();
        toast({
          title: "🎤 Recording Started",
          description: "Speak your case brief details clearly",
          status: "info",
          duration: 2000
        });
      };

      recognition.onend = () => {
        setIsRecording(false);
        stopRecordingTimer();
        setAudioLevel(0);
        
        if (finalTranscript.trim()) {
          processTranscriptWithAI(finalTranscript.trim());
        }
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      recognition.onerror = (event: any) => {
        setIsRecording(false);
        stopRecordingTimer();
        setAudioLevel(0);
        setRecordingError(`Speech recognition error: ${event.error}`);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        startAudioRecording();
      };

      recognition.start();

    } catch (error) {
      console.error('Web Speech Recognition error:', error);
      throw error;
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 44100 }
      });
      
      streamRef.current = stream;
      startAudioLevelMonitoring(stream);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        await processAudioToText(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      startRecordingTimer();
      
      toast({
        title: "🎙️ Audio Recording Started",
        description: "Speak your case brief details",
        status: "info",
        duration: 2000
      });

    } catch (error) {
      console.error('Audio recording error:', error);
      setRecordingError('Could not access microphone. Please check permissions.');
      setMicrophoneError('Could not access microphone. Please check browser permissions.');
      toast({
        title: "Recording Error",
        description: "Could not access microphone",
        status: "error",
        duration: 3000
      });
    }
  };

  const stopSpeechRecording = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
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
        if (prev >= 300) {
          stopSpeechRecording();
          toast({
            title: "Recording Stopped",
            description: "Maximum recording time reached (5 minutes)",
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

  const processAudioToText = async (audioBlob: Blob) => {
    setIsProcessingSpeech(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('audio_file', audioBlob, 'recording.webm');

      const response = await fetch('/api/legal/speech-to-brief', {
        method: 'POST',
        body: formDataToSend,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        setSpeechToText(result.transcribed_text);
        setConfidenceScore(result.confidence_score || 0);
        setLegalTermsDetected(result.legal_terms_detected || []);
        
        setTranscriptionHistory(prev => [...prev, {
          id: Date.now(),
          text: result.transcribed_text,
          confidence: result.confidence_score,
          timestamp: new Date().toLocaleTimeString()
        }]);
        
        setFormData(prev => ({
          ...prev,
          brief_text: result.formatted_brief?.formatted_text || result.transcribed_text,
          title: result.suggestions?.title || prev.title,
          case_type: result.suggestions?.case_type || prev.case_type,
          court: result.suggestions?.court || prev.court
        }));

        toast({
          title: "✅ Speech Processed Successfully",
          description: `Transcribed with ${result.confidence_score}% confidence`,
          status: "success",
          duration: 3000
        });
      } else {
        throw new Error('Failed to process speech');
      }
    } catch (error) {
      console.error('Speech processing error:', error);
      setRecordingError('Could not process speech to text');
      toast({
        title: "Processing Error",
        description: "Could not process speech to text. Please try again.",
        status: "error",
        duration: 3000
      });
    } finally {
      setIsProcessingSpeech(false);
    }
  };

  const processTranscriptWithAI = async (transcript: string) => {
    try {
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
    setFormData(prev => ({ ...prev, brief_text: '' }));
    setConfidenceScore(0);
    setLegalTermsDetected([]);
    setTranscriptionHistory([]);
  };

  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await checkMicrophonePermissions();
    } catch (error) {
      setMicrophoneError('Microphone access denied. Please enable in browser settings.');
    }
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
                  {!isPermissionGranted ? (
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      onClick={requestMicrophonePermission}
                      leftIcon={<FaMicrophoneSlash />}
                    >
                      Enable Microphone
                    </Button>
                  ) : !isRecording ? (
                    <Box position="relative">
                      <IconButton
                        icon={<FaMicrophone />}
                        colorScheme="red"
                        size="lg"
                        onClick={startSpeechRecording}
                        aria-label="Start Recording"
                        disabled={isProcessingSpeech || !isPermissionGranted}
                        isLoading={isProcessingSpeech}
                        _hover={{ transform: 'scale(1.05)' }}
                        transition="all 0.2s"
                      />
                      {audioLevel > 0 && (
                        <Circle
                          position="absolute"
                          top="-2px"
                          right="-2px"
                          size="12px"
                          bg="green.400"
                          css={{ animation: `${pulseAnimation} 1s infinite` }}
                        />
                      )}
                    </Box>
                  ) : (
                    <HStack>
                      <Box position="relative">
                        <IconButton
                          icon={<FaVolumeUp />}
                          colorScheme="green"
                          size="sm"
                          variant="ghost"
                          aria-label="Audio Level"
                          opacity={0.3 + (audioLevel / 255) * 0.7}
                        />
                      </Box>
                      
                      <IconButton
                        icon={<FaStop />}
                        colorScheme="gray"
                        size="lg"
                        onClick={stopSpeechRecording}
                        aria-label="Stop Recording"
                        css={{ animation: `${pulseAnimation} 1s infinite` }}
                        bg="red.500"
                        color="white"
                        _hover={{ bg: 'red.600' }}
                      />
                    </HStack>
                  )}
                  
                  {speechToText && (
                    <Button size="sm" variant="outline" onClick={clearSpeechInput}>
                      Clear
                    </Button>
                  )}
                </HStack>
              </HStack>

              {microphoneError && (
                <Alert status="warning" size="sm" mb={3}>
                  <AlertIcon />
                  <Text fontSize="sm">{microphoneError}</Text>
                </Alert>
              )}
              
              {isRecording && (
                <Box mb={3}>
                  <HStack justify="space-between" mb={2}>
                    <HStack>
                      <Circle size="12px" bg="red.500" css={{ animation: `${pulseAnimation} 1s infinite` }} />
                      <Text color="red.500" fontSize="sm" fontWeight="bold">
                        Recording Active
                      </Text>
                    </HStack>
                    <Text color="gray.600" fontSize="sm">
                      Duration: {formatDuration(recordingDuration)}
                    </Text>
                  </HStack>
                  
                  <Box mb={2}>
                    <Progress 
                      value={Math.min((audioLevel / 255) * 100, 100)} 
                      colorScheme="green" 
                      size="sm" 
                      bg="gray.200"
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Audio Level
                    </Text>
                  </Box>
                  
                  <Progress value={Math.min((recordingDuration / 300) * 100, 100)} colorScheme="red" size="sm" />
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Maximum recording time: 5 minutes
                  </Text>
                </Box>
              )}
              
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
              
              {recordingError && (
                <Alert status="error" size="sm" mb={3}>
                  <AlertIcon />
                  <Text fontSize="sm">{recordingError}</Text>
                </Alert>
              )}
              
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
            </Box>

            <Divider />

            {/* Form Fields */}
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
                  {speechToText && (
                    <Badge ml={2} colorScheme="green" variant="outline" fontSize="xs">
                      Speech Input
                    </Badge>
                  )}
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