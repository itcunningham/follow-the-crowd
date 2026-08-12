# Push Notification Logout Cleanup Behavior

This document specifies exactly what happens during logout cleanup for push notifications on shared devices.

## Normal Flow (No Failures)

1. User clicks "Sign out"
2. `lib/user/currentUser.ts:signOut()` is called
3. `disableNotifications()` is called (while auth session active)
   - Retrieves current browser subscription
   - Deletes subscription row from `push_subscriptions` table (RLS allows this because session is active)
   - Unsubscribes from browser PushManager
   - Logs success
4. `supabase.auth.signOut()` clears the Supabase session
5. User redirected to login

**Result:** No subscription rows exist for this endpoint. Browser is unsubscribed. Next user who logs in cannot receive this device's pushes.

---

## Failure Scenario 1: Database Delete Fails

**Trigger:** Database connection error, RLS violation, or constraint failure during DELETE

```
Step 1: Delete from database → FAIL
  ⚠ Error logged: "Failed to delete subscription from database: [error]"
  ✗ Subscription row still exists in database
  
Step 2: Unsubscribe from browser → SUCCESS (or ignored if Step 1 failed)

Step 3: Continue logout
  ✓ supabase.auth.signOut() succeeds
  ✓ User redirected to login
```

**Shared Device Risk:** Subscription row remains in database for this endpoint/user.

**Mitigation:** RLS policy prevents the endpoint from being transferred to another user:
- Next user logs in and tries to enable notifications
- Browser may have same endpoint (unlikely but possible)
- `savePushSubscription()` detects endpoint exists for different user
- Throws error: "This push endpoint is already registered to another account"
- User cannot override or reuse this endpoint

**Data State After:** 
- Previous user's endpoint row still in database (orphaned)
- Browser unsubscribed (if Step 2 ran)
- Next user cannot use this endpoint
- Push service rejects sends to orphaned endpoint+user_id combination

---

## Failure Scenario 2: Browser Unsubscribe Fails

**Trigger:** Service Worker unavailable, browser API error, or network issue

```
Step 1: Delete from database → SUCCESS
  ✓ Subscription row deleted
  
Step 2: Unsubscribe from browser → FAIL
  ⚠ Error logged: "Failed to unsubscribe from browser: [error]"
  ✗ Browser still has PushSubscription in memory/cache
  
Step 3: Continue logout
  ✓ supabase.auth.signOut() succeeds
  ✓ User redirected to login
```

**Shared Device Risk:** Browser still has active subscription, but server row deleted.

**Mitigation:** 
- Push service attempts to deliver to this endpoint
- Edge Function queries `push_subscriptions` for this endpoint
- No row found (was deleted)
- Edge Function logs and returns gracefully (no error sent to push service)
- Push service does not retry
- Notification lost (not sent to next user)

**Data State After:**
- Subscription row deleted (success)
- Browser still subscribed (but server thinks no subscriptions exist)
- Next user logs in on same device
- Can re-enable notifications (new endpoint or re-subscribe)

---

## Failure Scenario 3: Both Delete and Unsubscribe Fail

**Trigger:** Both database and browser operations fail

```
Step 1: Delete from database → FAIL
  ✗ Subscription row still exists
  
Step 2: Unsubscribe from browser → FAIL
  ✗ Browser still subscribed
  
Step 3: Continue logout
  ✓ supabase.auth.signOut() succeeds
  ✓ User redirected to login
```

**Shared Device Risk:** HIGHEST — both server and browser still have active subscription.

**Mitigation (Defense in Depth):**
1. RLS prevents endpoint transfer (savePushSubscription rejects)
2. Next user must explicitly enable notifications
3. Even if same endpoint obtained, `savePushSubscription()` will reject:
   - Queries existing endpoint ownership
   - Detects it belongs to previous user
   - Throws error instead of updating user_id
4. Next user must use a different endpoint or wait for previous user's endpoint to expire

**Push Service Behavior:**
- May send pushes to previous user until subscription expires (weeks/months)
- Previous user's device receives notifications for next user until they sign in again
- RLS at Edge Function still prevents previous user's notifications from reaching next user

---

## Why Logout Continues on Failure

Logout must always complete. Push notification cleanup is best-effort because:

1. **User needs to sign out** — blocking logout on notification cleanup would be a security antipattern
2. **Failures are rare** — in normal conditions, this cleanup succeeds
3. **RLS provides defense in depth** — even if cleanup fails, RLS prevents cross-user data access
4. **Server-side safeguards catch orphaned subscriptions** — Edge Function query protects against failed deletes

---

## Recommended Monitoring

In production, monitor these errors:

- `[push] Failed to delete subscription from database` — indicates database connectivity or RLS issues
- `[push] Failed to unsubscribe from browser` — indicates browser/service-worker problems
- `[push-send] No active subscriptions for user` on expected push sends — indicates orphaned endpoints

If orphaned endpoint cleanup is needed, create a Supabase cron job to delete inactive subscriptions older than 30 days:

```sql
DELETE FROM push_subscriptions 
WHERE is_active = false OR (last_used_at < now() - interval '30 days');
```

---

## Implementation Notes

- `disableNotifications()` in `lib/push/client.ts` is called from `lib/user/currentUser.ts:signOut()` BEFORE `supabase.auth.signOut()`
- This ensures RLS allows the DELETE operation (session still active)
- Database delete is prioritized before browser cleanup (server state is more critical than client state)
- Both operations catch errors independently and log them
- Neither error stops logout from proceeding
