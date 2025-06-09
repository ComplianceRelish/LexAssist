import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  Button,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Text,
  Stack,
  HStack,
  VStack,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, DownloadIcon, EditIcon, ViewIcon } from '@chakra-ui/icons';
import { supabase } from '../../supabase';

type Document = {
  id: string;
  name: string;
  type: string;
  size: number;
  uploaded_at: string;
  url: string;
};

const DocumentManagement = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchDocuments();
    } else {
      navigate('/login');
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      // In a real app, you would fetch documents for the current user
      // const { data, error } = await supabase
      //   .from('documents')
      //   .select('*')
      //   .eq('user_id', user?.id);
      
      // For demo purposes, we'll use mock data
      const mockDocuments: Document[] = [
        {
          id: '1',
          name: 'Contract Agreement.pdf',
          type: 'application/pdf',
          size: 2456789,
          uploaded_at: '2023-06-01T10:30:00Z',
          url: '#'
        },
        // Add more mock documents as needed
      ];
      
      setDocuments(mockDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    
    try {
      setIsUploading(true);
      
      // In a real app, you would upload the file to Supabase Storage
      // and save the document metadata to your database
      // const fileExt = selectedFile.name.split('.').pop();
      // const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      // 
      // const { error: uploadError } = await supabase.storage
      //   .from('documents')
      //   .upload(fileName, selectedFile);
      // 
      // if (uploadError) throw uploadError;
      // 
      // const { error: dbError } = await supabase
      //   .from('documents')
      //   .insert([
      //     { 
      //       user_id: user.id, 
      //       name: selectedFile.name,
      //       type: selectedFile.type,
      //       size: selectedFile.size,
      //       url: fileName
      //     },
      //   ]);
      // 
      // if (dbError) throw dbError;
      
      // For demo, just add to local state
      const newDoc: Document = {
        id: Math.random().toString(36).substring(2, 9),
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        uploaded_at: new Date().toISOString(),
        url: '#'
      };
      
      setDocuments([newDoc, ...documents]);
      
      toast({
        title: 'Success',
        description: 'Document uploaded successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onClose();
      setSelectedFile(null);
      setFileName('');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload document.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      // In a real app, you would delete the file from storage and the database
      // const { error: storageError } = await supabase.storage
      //   .from('documents')
      //   .remove([documentToDelete.url]);
      // 
      // if (storageError) throw storageError;
      // 
      // const { error: dbError } = await supabase
      //   .from('documents')
      //   .delete()
      //   .eq('id', docId);
      // 
      // if (dbError) throw dbError;
      
      // For demo, just remove from local state
      setDocuments(documents.filter(doc => doc.id !== docId));
      
      toast({
        title: 'Success',
        description: 'Document deleted successfully!',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="50vh">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box p={6}>
      <HStack justifyContent="space-between" mb={6}>
        <VStack align="flex-start" spacing={1}>
          <Heading as="h1" size="lg">My Documents</Heading>
          <Text color="gray.500">Manage your legal documents</Text>
        </VStack>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={onOpen}
        >
          Upload Document
        </Button>
      </HStack>

      {documents.length === 0 ? (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>No documents found</AlertTitle>
            <AlertDescription>
              Upload your first document to get started.
            </AlertDescription>
          </Box>
        </Alert>
      ) : (
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Size</Th>
                <Th>Uploaded</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {documents.map((doc) => (
                <Tr key={doc.id}>
                  <Td fontWeight="medium">{doc.name}</Td>
                  <Td textTransform="uppercase">{doc.type.split('/')[1] || doc.type}</Td>
                  <Td>{formatFileSize(doc.size)}</Td>
                  <Td>{formatDate(doc.uploaded_at)}</Td>
                  <Td>
                    <Stack direction="row" spacing={2}>
                      <IconButton
                        aria-label="View document"
                        icon={<ViewIcon />}
                        size="sm"
                        onClick={() => window.open(doc.url, '_blank')}
                      />
                      <IconButton
                        aria-label="Download document"
                        icon={<DownloadIcon />}
                        size="sm"
                        onClick={() => window.open(doc.url, '_download')}
                      />
                      <IconButton
                        aria-label="Delete document"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => handleDelete(doc.id)}
                      />
                    </Stack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      {/* Upload Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Upload Document</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel>Choose a file</FormLabel>
              <Input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt"
                p={1}
              />
              {selectedFile && (
                <Text mt={2} fontSize="sm" color="gray.500">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </Text>
              )}
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleUpload}
              isLoading={isUploading}
              loadingText="Uploading..."
              isDisabled={!selectedFile}
            >
              Upload
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DocumentManagement;
