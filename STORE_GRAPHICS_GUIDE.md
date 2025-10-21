# Store Graphics Generation Guide

## Overview
Daily Vibe Check includes AI-powered store graphics generation to create professional app store assets that match your brand identity.

## Accessing the Generator

1. Navigate to: **Admin Dashboard → Publish Readiness → Phase A - Final QA**
2. Find the "Store Graphics Generator" card at the top of the page

## Available Graphics

### 1. App Icon (1024×1024)
- **Purpose**: Main app icon for iOS and Android app stores
- **Format**: Square PNG, no transparency
- **Design**: Features the cute emoji-style face with gradient background
- **Usage**: App Store Connect, Google Play Console

### 2. Feature Banner (1024×500)
- **Purpose**: Horizontal promotional banner for Google Play Store
- **Format**: Landscape PNG, no transparency
- **Design**: Logo + app name + tagline + feature icons
- **Usage**: Google Play Store feature graphic

## How to Generate

### Step 1: Generate Icon
1. Click "Generate Icon" button
2. Wait 10-30 seconds for AI generation
3. Preview the generated 1024×1024 icon
4. If satisfied, click "Download Icon"

### Step 2: Generate Banner
1. Click "Generate Banner" button
2. Wait 10-30 seconds for AI generation
3. Preview the generated 1024×500 banner
4. If satisfied, click "Download Banner"

### Step 3: Save & Use
- Download both graphics
- Verify dimensions and quality
- Upload to respective app stores

## Design Specifications

### Brand Colors Used
- **Primary**: Warm coral-orange (#FF7A59)
- **Accent**: Neon teal (#7AF1C7)
- **Secondary**: Soft lavender (#DECCF5)
- **Gradient**: Purple to peach/coral

### Design Elements
- Cute, friendly emoji-style face
- Modern Gen Z aesthetic
- Soft neon pastel colors
- Clean, approachable design
- Professional quality

## AI Model Details
- **Service**: Lovable AI Gateway
- **Model**: google/gemini-2.5-flash-image-preview (Nano Banana)
- **Processing**: Server-side edge function
- **Generation Time**: 10-30 seconds per graphic

## Troubleshooting

### Generation Failed
- **Error 429 (Rate Limit)**: Wait a few minutes and try again
- **Error 402 (Credits)**: Add AI credits to your Lovable workspace
- **Error 500 (Service)**: Check edge function logs, try again later

### Image Quality Issues
- **Regenerate**: Click the button again for a new version
- **Manual Edit**: Download and use image editing software to adjust
- **Alternative**: Use professional design tools like Figma or Canva

### Wrong Dimensions
The AI generates images at approximately the requested size, but you may need to:
1. Use image editing software to crop/resize to exact dimensions
2. Verify dimensions before uploading to app stores
3. Ensure no important content is cut off

## App Store Requirements

### Apple App Store
- **Icon**: 1024×1024 PNG, no transparency, no rounded corners
- **Location**: App Store Connect → App Information → App Icon

### Google Play Store
- **Icon**: 512×512 PNG (scaled from 1024×1024)
- **Feature Graphic**: 1024×500 JPG or PNG
- **Location**: Google Play Console → Store Listing → Graphics

## Best Practices

✅ **Do**:
- Generate multiple versions and pick the best one
- Test icons at smaller sizes (app drawer, notifications)
- Verify brand consistency across all graphics
- Check contrast and readability
- Save originals before any manual edits

❌ **Don't**:
- Upload without checking dimensions
- Use low-quality or pixelated images
- Add text that becomes unreadable at small sizes
- Stray too far from brand colors
- Rush the approval without reviewing

## Next Steps After Generation

1. **Quality Check**
   - Verify dimensions match requirements
   - Check for visual clarity at small sizes
   - Ensure brand consistency

2. **File Preparation**
   - Convert to required formats (PNG/JPG)
   - Optimize file sizes if needed
   - Create multiple sizes for different contexts

3. **Upload to Stores**
   - App Store Connect (iOS)
   - Google Play Console (Android)

4. **Preview & Test**
   - Check how icons appear in search results
   - Test banner visibility in store listings
   - Verify on actual devices if possible

## Credits & Costs
- Each generation uses Lovable AI credits
- Check your workspace usage at: Settings → Workspace → Usage
- Consider generating a few variations to choose from

## Support
For issues with graphics generation:
1. Check edge function logs in backend
2. Verify AI credits are available
3. Contact support if persistent errors occur

---

**Pro Tip**: Generate several versions and compare them before finalizing. The AI can produce slightly different results each time, so you may get a better version on the second or third attempt!
