# Profanity Filter Documentation

## Overview
The Daily Vibe Check app implements AI-powered content moderation to maintain a safe and respectful community environment. All user-generated content in chat rooms and journal entries is automatically scanned for offensive language.

## How It Works

### Technology
- **AI Model**: Google Gemini 2.5 Flash Lite (optimized for fast classification)
- **Service**: Lovable AI Gateway
- **Processing**: Server-side edge function (`check-profanity`)

### Content Scanning
The filter analyzes text for:
- Profanity and vulgar language
- Hate speech
- Explicit content
- Threats and harassment
- Other offensive language

### Severity Levels
1. **None**: Clean content, no action needed
2. **Mild**: Minor issues, sanitized with asterisks (e.g., "d***")
3. **Moderate**: Offensive content, sanitized with asterisks
4. **Severe**: Extremely inappropriate content, message rejected

## Implementation

### Chat Messages
- Every message is checked before being saved to the database
- Severe content is rejected with an error message
- Mild/moderate content is sanitized (offensive words replaced with asterisks)
- Users are notified when content is modified

### Journal Entries
- Both title and body are checked separately
- Severe content prevents the entire entry from being saved
- Sanitized content is saved with user notification
- Process happens transparently during save operation

### User Experience
- **Rejected Content**: User sees error toast, message not sent
- **Sanitized Content**: User sees warning toast, sanitized version is saved/sent
- **Clean Content**: Normal success message, no modifications

## Edge Function Details

**Function**: `check-profanity`
**Authentication**: Required (JWT token)
**Endpoint**: `/functions/v1/check-profanity`

### Request
```json
{
  "text": "User input text to check"
}
```

### Response
```json
{
  "is_offensive": boolean,
  "sanitized_text": "Text with offensive words replaced",
  "severity": "none" | "mild" | "moderate" | "severe",
  "reason": "Explanation of why content was flagged",
  "original_length": number,
  "sanitized_length": number
}
```

### Error Handling
- **429**: Rate limit exceeded (too many requests)
- **402**: AI credits exhausted (payment required)
- **500**: Service unavailable or processing error

## Benefits
- ✅ Maintains community safety standards
- ✅ Protects minors from inappropriate content
- ✅ Meets Apple App Store content moderation requirements
- ✅ Reduces manual moderation workload
- ✅ Provides transparent user feedback

## Privacy
- Content is only analyzed for moderation purposes
- AI processing is temporary, not stored beyond the request
- No user data is shared with third parties
- Complies with data protection regulations

## Rate Limits
- Subject to Lovable AI workspace rate limits
- Users may see temporary delays during high traffic
- Edge function handles rate limit errors gracefully

## Future Enhancements
- Custom word blacklist/whitelist per community
- Configurable sensitivity levels
- User-specific moderation settings
- Moderation dashboard for admins
- Context-aware filtering (e.g., medical terms vs profanity)
