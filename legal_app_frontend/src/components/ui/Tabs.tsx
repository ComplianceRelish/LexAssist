// src/components/ui/Tabs.tsx
import React, { useState } from 'react';
import { Box, BoxProps, Flex, FlexProps, ButtonProps } from '@chakra-ui/react';

// TabContext
interface TabContextType {
  selectedIndex: number;
  onChange: (index: number) => void;
}

const TabContext = React.createContext<TabContextType>({
  selectedIndex: 0,
  onChange: () => {},
});

// Tabs component
interface TabsProps extends Omit<BoxProps, 'onChange'> {
  children: React.ReactNode;
  index?: number;
  onChange?: (index: number) => void;
  isFitted?: boolean;
  variant?: string;
  colorScheme?: string;
}

export const Tabs: React.FC<TabsProps> = ({ 
  children, 
  index: controlledIndex,
  onChange,
  ...rest
}) => {
  const [selectedIndex, setSelectedIndex] = useState(controlledIndex || 0);
  
  const handleChange = (index: number) => {
    if (onChange) {
      onChange(index);
    } else {
      setSelectedIndex(index);
    }
  };
  
  const currentIndex = controlledIndex !== undefined ? controlledIndex : selectedIndex;
  
  return (
    <TabContext.Provider value={{ selectedIndex: currentIndex, onChange: handleChange }}>
      <Box {...rest}>
        {children}
      </Box>
    </TabContext.Provider>
  );
};

// TabList component
interface TabListProps extends FlexProps {
  children: React.ReactNode;
  mb?: number | string;
}

export const TabList: React.FC<TabListProps> = ({ children, ...rest }) => {
  return (
    <Flex role="tablist" {...rest}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        return React.cloneElement(child as React.ReactElement<any>, {
          index,
        });
      })}
    </Flex>
  );
};

// Tab component
interface TabProps extends ButtonProps {
  children: React.ReactNode;
  index?: number;
  _selected?: any;
}

export const Tab: React.FC<TabProps> = ({ children, index = 0, _selected, ...rest }) => {
  const { selectedIndex, onChange } = React.useContext(TabContext);
  const isSelected = index === selectedIndex;
  
  return (
    <Box
      as="button"
      role="tab"
      aria-selected={isSelected}
      py={2}
      px={4}
      cursor="pointer"
      onClick={() => onChange(index)}
      fontWeight={isSelected ? 'semibold' : 'normal'}
      {...(isSelected && _selected ? _selected : {})}
      {...rest}
    >
      {children}
    </Box>
  );
};

// TabPanels component
interface TabPanelsProps extends BoxProps {
  children: React.ReactNode;
}

export const TabPanels: React.FC<TabPanelsProps> = ({ children, ...rest }) => {
  return (
    <Box {...rest}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return null;
        
        return React.cloneElement(child as React.ReactElement<any>, {
          index,
        });
      })}
    </Box>
  );
};

// TabPanel component
interface TabPanelProps extends BoxProps {
  children: React.ReactNode;
  index?: number;
}

export const TabPanel: React.FC<TabPanelProps> = ({ children, index = 0, ...rest }) => {
  const { selectedIndex } = React.useContext(TabContext);
  
  if (index !== selectedIndex) {
    return null;
  }
  
  return (
    <Box 
      role="tabpanel" 
      tabIndex={0} 
      aria-labelledby={`tab-${index}`}
      {...rest}
    >
      {children}
    </Box>
  );
};