import { useLanguage } from '../contexts/LanguageContext';

export const useLocalization = () => {
  const { translations } = useLanguage();

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    let translatedString = translations?.[key] || key;

    if (replacements) {
      Object.keys(replacements).forEach(placeholder => {
        translatedString = translatedString.replace(
          new RegExp(`\\{${placeholder}\\}`, 'g'),
          String(replacements[placeholder])
        );
      });
    }

    return translatedString;
  };

  return { t };
};