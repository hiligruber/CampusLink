## תכנית: זרימת נסיעה תלת-שלבית עם אישור ידני

### שינויי DB
- הוספה לטבלת `rides`:
  - `ride_phase` text default `'scheduled'` עם constraint לערכים: `scheduled` | `en_route` | `in_progress` | `completed`
  - `started_at` timestamptz nullable
  - `completed_at` timestamptz nullable
- טריגר `notify_on_ride_phase_change`: כשמשתנה `ride_phase`, יוצר התראה לכל הנוסעים המאושרים (`bookings.status='accepted'`) — הודעה לפי השלב.
- מחיקה אוטומטית מ-`driver_locations` כשמגיעים ל-`completed`.

### `DriverLocationSharer` (החלפה מלאה)
שלושה כפתורים לפי `ride_phase`:
1. **scheduled** → כפתור "בדרך אליך 🚗" → מעדכן `ride_phase='en_route'`, מתחיל `watchPosition`.
2. **en_route** → כפתור "התחל נסיעה" → `ride_phase='in_progress'`, `started_at=now()`, ממשיך לשתף.
3. **in_progress** → כפתור "סיים נסיעה" → `ride_phase='completed'`, `completed_at=now()`, עוצר GPS ומוחק מ-`driver_locations`.
- אינדיקטור אדום בולט "המיקום שלך משותף עכשיו 🔴" בכל שלב פעיל.
- הפרופס מקבל גם `phase` ו-`onPhaseChange`.

### `DriverLiveTracker`
- מציג כותרת לפי שלב: "הנהג בדרך אליך • ETA X" / "בנסיעה • הגעה ליעד X" / "טרם יצא לדרך".
- ETA כבר מחושב — רק עדכון טקסט לפי `ride_phase`.

### `RideCard`
- העברת `ride_phase` ל-tracker וsharer.
- תווית סטטוס בולטת לנוסעים מאושרים: "הנהג בדרך 🚗" / "בנסיעה" / "הסתיימה".

### `Profile` — היסטוריית נסיעות
- שני tabs: **כנהג** (rides שבהן `driver_id=me`) ו**כנוסע** (bookings.accepted שלי + ride join).
- מציג origin → destination, תאריך, סטטוס (`scheduled`/`en_route`/`in_progress`/`completed`/`cancelled`).
- קומפוננטה חדשה `RideHistory.tsx`.

### פרטיות
- `driver_locations` נכתב רק החל מ-`en_route`. לפני זה הכפתור היחיד הזמין הוא "בדרך אליך".
- כשמגיעים ל-`completed`, השורה נמחקת מיד (גם ב-client וגם דרך trigger כגיבוי).

### קבצים
- migration חדש
- `src/components/DriverLocationSharer.tsx` — שכתוב
- `src/components/DriverLiveTracker.tsx` — עדכון טקסט לפי phase
- `src/components/RideCard.tsx` — העברת phase + תווית
- `src/components/RideHistory.tsx` — חדש
- `src/pages/Profile.tsx` — הוספת tab היסטוריה
- `src/lib/rides-api.ts` — הוספת `RidePhase` type ופונקציה `setRidePhase`
