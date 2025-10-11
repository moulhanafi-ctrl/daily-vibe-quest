# Feature Flags System

## Overview
Feature flags allow controlled rollout of features and emergency kill switches for post-launch incidents.

## Usage

### Check a single flag in a component:
```tsx
import { useFeatureFlag } from "@/hooks/useFeatureFlags";

const MyComponent = () => {
  const notificationsEnabled = useFeatureFlag("ff.notifications");
  
  if (!notificationsEnabled) {
    return <div>Notifications temporarily disabled</div>;
  }
  
  return <div>Show notifications...</div>;
};
```

### Wrap components with FeatureGate:
```tsx
import { FeatureGate } from "@/components/FeatureGate";

const App = () => (
  <FeatureGate 
    flag="ff.store_pdp_v2" 
    fallback={<OldProductPage />}
    showDisabledMessage={true}
  >
    <NewProductPage />
  </FeatureGate>
);
```

### Toggle flags programmatically:
```tsx
import { toggleFeatureFlag } from "@/hooks/useFeatureFlags";

await toggleFeatureFlag("ff.notifications_pause", true); // Enable kill switch
```

## Flag Categories

### Core (`core`)
- `ff.core` - Core app functionality
- `ff.i18n_core` - Internationalization support

### i18n (`i18n`)
- `ff.lang_en` - English language
- `ff.lang_es` - Spanish language
- `ff.lang_fr` - French language
- `ff.lang_ar` - Arabic language

### Features
- `ff.store_pdp_v2` - New product detail page (store)
- `ff.room_safety` - Room safety features like report/mute (rooms)
- `ff.local_help` - Local help directory (help)
- `ff.legal_gate` - Legal consent gate (legal)
- `ff.notifications` - Arthur notifications (notifications)

### Admin (`admin`)
- `ff.admin_automations` - Admin automation tools
- `ff.bulk_emails` - Bulk email sending

### Kill Switches (`killswitch`)
Emergency switches to disable features immediately:
- `ff.notifications_pause` - Pause all notifications
- `ff.store_disable` - Disable entire store
- `ff.rooms_disable` - Disable chat rooms

## Admin Interface
Visit `/admin/flags` to manage all feature flags with a GUI.

## Kill Switch Protocol
1. Navigate to `/admin/flags`
2. Find the "killswitch" category
3. Enable the appropriate kill switch
4. Monitor the impact
5. Fix the underlying issue
6. Disable the kill switch to restore service

## Best Practices
1. Always use feature flags for new major features
2. Test with flags OFF before launch
3. Keep kill switches ready for critical features
4. Document flag dependencies
5. Clean up unused flags after full rollout
