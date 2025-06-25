import React from 'react';
import { Box, Container, Heading, Button, HStack, IconButton, Tooltip } from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { useNavigate, useParams } from 'react-router-dom';
import EnhancedCaseDiary from '../components/legal/EnhancedCaseDiary';

const CaseDiaryPage: React.FC = () => {
  const navigate = useNavigate();
  const { caseId } = useParams<{ caseId: string }>();

  return (
    <Container maxW="container.xl" py={5}>
      <HStack mb={5} spacing={4}>
        <Tooltip label="Back to case">
          <IconButton
            icon={<ArrowBackIcon />}
            aria-label="Back to case"
            onClick={() => navigate(`/case/${caseId}`)}
          />
        </Tooltip>
        <Heading size="lg">Case Diary</Heading>
      </HStack>

      <Box bg="white" borderRadius="lg" boxShadow="sm">
        <EnhancedCaseDiary />
      </Box>
    </Container>
  );
};

export default CaseDiaryPage;
