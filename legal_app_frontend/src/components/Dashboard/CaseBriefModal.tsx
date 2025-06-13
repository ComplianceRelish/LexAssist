// src/components/Dashboard/CaseBriefModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Button,
  HStack,
  Box,
  Text,
  useToast,
} from '@chakra-ui/react';

interface CaseBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const CaseBriefModal: React.FC<CaseBriefModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    clientName: '',
    caseTitle: '',
    caseType: '',
    briefDescription: '',
    urgencyLevel: 'medium',
    courtLevel: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientName || !formData.caseTitle || !formData.briefDescription) {
      toast({
        title: 'Please fill in all required fields',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({
        clientName: '',
        caseTitle: '',
        caseType: '',
        briefDescription: '',
        urgencyLevel: 'medium',
        courtLevel: '',
      });
    } catch (error) {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader color="#1A365D">New Case Brief Entry</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Box mb={4} p={4} bg="blue.50" borderRadius="md" borderLeft="4px solid #1A365D">
            <Text fontSize="sm" color="gray.700">
              <strong>AI Analysis Powered by InLegalBERT:</strong> Once you submit this brief, 
              our AI will analyze it using specialized legal language models and provide relevant 
              law sections, precedents, and case recommendations.
            </Text>
          </Box>

          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Client Name</FormLabel>
                <Input
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Enter client name"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Case Title</FormLabel>
                <Input
                  value={formData.caseTitle}
                  onChange={(e) => setFormData({ ...formData, caseTitle: e.target.value })}
                  placeholder="e.g., Property Dispute - Land Acquisition"
                />
              </FormControl>

              <HStack spacing={4} w="full">
                <FormControl>
                  <FormLabel>Case Type</FormLabel>
                  <Select
                    value={formData.caseType}
                    onChange={(e) => setFormData({ ...formData, caseType: e.target.value })}
                  >
                    <option value="">Select case type</option>
                    <option value="civil">Civil</option>
                    <option value="criminal">Criminal</option>
                    <option value="corporate">Corporate</option>
                    <option value="property">Property</option>
                    <option value="family">Family</option>
                    <option value="constitutional">Constitutional</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Court Level</FormLabel>
                  <Select
                    value={formData.courtLevel}
                    onChange={(e) => setFormData({ ...formData, courtLevel: e.target.value })}
                  >
                    <option value="">Select court</option>
                    <option value="district">District Court</option>
                    <option value="high">High Court</option>
                    <option value="supreme">Supreme Court</option>
                    <option value="tribunal">Tribunal</option>
                  </Select>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Urgency Level</FormLabel>
                <Select
                  value={formData.urgencyLevel}
                  onChange={(e) => setFormData({ ...formData, urgencyLevel: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Case Brief Description</FormLabel>
                <Textarea
                  value={formData.briefDescription}
                  onChange={(e) => setFormData({ ...formData, briefDescription: e.target.value })}
                  placeholder="Provide detailed description of the case, key facts, legal issues, and any specific questions you need assistance with..."
                  rows={6}
                />
              </FormControl>

              <HStack spacing={4} w="full" pt={4}>
                <Button variant="outline" onClick={onClose} flex={1}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  bg="#1A365D"
                  color="white"
                  isLoading={submitting}
                  loadingText="Submitting for AI Analysis..."
                  flex={1}
                  _hover={{ bg: "#2A4A6B" }}
                >
                  Submit for Analysis
                </Button>
              </HStack>
            </VStack>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CaseBriefModal;