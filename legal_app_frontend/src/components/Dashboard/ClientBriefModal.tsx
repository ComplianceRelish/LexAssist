// legal_app_frontend/src/components/Dashboard/ClientBriefModal.tsx
// Simplified modal for layman clients: only title, narrative text, and jurisdiction

import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  VStack,
  HStack,
  useToast,
} from '@chakra-ui/react';

interface ClientBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu & Kashmir', 'Ladakh'
];

const ClientBriefModal: React.FC<ClientBriefModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    brief_text: '',
    jurisdiction: '',
  });
  const toast = useToast();

  const handleSubmit = () => {
    if (!formData.title.trim() || !formData.brief_text.trim()) {
      toast({ title: 'Please fill in required fields', status: 'warning' });
      return;
    }
    onSubmit(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" motionPreset="slideInBottom">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Describe Your Legal Issue</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>Title</FormLabel>
              <Input
                placeholder="Short title of your problem"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Details</FormLabel>
              <Textarea
                placeholder="Explain the situation in your own words"
                value={formData.brief_text}
                onChange={(e) => setFormData({ ...formData, brief_text: e.target.value })}
                rows={6}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Jurisdiction (State)</FormLabel>
              <Select
                placeholder="Select State"
                value={formData.jurisdiction}
                onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
              >
                {indianStates.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </Select>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button colorScheme="blue" onClick={handleSubmit}>Submit</Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ClientBriefModal;
