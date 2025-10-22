# iOS App Store Screenshots

**Generated**: 2025-01-22  
**App**: Daily Vibe Check  
**Total Screenshots**: 6

---

## 📸 Screenshot Overview

This directory contains professional App Store screenshots showcasing Daily Vibe Check's key features with production UI and brand colors.

### Current Resolution
- **Dimensions**: 896 × 1920 pixels
- **Aspect Ratio**: ~9:19.5 (iPhone portrait)
- **Format**: PNG, RGB color space
- **Status**: ✅ Ready (requires upscaling for App Store)

---

## 📂 Files

### 01-onboarding.png
**Feature**: Welcome/Onboarding Screen  
**Content**:
- App logo with gradient checkmark
- Cute emoji mascot
- Headline: "Your Mental Wellness Journey Starts Here"
- Tagline about features
- "Get Started" button
**Use for**: First impression, introducing app purpose

### 02-mood-checkin.png
**Feature**: Daily Mood Check-In  
**Content**:
- "How are you feeling today?" prompt
- 5 mood options with emojis
- Selection indicators
- "Continue" button
**Use for**: Core feature demonstration (mood tracking)

### 03-journal.png
**Feature**: Journal Entries  
**Content**:
- "My Journal" header
- List of journal entry cards
- Mood indicators on entries
- "Start Your First Entry" CTA
- Floating action button
**Use for**: Journaling feature showcase

### 04-chat.png
**Feature**: Community Chat Rooms  
**Content**:
- "Community Chat" header
- Chat room cards (Anxiety Support, Study Stress, Peer Support)
- Participant counts
- Recent message previews
- Bottom navigation bar
**Use for**: Social/community feature highlight

### 05-settings.png
**Feature**: Settings & Privacy  
**Content**:
- Profile section
- Notification toggles
- Privacy options
- Support options
- Dark mode interface
**Use for**: Customization and control demonstration

### 06-support.png
**Feature**: Crisis Resources  
**Content**:
- Emergency alert banner
- Crisis hotline cards (988, Crisis Text Line, Trevor Project)
- Contact information
- "Find Help Nearby" button
**Use for**: Safety feature emphasis, crisis support

---

## 🎯 App Store Requirements

### Required Dimensions

#### iPhone 6.5" Display
- **Devices**: iPhone 14 Pro Max, 15 Pro Max, 13 Pro Max, 12 Pro Max
- **Required Size**: 1284 × 2778 pixels
- **Current Size**: 896 × 1920 pixels
- **Action Needed**: ⚠️ Upscale to 1284×2778

#### iPhone 5.5" Display
- **Devices**: iPhone 8 Plus, 7 Plus, 6s Plus
- **Required Size**: 1242 × 2208 pixels
- **Current Size**: 896 × 1920 pixels
- **Action Needed**: ⚠️ Upscale to 1242×2208

---

## 🔧 Upscaling Instructions

### Method 1: ImageMagick (Command Line)

Install ImageMagick:
```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get install imagemagick
```

Upscale to 6.5" (1284×2778):
```bash
for file in *.png; do
  convert "$file" -resize 1284x2778! "${file%.png}-6.5.png"
done
```

Upscale to 5.5" (1242×2208):
```bash
for file in *.png; do
  convert "$file" -resize 1242x2208! "${file%.png}-5.5.png"
done
```

### Method 2: Photoshop

