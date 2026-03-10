# Mobile App — Status

Platform: **Expo SDK 52 + React Native + Expo Router v4**
State: **~65% complete** — core screens done, payments/messages/host flows pending.

---

## Implemented

### Auth
- Login screen (`app/(auth)/login.tsx`) — email+password, JWT stored in SecureStore
- Register screen (`app/(auth)/register.tsx`) — basic registration flow
- Auth layout with redirect guard

### Listings (Guest browse)
- Home feed (`app/(tabs)/index.tsx`) — featured listings from API
- Search screen (`app/(tabs)/search.tsx`) — text + city search
- Listing detail (`app/listing/[id].tsx`) — photos, description, amenities, host info, price

### Bookings
- Booking flow (`app/booking/[id].tsx`) — date selection, guest count, price calc
- Guest bookings list (`app/(tabs)/bookings.tsx`) — active/past bookings

### Profile
- Profile tab (`app/(tabs)/profile.tsx`) — user info, logout

### Infrastructure
- API client (`src/api/`) — axios instance with auth interceptor + token refresh
- Zustand auth store (`src/stores/authStore.ts`)
- Reusable components (`src/components/`) — ListingCard, BookingCard, etc.

---

## Not Yet Implemented

| Feature | Priority | Notes |
|---|---|---|
| Payment flow (YooKassa) | HIGH | Need WebView for YooKassa redirect or deep link |
| Messaging / conversations | HIGH | WebSocket integration in RN |
| Push notifications | HIGH | Expo Notifications + backend endpoint for Expo push token |
| Host dashboard | MEDIUM | Host can't manage listings from mobile |
| Listing creation / editing | MEDIUM | Complex multi-step form |
| OAuth login (Google / VK) | MEDIUM | Expo AuthSession integration |
| 2FA TOTP | MEDIUM | TOTP input screen on login |
| Favorites / saved listings | LOW | Heart button + endpoint exists |
| Reviews | LOW | Review form after completed booking |
| Loyalty points | LOW | Profile tab addition |
| Disputes | LOW | Open dispute from booking screen |
| Offline support | BACKLOG | React Query persistence |
| App Store / Google Play build | BACKLOG | EAS Build not configured |

---

## Running Locally

```bash
cd milyi-dom/apps/mobile
npx expo start
# Scan QR with Expo Go (iOS/Android)
```

Required env (`app.json` → `extra`):

```json
{
  "extra": {
    "apiUrl": "https://api.milyidom.com"
  }
}
```

---

## Next Milestone

Before mobile beta:
1. Push notifications (Expo token → backend, send on booking confirm + new message)
2. YooKassa payment (WebView redirect flow)
3. Messaging screen with WebSocket
4. EAS Build configuration for TestFlight / internal track
