import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import commonEN from '@/locales/en/common.json';

import onboardingEN from '@/locales/en/onboarding.json';

import arthurEN from '@/locales/en/arthur.json';

import legalEN from '@/locales/en/legal.json';

const resources = {
  en: {
    common: commonEN,
    onboarding: onboardingEN,
    arthur: arthurEN,
    legal: legalEN,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'onboarding', 'arthur', 'legal'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
    },
  });

// Track missing keys
i18n.on('missingKey', (lngs, namespace, key) => {
  console.warn(`Missing i18n key: ${namespace}:${key} for language(s): ${lngs.join(', ')}`);
});

export default i18n;
