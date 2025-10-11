# Backups & Restore Documentation

## Backup Strategy

### Database Backups
- **Frequency**: Nightly automatic backups via Supabase
- **Retention**: 
  - Daily backups: 30 days
  - Weekly backups: 90 days
- **Storage**: Encrypted backups in Supabase's secure storage
- **Access**: Backups are managed through the Supabase dashboard

### User Data Exports
- **Storage Bucket**: `data-exports` (private)
- **Retention**: 7 days after generation
- **Format**: JSON format with all user data
- **Security**: Pre-signed URLs with expiration

### Voice Notes
- **Storage Bucket**: `voice-notes` (private)
- **Retention**: Permanent until user deletion
- **Format**: Audio files (webm/mp3)
- **Security**: RLS policies ensure only owners can access

## Backup Verification

### Daily Checks
1. Verify backup completion timestamp in admin dashboard
2. Check backup file size and integrity
3. Monitor backup job status and errors
4. Review backup storage usage

### Weekly Procedures
1. Test data export functionality for sample user
2. Verify voice note accessibility
3. Review backup logs for anomalies
4. Document any backup failures

## Restore Procedures

### Single User Restore (Test Procedure)

**Scenario**: Restore a single user's journal entry from 7 days ago

**Steps**:
1. Navigate to Supabase Dashboard → Database → Backups
2. Select backup from 7 days ago
3. Download backup file to local machine
4. Extract relevant journal_entries table data
5. Identify the specific entry by user_id and date
6. Use Supabase SQL Editor to insert the record:
   ```sql
   INSERT INTO journal_entries (id, user_id, date, mood, title, body, created_at, updated_at)
   VALUES (...); -- values from backup
   ```
7. Verify restoration by checking user's journal in the app
8. Document restore time and any issues

**Test Record**: Last tested on [DATE] - Success/Failure - [NOTES]

### Full Database Restore

**Scenario**: Complete database restoration from backup

**Steps**:
1. Create maintenance window announcement
2. Put app in maintenance mode
3. Access Supabase Dashboard → Database → Backups
4. Select appropriate backup based on timestamp
5. Click "Restore" and confirm
6. Wait for restoration to complete (monitor progress)
7. Verify database integrity:
   - Check critical tables for expected row counts
   - Verify RLS policies are intact
   - Test authentication flow
   - Verify edge functions connectivity
8. Run smoke tests on key features
9. Exit maintenance mode
10. Monitor error logs for 24 hours

**Emergency Contact**: [SUPPORT EMAIL/PHONE]

### User Data Export Restore

**Scenario**: Restore user's exported data upon request

**Note**: User data exports are for user access only, not for system restoration. Users can download their data but cannot re-import it into the system without manual intervention.

**Manual Restoration Steps** (if required):
1. Obtain user's exported JSON file
2. Verify user identity and authorization
3. Parse JSON and extract relevant data
4. Use SQL scripts to insert data back into database
5. Verify data integrity and relationships
6. Notify user of completion

## Backup Monitoring

### Admin Dashboard Indicators
- Last backup timestamp
- Backup status (success/failed)
- Storage usage metrics
- Retention policy compliance

### Alerts
- Email notification on backup failure
- Storage threshold warnings (>80% capacity)
- Backup job duration anomalies

## Recovery Time Objectives (RTO)

- **Single Record**: < 1 hour
- **Single User**: < 4 hours
- **Full Database**: < 24 hours
- **User Data Export**: Immediate download

## Recovery Point Objectives (RPO)

- **Database**: 24 hours (daily backups)
- **User Data**: Real-time (continuous replication)
- **Voice Notes**: No data loss (direct storage)

## Backup Security

- All backups are encrypted at rest
- Access restricted to admin role users
- Backup downloads logged for audit
- Pre-signed URLs expire after 7 days
- Multi-factor authentication required for backup access

## Compliance Notes

- Backups comply with COPPA requirements for child data
- GDPR right-to-erasure applies to backups (30-day deletion)
- CCPA data export rights satisfied through user export feature
- Backup retention aligns with legal requirements

## Testing Schedule

- **Monthly**: Single record restore test
- **Quarterly**: Full table restore test
- **Annually**: Complete disaster recovery drill

## Maintenance Log

| Date | Type | Action | Result | Notes |
|------|------|--------|--------|-------|
| [DATE] | Test | Single record restore | Success | Verified journal entry restoration |
| | | | | |

---

**Last Updated**: [DATE]
**Document Owner**: Admin Team
**Review Frequency**: Quarterly
