# Changelog

## [Unreleased]

### Added
- **Stripe Live Status Diagnostics**: Real-time verification of Stripe configuration with refresh capability
  - New Edge Function: `stripe-live-status` with 60-second caching
  - Runtime validation of all Stripe environment variables
  - Live API connectivity testing (account & balance retrieval)
  - Automatic key prefix validation (pk_live, sk_live, whsec)
  - Support for alternate variable names (STRIPE_LIVE_SECRET_KEY or STRIPE_SECRET_KEY)
  - Force recheck option to bypass cache
  - Masked keys in all outputs (last 6 characters only)
  - Integration with existing StripeDiagnostics page

### Fixed
- **Stripe Status Card**: Refresh button now properly updates with real-time diagnostics
- **Environment Variables**: Support for flexible naming (STRIPE_LIVE_SECRET_KEY or STRIPE_SECRET_KEY)
- **Error Handling**: Clear error messages for missing or misconfigured keys

### Changed
- Stripe status verification now uses runtime checks instead of static configuration
- Improved error messages with specific variable names and required prefixes

---

## [Previous Releases]

*[Add previous release notes here]*
