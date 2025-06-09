// legal_app_frontend/src/components/forms/FormErrorMessage.tsx
import { FormErrorMessage as ChakraFormErrorMessage, FormErrorMessageProps } from '@chakra-ui/react';

export const FormErrorMessage = (props: FormErrorMessageProps) => {
  return <ChakraFormErrorMessage {...props} />;
};

export default FormErrorMessage;