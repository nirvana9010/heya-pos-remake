# WebSocket Token Refresh Strategy

## Current Issue
- JWT expires after 7 days
- WebSocket disconnects and never recovers
- User stays logged in but loses real-time updates

## Recommended Solution (Per Expert Consultation)

### Phase 1: Keep Current 7-day Token (Immediate Fix)
Implement the hybrid approach with current token lifetime:

1. **Proactive Refresh in AuthContext**
   - Schedule refresh 1 hour before token expires
   - Automatically update all connections

2. **Reactive Fallback in WebSocket**
   - Detect auth failures
   - Refresh token and reconnect
   - Exponential backoff with max 5 attempts

3. **Benefits**
   - Minimal disruption to existing system
   - Immediate improvement to user experience
   - Foundation for future security improvements

### Phase 2: Security Hardening (Future)
When ready to improve security:

1. **Shorten Access Token**
   - Reduce from 7 days to 15-30 minutes
   - Keep refresh token at 7+ days

2. **Update Refresh Logic**
   - Refresh 1 minute before expiry
   - More frequent but seamless updates

3. **Benefits**
   - Dramatically reduced security exposure
   - If token is compromised, only valid for minutes not days
   - Industry best practice for JWT security

## Implementation Priority

### Now (Phase 1):
1. Add proactive refresh to AuthContext
2. Implement useWebSocketWithRefresh with reactive fallback
3. Add exponential backoff
4. Test with 7-day tokens

### Later (Phase 2):
1. Backend: Shorten JWT expiry
2. Frontend: Adjust refresh timing
3. Monitor and optimize

## Key Points
- Don't need heartbeat (JWT has exp claim)
- Use exponential backoff to prevent thundering herd
- Clear error messages from server help client react appropriately
- Proactive refresh prevents 99% of disconnections
- Reactive fallback handles edge cases (sleep, network issues)