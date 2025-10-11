import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const RTL_LANGUAGES = ['ar'];

export const useRTL = () => {
  const { i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);

  useEffect(() => {
    // Set document direction
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;

    // Set RTL attribute for styling
    if (isRTL) {
      document.documentElement.setAttribute('data-rtl', 'true');
    } else {
      document.documentElement.removeAttribute('data-rtl');
    }
  }, [isRTL, i18n.language]);

  return { isRTL, language: i18n.language };
};
