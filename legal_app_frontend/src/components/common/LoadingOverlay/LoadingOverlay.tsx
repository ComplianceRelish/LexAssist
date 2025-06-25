import React, { ReactNode } from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  fullPage?: boolean;
  children?: ReactNode;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message,
  fullPage = true,
  children,
}) => {
  const bg = useColorModeValue('rgba(255, 255, 255, 0.9)', 'rgba(26, 32, 44, 0.9)');

  if (!isLoading) return <>{children}</>;

  return (
    <Box position="relative">
      {children && (
        <Box opacity={0.5} pointerEvents="none">
          {children}
        </Box>
      )}
      <Box
        position={fullPage ? 'fixed' : 'absolute'}
        top={0}
        left={0}
        right={0}
        bottom={0}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        bg={fullPage ? bg : 'none'}
        zIndex={9999}
        p={4}
      >
        <LoadingSpinner size={60} ariaLabel={message || 'Loading...'} />
        {message && (
          <Box mt={4} fontSize="lg" fontWeight="medium">
            {message}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default LoadingOverlay;
