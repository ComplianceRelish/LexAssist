import React, { createContext, useContext, ReactNode } from 'react';

interface BrandContextType {
  logoUrl: string;
  logoLight: string;
  logoIcon: string;
  landingLogo: string;
  companyName: string;
}

const defaultBrandValues: BrandContextType = {
  logoUrl: '/images/logo.png',
  logoLight: '/images/logo-light.png', 
  logoIcon: '/images/logo-icon.png',
  landingLogo: '/images/LexAssist_Logo.png',
  companyName: 'LexAssist',
};

const BrandContext = createContext<BrandContextType>(defaultBrandValues);

interface BrandProviderProps {
  children: ReactNode;
}

export const BrandProvider: React.FC<BrandProviderProps> = ({ children }) => {
  return (
    <BrandContext.Provider value={defaultBrandValues}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => useContext(BrandContext);

export default BrandContext;