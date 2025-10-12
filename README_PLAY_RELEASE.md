# Android Play Store Release Guide

## App Information
- **App Name**: Vibe Check
- **Package ID**: com.dailyvibequest.app
- **Version Name**: 1.0.0
- **Version Code**: 1
- **Category**: Health & Fitness / Lifestyle
- **Target Age**: 13+

## Prerequisites Completed ✅
- [x] PWA manifest.json configured
- [x] App icons generated (512x512 standard + maskable)
- [x] Service worker with offline support
- [x] Capacitor configured for production
- [x] Store assets created (feature graphic, screenshots)
- [x] Privacy Policy accessible at /legal/privacy
- [x] Terms of Service accessible at /legal/terms

## Step-by-Step Release Process

### 1. Build the Web App
```bash
npm install
npm run build
```

### 2. Sync to Android
```bash
npx cap sync android
```

### 3. Open in Android Studio
```bash
npx cap open android
```

### 4. Configure Release Signing (First Time Only)

#### Option A: Play App Signing (Recommended)
1. Go to Play Console → Your App → Setup → App Integrity
2. Enable "Play App Signing"
3. Generate and download upload key
4. Add to `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file("path/to/upload-keystore.jks")
            storePassword "your-store-password"
            keyAlias "upload"
            keyPassword "your-key-password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

#### Option B: Local Signing
```bash
keytool -genkey -v -keystore vibe-check-release.keystore \
  -alias vibecheck -keyalg RSA -keysize 2048 -validity 10000
```

### 5. Build Release AAB
In Android Studio:
1. Build → Generate Signed Bundle / APK
2. Select "Android App Bundle"
3. Select your keystore and enter credentials
4. Build variant: "release"
5. Output: `android/app/release/app-release.aab`

Or via command line:
```bash
cd android
./gradlew bundleRelease
```

### 6. Test the AAB Locally
```bash
# Install bundletool
brew install bundletool  # macOS

# Generate APKs from AAB
bundletool build-apks --bundle=app-release.aab \
  --output=app-release.apks \
  --mode=universal

# Extract and install
unzip app-release.apks -d apks
adb install apks/universal.apk
```

### 7. Create Play Console Listing

#### A. Create App
1. Go to [Google Play Console](https://play.google.com/console)
2. Create app → Enter app details
3. Select "App" (not "Game")
4. Category: Health & Fitness

#### B. Store Listing
Upload assets from `/store` directory:
- **App icon**: `icon-512.png` (512x512 PNG)
- **Feature graphic**: `feature-graphic-1024x500.png` (1024x500 PNG)
- **Phone screenshots**: Upload all 3 screenshots (minimum 2 required)
  - `screenshot-1-dashboard.png`
  - `screenshot-2-journal.png`
  - `screenshot-3-help.png`

Copy descriptions:
- **Short description** (80 chars max): From `short-description.txt`
- **Full description** (4000 chars max): From `full-description.txt`

#### C. Contact Details
- **Email**: vibecheckapps@gmail.com
- **Phone**: (Optional but recommended)
- **Website**: https://2c588c7a-e9e9-4d3f-b2dd-79a1b8546184.lovableproject.com
- **Privacy Policy URL**: https://2c588c7a-e9e9-4d3f-b2dd-79a1b8546184.lovableproject.com/legal/privacy

#### D. Content Rating
Use notes from `content-rating-notes.txt`:
1. Go to Content Rating → Start Questionnaire
2. Select "Health & Fitness / Lifestyle"
3. Answer questions:
   - User-generated content: YES (moderated)
   - Violence: NO
   - Sexual content: NO
   - Controlled substances: NO (except supportive mental health context)
   - Gambling: NO
4. Target age: 13+ (Teen)
5. Submit for rating

#### E. App Content
1. **Privacy Policy**: Enter URL
2. **Ads**: Select "No" (subscription model, no third-party ads)
3. **Target Audience**: Age 13-17 (Teen), 18+ (Young Adult)
4. **Data Safety**: 
   - Collects: Email, name, mood data, journal entries
   - Security: Encrypted in transit and at rest
   - Deletion: Users can request data deletion via settings
   - Sharing: Not shared with third parties

#### F. Upload AAB
1. Go to Production → Create new release
2. Upload `app-release.aab`
3. Enter release notes:
```
Initial release of Vibe Check - Mental wellness companion for teens

