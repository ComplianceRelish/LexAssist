// src/components/subscription/SubscriptionPlans.tsx
import React from 'react';
import { Box, Button, Heading, Text, SimpleGrid, VStack, List, ListItem, ListIcon, useToast } from '@chakra-ui/react';
import { CheckIcon } from '@chakra-ui/icons';

interface SubscriptionPlansProps {
  onSubscribe: (tier: string) => void;
  currentPlan?: string;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onSubscribe, currentPlan }) => {
  const toast = useToast();
  
  const plans = [
    {
      name: 'Free',
      price: '₹0',
      period: 'forever',
      features: [
        'Basic legal brief analysis',
        'Access to public law sections',
        'Limited case history',
      ],
      buttonText: currentPlan === 'free' ? 'Current Plan' : 'Get Started',
      color: 'gray',
    },
    {
      name: 'Professional',
      price: '₹999',
      period: 'per month',
      features: [
        'Everything in Free',
        'Comprehensive legal analysis',
        'Unlimited case history access',
        'Document download & sharing',
        'Priority processing',
      ],
      buttonText: currentPlan === 'pro' ? 'Current Plan' : 'Subscribe',
      color: 'blue',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '₹4999',
      period: 'per month',
      features: [
        'Everything in Professional',
        'Team collaboration',
        'Custom integrations',
        'Advanced analytics',
        'Dedicated support',
        'White labeling',
      ],
      buttonText: currentPlan === 'enterprise' ? 'Current Plan' : 'Contact Sales',
      color: 'purple',
    }
  ];
  
  const handleSubscribe = (plan: string) => {
    if (plan === currentPlan) {
      toast({
        title: 'Already Subscribed',
        description: `You are already subscribed to the ${plan} plan.`,
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (plan === 'enterprise') {
      toast({
        title: 'Contact Sales',
        description: 'Our team will contact you shortly to discuss enterprise options.',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    onSubscribe(plan);
  };
  
  return (
    <Box p={4}>
      <VStack spacing={8} align="center" mb={8}>
        <Heading>Choose Your Plan</Heading>
        <Text>Select the plan that best fits your legal needs</Text>
      </VStack>
      
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} px={{ base: 2, lg: 8 }}>
        {plans.map((plan) => (
          <Box
            key={plan.name}
            borderWidth={plan.popular ? '2px' : '1px'}
            borderColor={plan.popular ? `${plan.color}.500` : 'gray.200'}
            borderRadius="lg"
            overflow="hidden"
            p={6}
            position="relative"
            bg="white"
            shadow={plan.popular ? 'lg' : 'md'}
            transform={plan.popular ? 'scale(1.05)' : 'none'}
          >
            {plan.popular && (
              <Box
                position="absolute"
                top={0}
                right={0}
                bg={`${plan.color}.500`}
                color="white"
                px={3}
                py={1}
                borderBottomLeftRadius="md"
                fontSize="sm"
              >
                Most Popular
              </Box>
            )}
            
            <VStack spacing={4} align="stretch">
              <Heading size="md" color={`${plan.color}.500`}>{plan.name}</Heading>
              <Box>
                <Text fontSize="3xl" fontWeight="bold">
                  {plan.price}
                  <Text as="span" fontSize="sm" fontWeight="medium" color="gray.500">
                    /{plan.period}
                  </Text>
                </Text>
              </Box>
              
              <List spacing={3} mt={4}>
                {plan.features.map((feature, index) => (
                  <ListItem key={index}>
                    <ListIcon as={CheckIcon} color={`${plan.color}.500`} />
                    {feature}
                  </ListItem>
                ))}
              </List>
              
              <Button 
                colorScheme={plan.color} 
                variant={currentPlan === plan.name.toLowerCase() ? 'outline' : 'solid'}
                isDisabled={currentPlan === plan.name.toLowerCase()}
                onClick={() => handleSubscribe(plan.name.toLowerCase())}
                mt={4}
              >
                {plan.buttonText}
              </Button>
            </VStack>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default SubscriptionPlans;