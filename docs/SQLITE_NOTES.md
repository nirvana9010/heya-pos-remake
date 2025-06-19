# SQLite Development Notes

## Key Differences from PostgreSQL

### 1. Case-Sensitive Search
- **Issue**: SQLite's `contains` filter is case-sensitive by default
- **Impact**: Search functionality won't find "John" when searching for "john"
- **Solution**: For MVP, accept case-sensitive search. For production, consider:
  - Using raw SQL with `LOWER()` function
  - Pre-processing search terms and data
  - Switching to PostgreSQL for production

### 2. JSON Column Limitations
- **Issue**: SQLite has basic JSON support, not full JSONB
- **Impact**: Can't perform complex queries on JSON fields
- **Solution**: Only use JSON for simple storage/retrieval

### 3. Concurrent Write Limitations
- **Issue**: SQLite locks the entire database during writes
- **Impact**: Performance issues with multiple simultaneous bookings
- **Solution**: Acceptable for MVP, but plan for PostgreSQL in production

### 4. No Array Data Types
- **Issue**: SQLite doesn't support array columns
- **Impact**: Arrays stored as JSON (e.g., customer tags, features)
- **Solution**: Already implemented using JSON columns

## Production Migration Plan

When ready for production:
1. Switch `DATABASE_URL` to PostgreSQL connection string
2. Update schema.prisma provider to "postgresql"
3. Restore array fields and JSONB types
4. Run migrations
5. Test thoroughly

## Current Workarounds

1. **Search**: Currently case-sensitive. Users must search with exact case.
2. **Arrays**: Stored as JSON strings (e.g., `["tag1", "tag2"]`)
3. **Complex queries**: Avoided in favor of simple filters

## Development Tips

- Always test with mixed-case data
- Be aware of write lock behavior during testing
- Use SQLite for local development only
- Plan for PostgreSQL migration early