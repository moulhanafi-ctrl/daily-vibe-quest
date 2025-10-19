// National mental health & crisis hotlines (US & Canada)

export interface Hotline {
  name: string;
  country: "US" | "CA";
  phone?: string;
  text?: string;
  website: string;
  description?: string;
  tags?: string[];
}

export const NATIONAL_HOTLINES: Hotline[] = [
  // United States
  {
    name: "988 Suicide & Crisis Lifeline",
    country: "US",
    phone: "988",
    text: "988",
    website: "https://988lifeline.org",
    description: "24/7 free and confidential support for people in distress",
    tags: ["suicide", "crisis", "24/7"],
  },
  {
    name: "Crisis Text Line",
    country: "US",
    text: "Text HOME to 741741",
    website: "https://www.crisistextline.org/",
    description: "Free 24/7 support for those in crisis. Text HOME to 741741",
    tags: ["crisis", "text", "24/7"],
  },
  {
    name: "211 Community Resources",
    country: "US",
    phone: "211",
    website: "https://www.211.org",
    description: "Local social services, mental health support, and community resources",
    tags: ["community", "resources", "local"],
  },
  {
    name: "The Trevor Project",
    country: "US",
    phone: "1-866-488-7386",
    text: "Text START to 678-678",
    website: "https://www.thetrevorproject.org",
    description: "24/7 crisis support for LGBTQ+ youth",
    tags: ["lgbtq", "youth", "crisis", "24/7"],
  },
  {
    name: "National Domestic Violence Hotline",
    country: "US",
    phone: "1-800-799-7233",
    text: "Text START to 88788",
    website: "https://www.thehotline.org",
    description: "24/7 support for domestic violence survivors",
    tags: ["domestic-violence", "crisis", "24/7"],
  },
  {
    name: "Veterans Crisis Line",
    country: "US",
    phone: "988 (Press 1)",
    text: "Text 838255",
    website: "https://www.veteranscrisisline.net",
    description: "24/7 support for veterans and their families",
    tags: ["veterans", "crisis", "24/7"],
  },
  {
    name: "SAMHSA National Helpline",
    country: "US",
    phone: "1-800-662-4357",
    website: "https://www.samhsa.gov/find-help/national-helpline",
    description: "Treatment referral and information service (in English and Spanish)",
    tags: ["substance-abuse", "treatment", "24/7"],
  },

  // Canada
  {
    name: "988 Suicide Crisis Helpline",
    country: "CA",
    phone: "988",
    text: "988",
    website: "https://988.ca",
    description: "24/7 suicide prevention and crisis support",
    tags: ["suicide", "crisis", "24/7"],
  },
  {
    name: "Talk Suicide Canada",
    country: "CA",
    phone: "1-833-456-4566",
    text: "Text 45645",
    website: "https://talksuicide.ca",
    description: "24/7 support for those affected by suicide",
    tags: ["suicide", "crisis", "24/7"],
  },
  {
    name: "Kids Help Phone",
    country: "CA",
    phone: "1-800-668-6868",
    text: "Text CONNECT to 686868",
    website: "https://kidshelpphone.ca",
    description: "24/7 support for young people",
    tags: ["youth", "crisis", "24/7"],
  },
  {
    name: "211 Canada",
    country: "CA",
    phone: "211",
    website: "https://211.ca",
    description: "Community, social, health and government services",
    tags: ["community", "resources", "local"],
  },
  {
    name: "Hope for Wellness Helpline",
    country: "CA",
    phone: "1-855-242-3310",
    website: "https://www.hopeforwellness.ca",
    description: "24/7 support for Indigenous peoples (English, French, Cree, Ojibway, Inuktitut)",
    tags: ["indigenous", "crisis", "24/7"],
  },
];

export function getHotlinesByCountry(country: "US" | "CA"): Hotline[] {
  return NATIONAL_HOTLINES.filter((h) => h.country === country);
}

export function getAllHotlines(): Hotline[] {
  return NATIONAL_HOTLINES;
}
