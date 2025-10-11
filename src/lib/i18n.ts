import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import commonEN from '@/locales/en/common.json';
import commonES from '@/locales/es/common.json';
import commonFR from '@/locales/fr/common.json';
import commonAR from '@/locales/ar/common.json';

import onboardingEN from '@/locales/en/onboarding.json';
import onboardingES from '@/locales/es/onboarding.json';
import onboardingFR from '@/locales/fr/onboarding.json';
import onboardingAR from '@/locales/ar/onboarding.json';

import arthurEN from '@/locales/en/arthur.json';
import arthurES from '@/locales/es/arthur.json';
import arthurFR from '@/locales/fr/arthur.json';
import arthurAR from '@/locales/ar/arthur.json';

const resources = {
  en: {
    common: commonEN,
    onboarding: onboardingEN,
    arthur: arthurEN,
  },
  es: {
    common: commonES,
    onboarding: onboardingES,
    arthur: arthurES,
  },
  fr: {
    common: commonFR,
    onboarding: onboardingFR,
    arthur: arthurFR,
  },
  ar: {
    common: commonAR,
    onboarding: onboardingAR,
    arthur: arthurAR,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'onboarding', 'arthur'],
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
