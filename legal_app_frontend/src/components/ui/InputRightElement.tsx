// src/components/ui/InputRightElement.tsx
import React from 'react';
import { Box, BoxProps } from '@chakra-ui/react';

interface InputRightElementProps extends BoxProps {
  children: React.ReactNode;
  width?: string | number;
}

const InputRightElement: React.FC<InputRightElementProps> = ({ 
  children, 
  width = "4.5rem",
  ...rest 
}) => {
  return (
    <Box 
      position="absolute" 
      right="0" 
      top="0" 
      height="100%"
      width={width}
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={1}
      {...rest}
    >
      {children}
    </Box>
  );
};

export default InputRightElement;