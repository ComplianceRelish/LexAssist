// src/components/user/UserProfile.tsx
import React, { useState } from 'react';
import { 
  Box, Button, VStack, HStack, Avatar, Heading, Text, FormControl, 
  FormLabel, Input, useToast, Badge, Divider, SimpleGrid
} from '@chakra-ui/react';
import { User, Subscription } from '../../types';

interface UserProfileProps {
  user: User | null;
  subscription: Subscription | null;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, subscription }) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const toast = useToast();
  
  if (!user) {
    return <Box>Loading user profile...</Box>;
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  
  const handleSave = () => {
    // In a real app, this would call an API to update the user profile
    // For now, we'll just simulate success
    toast({
      title: 'Profile Updated',
      description: 'Your profile has been successfully updated.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
    setIsEditing(false);
  };
  
  const getSubscriptionColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'gray';
      case 'pro': return 'blue';
      case 'enterprise': return 'purple';
      default: return 'gray';
    }
  };
  
  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" bg="white" shadow="md">
      <VStack spacing={8} align="stretch">
        <HStack spacing={6} alignItems="flex-start">
          <Avatar size="xl" name={user.name} src={user.avatarUrl} />
          <VStack align="flex-start" spacing={2} flex={1}>
            <Heading size="lg">{user.name}</Heading>
            <Text color="gray.500">{user.email}</Text>
            {subscription && (
              <Badge colorScheme={getSubscriptionColor(subscription.tier)}>
                {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} Plan
              </Badge>
            )}
          </VStack>
          {!isEditing ? (
            <Button colorScheme="blue" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          ) : (
            <HStack>
              <Button onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button colorScheme="blue" onClick={handleSave}>Save</Button>
            </HStack>
          )}
        </HStack>
        
        <Divider />
        
        {isEditing ? (
          <VStack spacing={4} align="stretch">
            <FormControl id="name">
              <FormLabel>Full Name</FormLabel>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </FormControl>
            
            <FormControl id="email">
              <FormLabel>Email</FormLabel>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </FormControl>
            
            <FormControl id="phone">
              <FormLabel>Phone Number</FormLabel>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </FormControl>
          </VStack>
        ) : (
          <VStack spacing={6} align="stretch">
            <Box>
              <Heading size="md" mb={4}>Subscription Details</Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box p={3} borderWidth="1px" borderRadius="md">
                  <Text fontSize="sm" color="gray.500">Current Plan</Text>
                  <Text fontWeight="bold">
                    {subscription?.tier 
                      ? subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1) 
                      : 'No Plan'}
                  </Text>
                </Box>
                
                <Box p={3} borderWidth="1px" borderRadius="md">
                  <Text fontSize="sm" color="gray.500">Renewal Date</Text>
                  <Text fontWeight="bold">
                    {subscription?.expiresAt 
                      ? new Date(subscription.expiresAt).toLocaleDateString() 
                      : 'N/A'}
                  </Text>
                </Box>
              </SimpleGrid>
            </Box>
            
            <Box>
              <Heading size="md" mb={4}>Usage Statistics</Heading>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Box p={3} borderWidth="1px" borderRadius="md">
                  <Text fontSize="sm" color="gray.500">Briefs Analyzed</Text>
                  <Text fontWeight="bold">{user.stats?.briefsAnalyzed || 0}</Text>
                </Box>
                
                <Box p={3} borderWidth="1px" borderRadius="md">
                  <Text fontSize="sm" color="gray.500">Documents Downloaded</Text>
                  <Text fontWeight="bold">{user.stats?.documentsDownloaded || 0}</Text>
                </Box>
                
                <Box p={3} borderWidth="1px" borderRadius="md">
                  <Text fontSize="sm" color="gray.500">Last Activity</Text>
                  <Text fontWeight="bold">
                    {user.stats?.lastActivity 
                      ? new Date(user.stats.lastActivity).toLocaleDateString() 
                      : 'Never'}
                  </Text>
                </Box>
              </SimpleGrid>
            </Box>
          </VStack>
        )}
      </VStack>
    </Box>
  );
};

export default UserProfile;
