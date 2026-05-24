## תכנית: נקודת איסוף לנוסע + שלב "אספתי נוסעים"

### שינויי DB
- `bookings`: הוספת `pickup_location text` ו-`pickup_lat double precision`, `pickup_lng double precision` (nullable).
- `rides.ride_phase` constraint: הוספת ערך `picked_up` בין `en_route` ל-`in_progress`.
- עדכון `notify_on_ride_phase_change` כדי לטפל גם בשלב `picked_up`.

### זרימת נוסע (RideCard)
- כפתור "בקש להצטרף" פותח דיאלוג קטן עם:
  - `PlacesAutocomplete` "נקודת איסוף" — placeholder מציע את `ride.origin` כברירת מחדל; הנוסע יכול לבחור כל כתובת.
  - טקסט עזרה: "ודאו שהנקודה קרובה למסלול הנהג"
  - כפתור "שלח בקשה" → `joinRide` עם pickup data
- אם הנוסע לא בחר, ממלאים אוטומטית את `ride.origin`.

### זרימת נהג (Bookings — incoming + DriverLocationSharer)
- ב-`Bookings.tsx` (incoming), לכל בקשה pending/accepted מוצגת נקודת האיסוף של הנוסע (אייקון MapPin + טקסט).
- `DriverLocationSharer` — שלבים מעודכנים:
  1. `scheduled` → "בדרך אליך" (en_route)
  2. `en_route` → "אספתי את הנוסעים" (picked_up)
  3. `picked_up` → "התחל נסיעה" (in_progress)
  4. `in_progress` → "סיים נסיעה" (completed)
  - שיתוף מיקום פעיל מ-`en_route` ועד `completed`.

### `DriverLiveTracker`
- הוספת label לשלב `picked_up`: "הנהג אסף את הנוסעים — בדרך ליעד".

### `RideHistory`
- הוספת label "נאספו" לשלב `picked_up`.

### קבצים
- migration חדש
- `src/lib/rides-api.ts` — עדכון `RidePhase`, חתימת `joinRide`
- `src/components/JoinRideDialog.tsx` — חדש (דיאלוג עם autocomplete)
- `src/components/RideCard.tsx` — שימוש בדיאלוג במקום join ישיר
- `src/components/DriverLocationSharer.tsx` — שלב חדש
- `src/components/DriverLiveTracker.tsx` — label
- `src/components/RideHistory.tsx` — label
- `src/pages/Bookings.tsx` — הצגת pickup לנהג
