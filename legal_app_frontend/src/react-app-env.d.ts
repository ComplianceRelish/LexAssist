// This file contains type declarations for modules without TypeScript definitions

// Allow importing JSX files in TypeScript
declare module '*.jsx' {
  import React from 'react';
  const Component: React.ComponentType<any>;
  export default Component;
}

// React Bootstrap
declare module 'react-bootstrap' {
  export const Container: React.ComponentType<any>;
  export const Row: React.ComponentType<any>;
  export const Col: React.ComponentType<any>;
  export const Card: React.ComponentType<any> & {
    Body: React.ComponentType<any>;
  };
  export const Tabs: React.ComponentType<any>;
  export const Tab: React.ComponentType<any>;
  export const Form: React.ComponentType<any> & {
    Group: React.ComponentType<any>;
    Label: React.ComponentType<any>;
    Control: React.ComponentType<any>;
  };
  export const Button: React.ComponentType<any>;
  export const Alert: React.ComponentType<any>;
  export const Spinner: React.ComponentType<any>;
}