Features:
• Daily mood tracking and check-ins
• Private journaling with voice recording
• Crisis support and hotline access
• Community chat rooms (moderated)
• Family mode for parent-teen connection
• Weekly wellness trivia
• AI wellness companion "Arthur"

Version 1.0.0 - Build 1
```

### 8. Pre-Launch Testing (Optional but Recommended)
1. Enable "Internal Testing" track
2. Add test users
3. Upload AAB to internal testing
4. Share test link with beta testers
5. Collect feedback before production release

### 9. Submit for Review
1. Review all sections for completeness
2. Click "Review Release"
3. Submit for review

**Timeline**: Typically 1-7 days for initial review

### 10. Post-Launch Monitoring
1. Monitor crash reports in Play Console
2. Respond to user reviews within 72 hours
3. Track analytics (installs, uninstalls, ratings)
4. Plan regular updates (monthly recommended)

## QA Checklist Before Submission

### Functionality ✅
- [ ] App launches successfully (cold start < 3s)
- [ ] Login/signup flow works
- [ ] Mood check-in saves data
- [ ] Journal entries persist
- [ ] Push notifications work (if enabled)
- [ ] Crisis resources accessible
- [ ] Chat rooms functional
- [ ] Offline mode shows offline page
- [ ] App resumes properly after backgrounding

### Performance ✅
- [ ] No crashes on Android 10, 11, 12, 13, 14
- [ ] Smooth animations (60 FPS)
- [ ] Fast page transitions
- [ ] Low memory footprint
- [ ] Battery usage acceptable

### UI/UX ✅
- [ ] Responsive on all screen sizes
- [ ] Dark mode support (follows system)
- [ ] Proper keyboard handling
- [ ] Touch targets minimum 48dp
- [ ] No text overflow or clipping
- [ ] Loading states visible

### Links & Navigation ✅
- [ ] Deep links work (https://yourdomain.com/*)
- [ ] External links open in browser
- [ ] Back button behavior correct
- [ ] Bottom navigation functional
- [ ] Privacy policy accessible
- [ ] Terms of service accessible

### Permissions ✅
- [ ] No dangerous permissions requested unnecessarily
- [ ] Notification permission request is contextual
- [ ] Permission rationale shown before request
- [ ] App functions without optional permissions

### Security ✅
- [ ] HTTPS enforced
- [ ] No sensitive data in logs
- [ ] User data encrypted
- [ ] Secure authentication flow
- [ ] Password requirements enforced

### AAB Validation ✅
- [ ] AAB size < 150MB (recommended < 50MB)
- [ ] No missing dependencies
- [ ] ProGuard/R8 enabled for release
- [ ] Unused resources removed
- [ ] Images optimized

## Troubleshooting

### "App Bundle contains unused code and resources"
- Enable R8/ProGuard in build.gradle
- Run `./gradlew clean` before building

### "Missing required icon densities"
- Ensure all icon sizes in res/mipmap directories
- Use Android Studio's Image Asset tool

### "Privacy Policy URL not accessible"
- Verify URL is publicly accessible (not auth-protected)
- Must be HTTPS
- Must return 200 status code

### "Content rating incomplete"
- Review content-rating-notes.txt
- Ensure all questions answered accurately
- Resubmit questionnaire if needed

### Build Errors
```bash
# Clear Gradle cache
cd android
./gradlew clean

# Update Gradle
./gradlew wrapper --gradle-version=8.0

# Sync dependencies
npm install
npx cap sync android
```

## Version Updates

For subsequent releases:
1. Update `versionCode` and `versionName` in `android/app/build.gradle`
2. Build new AAB
3. Create new release in Play Console
4. Upload AAB to same track (Production, Beta, etc.)
5. Add release notes describing changes

Version Code must increment with each release (integer).

## Support Contacts

- **Developer Email**: vibecheckapps@gmail.com
- **Privacy Policy**: /legal/privacy
- **Terms of Service**: /legal/terms
- **Support URL**: https://2c588c7a-e9e9-4d3f-b2dd-79a1b8546184.lovableproject.com/help/resources

## Additional Resources

- [Play Console Help](https://support.google.com/googleplay/android-developer)
- [Capacitor Android Guide](https://capacitorjs.com/docs/android)
- [Android App Bundle Docs](https://developer.android.com/guide/app-bundle)
- [Play Store Review Guidelines](https://support.google.com/googleplay/android-developer/answer/9898684)

---

**Last Updated**: January 2025
**App Version**: 1.0.0 (Build 1)
