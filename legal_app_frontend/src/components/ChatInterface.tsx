import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Stack,
  Input,
  Button,
  Text,
  useToast,
  VStack,
  Avatar,
  Flex,
  IconButton,
  Textarea,
  Divider
} from '@chakra-ui/react';
import { MdSend, MdAttachFile } from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api.service';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  attachments?: string[];
}

interface ChatInterfaceProps {
  documentId?: string;
  onMessageSent?: (message: Message) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ documentId, onMessageSent }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const toast = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (documentId) {
      loadMessages();
    }
  }, [documentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.get<{ messages: Message[] }>(
        `/api/documents/${documentId}/messages`
      );
      setMessages(response.data.messages);
    } catch (error) {
      toast({
        title: 'Error loading messages',
        description: error instanceof Error ? error.message : 'Failed to load messages',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      setIsLoading(true);
      const message: Omit<Message, 'id' | 'timestamp'> = {
        content: newMessage.trim(),
        sender: user.id,
      };

      const response = await apiService.post<{ message: Message }>(
        `/api/documents/${documentId}/messages`,
        message
      );

      setMessages([...messages, response.data.message]);
      setNewMessage('');
      if (onMessageSent) {
        onMessageSent(response.data.message);
      }
    } catch (error) {
      toast({
        title: 'Error sending message',
        description: error instanceof Error ? error.message : 'Failed to send message',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box w="full" h="full" borderWidth="1px" borderRadius="lg" p={4}>
      <VStack h="full" spacing={4}>
        <Box flex={1} w="full" overflowY="auto" px={2}>
          {messages.map((message) => (
            <Flex
              key={message.id}
              mb={4}
              alignSelf={message.sender === user?.id ? 'flex-end' : 'flex-start'}
              maxW="70%"
            >
              {message.sender !== user?.id && (
                <Avatar size="sm" mr={2} name={message.sender} />
              )}
              <Box
                bg={message.sender === user?.id ? 'blue.500' : 'gray.100'}
                color={message.sender === user?.id ? 'white' : 'black'}
                borderRadius="lg"
                px={4}
                py={2}
              >
                <Text>{message.content}</Text>
                <Text fontSize="xs" color={message.sender === user?.id ? 'white' : 'gray.500'} mt={1}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Text>
              </Box>
            </Flex>
          ))}
          <div ref={messagesEndRef} />
        </Box>
        <Divider />
        <Stack direction="row" w="full" spacing={2} alignItems="flex-end">
          <IconButton
            aria-label="Attach file"
            icon={<MdAttachFile />}
            variant="ghost"
            isDisabled={isLoading}
          />
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            size="sm"
            resize="none"
            rows={3}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <IconButton
            aria-label="Send message"
            icon={<MdSend />}
            colorScheme="blue"
            isLoading={isLoading}
            onClick={handleSendMessage}
            isDisabled={!newMessage.trim()}
          />
        </Stack>
      </VStack>
    </Box>
  );
};

export default ChatInterface;