1. Open screenshot in Photoshop
2. **Image** → **Image Size**
3. Uncheck "Constrain Proportions"
4. Set Width: 1284 px, Height: 2778 px (for 6.5")
5. Set Width: 1242 px, Height: 2208 px (for 5.5")
6. Resample: **Bicubic Sharper (best for reduction/enlargement)**
7. **File** → **Export** → **Export As**
8. Format: PNG
9. Save

### Method 3: Online Tools

**Resize Image**: https://resizeimage.net/
1. Upload screenshot
2. Enter exact dimensions (1284×2778 or 1242×2208)
3. Download resized PNG

**Bulk Resize Photos**: https://bulkresizephotos.com/
1. Upload all 6 screenshots
2. Set custom dimensions
3. Download as ZIP

### Method 4: Figma

1. Import screenshots to Figma
2. Create frames:
   - iPhone 6.5": 1284 × 2778
   - iPhone 5.5": 1242 × 2208
3. Place screenshots in frames (stretch to fit)
4. Export frames as PNG at 1x

---

## 📤 Upload to App Store Connect

### Steps
1. Log in: https://appstoreconnect.apple.com
2. Select your app
3. Go to: **App Store** → **Screenshots**
4. Select device size (6.5" or 5.5")
5. Drag and drop screenshots in order
6. Add optional captions
7. Save

### Recommended Order
1. 01-onboarding.png - Welcome screen
2. 02-mood-checkin.png - Core feature
3. 03-journal.png - Key feature
4. 04-chat.png - Community feature
5. 05-settings.png - Customization
6. 06-support.png - Safety/support

### Screenshot Captions (Optional)
- "Start your mental wellness journey"
- "Track your daily mood"
- "Journal your thoughts privately"
- "Connect with supportive communities"
- "Customize your experience"
- "Access crisis support 24/7"

---

## ✅ Quality Checklist

Before uploading, verify:
- [ ] All screenshots are correct dimensions (1284×2778 or 1242×2208)
- [ ] PNG format with RGB color space
- [ ] No personal/test data visible
- [ ] Text is clear and readable
- [ ] Brand colors are accurate
- [ ] Status bar looks authentic (time, signal, battery)
- [ ] No compression artifacts
- [ ] Consistent design across all screenshots
- [ ] Represents actual app functionality
- [ ] Appropriate for Teen (13+) rating

---

## 🎨 Design Specifications

### Brand Colors
- Purple: `#8B5CF6`
- Teal: `#7AF1C7`
- Coral: `#FF7A59`
- Dark Navy: `#0F172A`

### Screenshot Style
- **Background**: Dark mode (navy)
- **Buttons**: Gradient (purple to coral)
- **Accents**: Teal and purple
- **Typography**: Modern sans-serif
- **Mood**: Friendly, supportive, professional

---

## 📱 Android Screenshots

These same screenshots can be used for Google Play Store:

### Google Play Requirements
- **Phone**: 16:9 or 9:16 aspect ratio
- **Min Resolution**: 320px
- **Max Resolution**: 3840px
- **Current**: 896×1920 (perfect for Android!)

### Upload to Play Console
1. Log in: https://play.google.com/console
2. Select app
3. Go to: **Store Listing** → **Graphics**
4. Upload screenshots (2-8 per device type)
5. Arrange in order
6. Save changes

**Good news**: The current 896×1920 screenshots meet Android requirements without upscaling!

---

## 🔄 Updates

When updating screenshots:
1. Take new screenshots from production build
2. Follow same resolution (896×1920)
3. Match existing design style
4. Upscale to App Store requirements
5. Replace files in this directory
6. Update documentation
7. Re-upload to App Store Connect

---

## 📊 Testing

### Before Submission
1. **Visual Check**:
   - View at actual size on iPhone display
   - Check color accuracy
   - Verify text readability

2. **Context Preview**:
   - View in App Store search mockup
   - Check thumbnail appearance
   - Verify screenshots tell story

3. **Competitor Research**:
   - Compare with similar apps
   - Ensure competitive quality
   - Highlight unique features

---

## 📞 Support

### Issues with Upscaling
- Check for pixelation at larger sizes
- Use high-quality upscaling algorithms (Bicubic, Lanczos)
- Consider regenerating at higher resolution if needed

### App Store Rejection
If screenshots are rejected:
- Review [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- Ensure no misleading content
- Remove any placeholder text
- Verify device frame compliance (if used)

### Questions
- Review: `/store/APP_STORE_ASSETS.md`
- Check: [Apple Screenshot Guidelines](https://developer.apple.com/app-store/product-page/)
- Contact: Apple Developer Support

---

**Ready for App Store submission after upscaling!** 🚀
