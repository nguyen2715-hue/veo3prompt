import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

type Translations = Record<string, string>;

interface LanguageContextType {
  translations: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [translations, setTranslations] = useState<Translations>({});
  const language = 'vi'; // Hardcode to Vietnamese

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        const response = await fetch(`./localization/${language}.json`);
        if (!response.ok) {
          throw new Error(`Không thể tải tệp dịch cho ${language}.`);
        }
        const data = await response.json();
        setTranslations(data);
      } catch (error) {
        console.error(`Không thể tải bản dịch ${language}:`, error);
        setTranslations({});
      }
    };
    
    fetchTranslations();
  }, []); // Run only once

  const value = { translations };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
