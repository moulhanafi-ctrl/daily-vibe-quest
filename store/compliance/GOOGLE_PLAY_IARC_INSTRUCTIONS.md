# Google Play IARC Content Rating - Instructions

**App**: Daily Vibe Check  
**Category**: Health & Fitness - Mental Health & Peer Support  
**Target Age**: 13+ (with parental consent for <13)

---

## Overview

The International Age Rating Coalition (IARC) questionnaire is required for all apps submitted to Google Play. This document provides guidance on how to complete the questionnaire accurately based on the app's features.

---

## Accessing the IARC Questionnaire

1. Log in to [Google Play Console](https://play.google.com/console)
2. Select your app: **Daily Vibe Check**
3. Navigate to: **Policy → Content rating**
4. Click: **Start questionnaire**

---

## Questionnaire Answers

### Section 1: App Category

**Question**: What category best describes your app?

**Answer**: ✅ **Health & Fitness**

**Sub-category**: Mental Health / Peer Support

---

### Section 2: Content Description

#### Does your app contain any of the following?

##### Violence
**Question**: Does your app depict or reference violence?

**Answer**: ❌ **NO**

**Explanation**: The app is focused on mental wellness and peer support. No violent content.

---

##### Sexuality
**Question**: Does your app contain sexual content or nudity?

**Answer**: ❌ **NO**

**Explanation**: Community guidelines prohibit sexual content. AI moderation enforces this.

---

##### Language
**Question**: Does your app contain profanity or crude humor?

**Answer**: ⚠️ **POSSIBLE (USER-GENERATED)**

**Follow-up**: Is profanity frequent or intense?

**Answer**: ❌ **NO - FILTERED**

**Explanation**: 
- User-generated content in chat rooms may contain profanity
- AI-powered profanity filter actively moderates all messages
- Community guidelines prohibit offensive language
- Users can report and block others
- **File**: `supabase/functions/check-profanity/index.ts`

---

##### Fear/Horror
**Question**: Does your app contain content that could frighten or scare users?

**Answer**: ⚠️ **POSSIBLY (CRISIS CONTENT)**

**Follow-up**: Is this content intense or graphic?

**Answer**: ❌ **NO**

**Explanation**: 
- App includes crisis resources (988 Lifeline, Crisis Text Line)
- Content is supportive and resource-oriented, not graphic
- Focus is on help and support, not frightening imagery

---

##### Gambling
**Question**: Does your app simulate or facilitate gambling?

**Answer**: ❌ **NO**

---

##### Controlled Substances
**Question**: Does your app depict or reference drugs, alcohol, or tobacco?

**Answer**: ⚠️ **POSSIBLY (USER DISCUSSIONS)**

**Follow-up**: Does the app encourage or promote substance use?

**Answer**: ❌ **NO**

**Explanation**: 
- Users may discuss personal experiences with substance use in peer support context
- App does not promote, encourage, or glamorize substance use
- Focus is on mental health support and recovery

---

### Section 3: User Interaction Features

#### Does your app include any of the following features?

##### Users can interact with each other
**Question**: Can users communicate or interact with other users?

**Answer**: ✅ **YES**

**Follow-up**: Are interactions moderated?

**Answer**: ✅ **YES - ACTIVELY MODERATED**

**Moderation Details**:
- AI-powered profanity filter on all messages
- Community guidelines enforced
- Users can report inappropriate content
- Users can block others
- Admin moderation tools available
- **Files**: 
  - `supabase/functions/check-profanity/index.ts` - AI moderation
  - `src/components/chat/BlockUserButton.tsx` - User blocking
  - `src/pages/legal/CommunityGuidelines.tsx` - Guidelines

---

##### Users can share personal information
**Question**: Can users share personal information (email, phone, location)?

**Answer**: ⚠️ **LIMITED**

**Explanation**: 
- Users can share information voluntarily in chat rooms (first name, age)
- Email addresses are NOT visible to other users
- Location is NOT shared (ZIP code only used for local help lookup)
- Parents can view limited child profile data (with consent)

**Follow-up**: Does the app warn users about sharing personal information?

**Answer**: ✅ **YES**

**Evidence**: 
- Community guidelines warn against sharing personal information
- Onboarding includes consent flow with privacy information
- **File**: `src/components/legal/LegalConsentModal.tsx`

---

##### Users can purchase digital goods
**Question**: Can users make in-app purchases?

**Answer**: ✅ **YES**

**Follow-up**: Does the app use real-world currency or virtual currency?

**Answer**: ✅ **REAL-WORLD CURRENCY (via Stripe)**

**Purchase Types**:
- Subscription plans (monthly/yearly)
- Digital wellness products (journals, self-care bundles)
- All payments processed via Stripe (PCI DSS compliant)

**Parental Controls**:
- Users under 13 require parental consent
- Parental verification includes payment method verification
- **File**: `src/components/legal/ParentVerification.tsx`

---

##### Location sharing
**Question**: Does the app share the user's location with other users?

**Answer**: ❌ **NO**

**Explanation**: 
- ZIP code is used ONLY for local crisis resource lookup (Help Nearby feature)
- ZIP code is NOT shared with other users
- ZIP code is NOT stored permanently
- Feature is opt-in (user must manually enter ZIP code)
- **File**: `src/pages/help/HelpNearby.tsx`

---

### Section 4: Data Collection & Privacy

#### Does your app collect personal data?
**Question**: Does the app collect, share, or use personal data?

**Answer**: ✅ **YES**

**Follow-up**: Does the app have a privacy policy?

**Answer**: ✅ **YES**

**Privacy Policy URL**: `https://dailyvibecheck.com/legal/privacy`

**Data Collected**:
- Email (required for account)
- Name (optional)
- Mental health data (mood check-ins, journal entries)
- User-generated content (chat messages)
- Usage analytics (PostHog)

**Privacy Measures**:
- All data encrypted in transit (HTTPS/TLS)
- Database encryption at rest (Supabase)
- Row-Level Security (RLS) policies
- User can delete account and data (Settings → Privacy)
- User can export data (GDPR compliance)
- **File**: `src/pages/legal/Privacy.tsx`

---

### Section 5: Advertising

#### Does your app contain ads?
**Question**: Does the app display advertisements?

**Answer**: ❌ **NO**

**Explanation**: No third-party advertising. Revenue is from subscriptions and product sales only.

---

#### Does your app use data for tracking or advertising?
**Question**: Is user data used for targeted advertising or cross-app tracking?

**Answer**: ❌ **NO**

**Explanation**: 
- Analytics used only for app improvement (PostHog)
- No behavioral advertising
- No data sold to third parties
- No cross-app tracking

---

### Section 6: Social Features

#### Does your app have social features?
**Question**: Can users create profiles, friend lists, or social feeds?

**Answer**: ✅ **YES (LIMITED)**

**Social Features**:
- User profiles (username, avatar, mood history)
- Chat rooms (peer support communities)
- Family groups (parent-child linking)

**Privacy Controls**:
- Profiles are NOT public (only visible within chat rooms user joins)
- Users can block others
- Family linking requires parental consent for minors
- **Files**:
  - `src/components/settings/ProfileFieldsForm.tsx` - Profile management
  - `src/components/family/FamilyMembers.tsx` - Family linking

---

### Section 7: Age Restrictions

#### Does your app target children?
**Question**: Is the app specifically designed for children under 13?

**Answer**: ⚠️ **PARTIALLY**

**Explanation**: 
- Primary target: Ages 13-24 (teens and young adults)
- Secondary: Ages 25+ (adults)
- Also available to children under 13 WITH parental consent

**COPPA Compliance**: ✅ YES
- Parental verification required for users under 13
- Email verification + payment method verification ($0.50 test, refunded)
- Parents can view limited child data
- Age-appropriate content filtering
- **File**: `supabase/functions/guardian-start/index.ts`

---

#### What is the minimum age for users?
**Question**: What is the minimum age to use the app?

**Answer**: ✅ **NO MINIMUM AGE (with parental consent for <13)**

**Age Groups Supported**:
- Children (<13): With verifiable parental consent
- Teens (13-17): Full access with optional parental oversight
- Adults (18+): Full access

---

### Section 8: Health & Medical

#### Does your app provide health or medical information?
**Question**: Does the app offer health advice or medical information?

**Answer**: ⚠️ **YES (MENTAL HEALTH RESOURCES)**

**Follow-up**: Is the information provided by licensed healthcare professionals?

**Answer**: ❌ **NO - NOT PROFESSIONAL MEDICAL ADVICE**

**Disclaimer**: 
- App clearly states it is NOT therapy or medical care
- Prominent disclaimer in Terms of Service: "Vibe Check is not a substitute for professional mental health treatment"
- Crisis resources link to licensed professionals (988 Lifeline, Crisis Text Line)
- **File**: `src/pages/legal/Terms.tsx` - Medical disclaimer

**Content Type**:
- Mood tracking tools (self-assessment)
- Journaling prompts (reflective exercises)
- Crisis resource directory (988 Lifeline, Trevor Project, etc.)
- Peer support (moderated chat rooms)

---

### Section 9: Accessibility

#### Does your app include accessibility features?
**Question**: Is the app designed to be accessible to users with disabilities?

**Answer**: ✅ **YES**

**Accessibility Features**:
- Semantic HTML structure
- ARIA labels on interactive elements
- High contrast mode support
- Keyboard navigation
- Screen reader compatible
- **File**: `src/components/layout/SkipToContent.tsx` - Skip navigation

---

## Expected IARC Rating

Based on the above answers, the expected content rating is:

### ESRB (North America)
- **Rating**: **Teen (13+)**
- **Content Descriptors**: 
  - Mild Language (user-generated, filtered)
  - Social Interaction (moderated chat)
  - Users Interact
  - In-App Purchases

### PEGI (Europe)
- **Rating**: **PEGI 12**
- **Content Descriptors**: Moderate social interaction, in-app purchases

### USK (Germany)
- **Rating**: **USK 12**

### ClassInd (Brazil)
- **Rating**: **12+**

### ACB (Australia)
- **Rating**: **PG (Parental Guidance)**

---

## After Completing the Questionnaire

1. **Review all answers** before submitting
2. **Submit the questionnaire**
3. **Download the IARC certificate**:
   - After approval, download the certificate PDF
   - Save as: `/store/compliance/IARC_CERTIFICATE.pdf`
4. **Update Play Store listing**:
   - Content rating will automatically appear on your app's store listing
   - No further action required

---

## Important Notes

### Content Rating Appeals
If your app receives a higher rating than expected:
- Review the questionnaire answers
- Ensure moderation features are clearly described
- Emphasize safety features (profanity filter, reporting, blocking)
- Appeal if necessary via Google Play Console

### Rating Changes
Update the IARC questionnaire if:
- App adds new features (e.g., video chat)
- Content policies change
- New content types are introduced
- Age restrictions change

**Requirement**: Update content rating within 7 days of any feature changes

---

## Verification Checklist

Before submitting:
- [ ] All questions answered accurately
- [ ] Privacy policy URL is correct and accessible
- [ ] Moderation features emphasized
- [ ] Age restrictions clearly stated
- [ ] Medical disclaimer acknowledged (not professional advice)
- [ ] In-app purchase types declared
- [ ] User interaction features described
- [ ] COPPA compliance confirmed (parental consent)

---

## Contact for Rating Questions

**IARC Support**: https://www.globalratings.com/contact-us.aspx  
**Google Play Support**: https://support.google.com/googleplay/android-developer/

---

**Document Last Updated**: 2025-01-22  
**Next Review**: Before each app update or feature addition

---

**End of IARC Instructions**
