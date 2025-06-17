// legal_app_frontend/src/pages/ClientDashboard/ClientDashboard.tsx
// Minimal client-focused dashboard with simplified brief entry
import React, { useState, useEffect } from 'react';
import { Box, Button, Heading, useToast, Spinner, VStack } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import ClientBriefModal from '../../components/Dashboard/ClientBriefModal';
import { apiService } from '../../services/api.service';
import { UserCase } from '../../types/dashboard';

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [showBriefModal, setShowBriefModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userCases, setUserCases] = useState<UserCase[]>([]);

  const loadCases = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const cases = await apiService.getUserCases(user.id);
      setUserCases(cases);
    } catch (err: any) {
      toast({ title: 'Failed to load cases', status: 'error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCases(); }, [user?.id]);

  const handleBriefSubmit = async (briefData: any) => {
    try {
      const submissionData = {
        user_id: user?.id,
        title: briefData.title,
        brief_text: briefData.brief_text,
        jurisdiction: briefData.jurisdiction || 'IN',
        court: null,
        case_type: null,
        urgency_level: 'medium',
      };
      const res = await apiService.submitCaseBrief(submissionData);
      toast({ title: 'Brief submitted for analysis', status: 'success' });
      setShowBriefModal(false);
      loadCases();
    } catch (err: any) {
      toast({ title: 'Submission failed', status: 'error', description: err.response?.data?.detail || err.message });
    }
  };

  return (
    <Box p={6}>
      <Heading size="lg" mb={6}>Welcome, {user?.firstName || user?.email}</Heading>
      <Button colorScheme="blue" onClick={() => setShowBriefModal(true)} mb={6}>New Case Brief</Button>

      {loading ? (
        <Spinner />
      ) : (
        <VStack align="stretch" spacing={4}>
          {userCases.map((c) => (
            <Box key={c.id} p={4} borderWidth={1} borderRadius="md">
              <Heading size="sm">{c.title}</Heading>
              <Box fontSize="sm" color="gray.600">{c.status}</Box>
            </Box>
          ))}
          {userCases.length === 0 && <Box>No briefs yet</Box>}
        </VStack>
      )}

      <ClientBriefModal 
        isOpen={showBriefModal}
        onClose={() => setShowBriefModal(false)}
        onSubmit={handleBriefSubmit}
      />
    </Box>
  );
};

export default ClientDashboard;
