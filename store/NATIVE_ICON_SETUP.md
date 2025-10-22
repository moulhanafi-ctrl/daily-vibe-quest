# Native App Icon Setup Guide

## Overview
The 1024×1024 app icon has been generated at `/store/icons/app-icon-1024.png` and meets Apple App Store specifications.

## App Store Specifications Met ✅
- ✅ Square format (1024×1024 pixels)
- ✅ No rounded corners (iOS applies rounding automatically)
- ✅ RGB color space
- ✅ 72 DPI minimum
- ✅ PNG format with no alpha channel (no transparency)

## iOS Setup (Apple App Store)

### Step 1: Add iOS Platform
```bash
npx cap add ios
```

### Step 2: Copy Icon to iOS Project
```bash
# Copy the 1024×1024 icon to iOS assets
cp store/icons/app-icon-1024.png ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

### Step 3: Update Contents.json
Open `ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json` and add:
```json
{
  "images" : [
    {
      "size" : "1024x1024",
      "idiom" : "ios-marketing",
      "filename" : "app-icon-1024.png",
      "scale" : "1x"
    }
  ]
}
```

### Step 4: Open in Xcode
```bash
npx cap open ios
```

### Step 5: Verify in Xcode
- Open Xcode
- Navigate to: App → Assets.xcassets → AppIcon
- Verify the 1024×1024 icon appears
- Build and test on simulator/device

## Android Setup (Google Play Store)

### Step 1: Add Android Platform
```bash
npx cap add android
```

### Step 2: Generate Android Icon Sizes
Android requires multiple icon sizes. Use a tool like:
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html)
- Or manually resize to: 48×48, 72×72, 96×96, 144×144, 192×192, 512×512

### Step 3: Copy Icons to Android Project
```bash
# Create mipmap directories if they don't exist
mkdir -p android/app/src/main/res/mipmap-mdpi
mkdir -p android/app/src/main/res/mipmap-hdpi
mkdir -p android/app/src/main/res/mipmap-xhdpi
mkdir -p android/app/src/main/res/mipmap-xxhdpi
mkdir -p android/app/src/main/res/mipmap-xxxhdpi

# Copy resized icons (you'll need to resize the 1024×1024 icon first)
# ic_launcher.png for each density:
# mdpi: 48×48
# hdpi: 72×72
# xhdpi: 96×96
# xxhdpi: 144×144
# xxxhdpi: 192×192
```

### Step 4: Update AndroidManifest.xml
Ensure `android/app/src/main/AndroidManifest.xml` references the icon:
```xml
<application
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"
    ...>
```

### Step 5: Open in Android Studio
```bash
npx cap open android
```

### Step 6: Verify in Android Studio
- Open Android Studio
- Navigate to: app → res → mipmap folders
- Verify icons appear for all densities
- Build and test on emulator/device

## Capacitor Config Reference
The app configuration is in `capacitor.config.ts`:
```typescript
{
  appId: 'com.dailyvibequest.app',
  appName: 'Daily Vibe Check',
  // ... other config
}
```

## Quick Reference

### File Locations
- **Source Icon**: `/store/icons/app-icon-1024.png`
- **iOS Icon**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- **Android Icons**: `android/app/src/main/res/mipmap-*/`

### Required Sizes
- **iOS**: 1024×1024 (App Store Connect)
- **Android**: 512×512 (Google Play Console) + multiple densities for app
- **PWA**: 512×512 (already configured in `/public/`)

## Automated Icon Generation Tools
Consider using these tools to generate all required sizes from the 1024×1024 source:
- **Capacitor Icon Generator**: `npm install -g cordova-res` then `cordova-res ios` and `cordova-res android`
- **PWA Asset Generator**: Already handled in `/public/manifest.json`

## Verification Checklist
- [ ] iOS: Icon appears in Xcode Asset Catalog
- [ ] Android: Icons appear in all mipmap densities
- [ ] PWA: Icon appears when installing as web app
- [ ] App Store: 1024×1024 PNG uploaded to App Store Connect
- [ ] Play Store: 512×512 PNG uploaded to Google Play Console

## Notes
- iOS automatically applies rounded corners - do NOT round corners yourself
- Android supports both square and round icons
- Always test on actual devices to verify icon appearance
- The generated icon uses brand colors and meets all requirements
