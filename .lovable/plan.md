## מה מוסיפים

### 1. ETA אישי עד הנוסע (סגנון Uber)
היום ה-`DriverLiveTracker` מחשב ETA תמיד עד היעד הסופי. נשנה כך שבשלב `en_route` ה-ETA והמסלול יהיו עד **נקודת האיסוף של הנוסע הספציפי**, ורק מ-`picked_up` והלאה — עד היעד.

- `Bookings.tsx` כבר מעביר `phase` ל-`DriverLiveTracker`. נוסיף גם `pickupLocation` / `pickupLat` / `pickupLng` של ה-booking הנוכחי של הנוסע.
- `DriverLiveTracker.tsx`:
  - prop חדש: `pickupLocation?: string`
  - בחישוב המסלול: `const target = phase === "en_route" ? (pickupLocation ?? destination) : destination;`
  - הטקסטים יותאמו: ב-`en_route` יוצג "הנהג בדרך אליך · הגעה משוערת בעוד X דק׳" + "מרחק ממך Y", וב-`picked_up`/`in_progress` יוצג ETA ליעד כמו היום.
  - כאשר השלב משתנה (`en_route` ↔ `picked_up`) נאפס את ה-throttle כדי לחשב מסלול חדש מיד.

### 2. צ'אט בתוך הנסיעה (נהג ↔ נוסע)
שני הצדדים יוכלו לשלוח הודעות, עם כפתורי קיצור ("אני בכניסה", "הגעתי", "מאחר 2 דק׳", "איפה אתה?") ושדה טקסט חופשי.

**טבלה חדשה `ride_messages`** (מיגרציה):
- `id`, `ride_id`, `sender_id`, `recipient_id` (לצ׳אט 1-on-1 בין הנהג לנוסע ספציפי), `body text`, `created_at`, `read boolean default false`.
- RLS: רק `sender` או `recipient` יכולים לראות/לעדכן; INSERT מותר רק אם השולח שייך לנסיעה (נהג של ה-ride, או נוסע עם booking `accepted`/`pending`) והנמען הוא הצד השני.
- הפעלת Realtime על הטבלה (`ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_messages`).
- טריגר: בכל הודעה חדשה — INSERT ל-`notifications` עבור הנמען ("הודעה חדשה מ-X").

**קומפוננטה חדשה `RideChat.tsx`**:
- props: `rideId`, `otherUserId`, `otherUserName`.
- שולפת הודעות + subscribe ל-realtime, מסמנת כנקראות כשנפתח.
- שורת צ'אפים של קיצורים + Input + כפתור שליחה.
- מוצגת כ-`Dialog`/`Sheet` שנפתח מכפתור "שלח הודעה" (אייקון `MessageCircle`).

**איפה משלבים את הכפתור**:
- צד נוסע — ב-`Bookings.tsx` בכרטיס "outgoing" של booking `accepted`, ליד כפתור המעקב: "שלח הודעה לנהג".
- צד נהג — ב-`Bookings.tsx` בכרטיס "incoming" של booking `accepted`: "שלח הודעה לנוסע". (כל שיחה נפרדת לכל נוסע.)

### 3. אינדיקציה ויזואלית להודעות שלא נקראו
- hook קטן `useUnreadMessages(rideId, otherUserId)` שמחזיר מונה ומציג badge אדום על כפתור ההודעות.

## פירוט טכני

**קבצים חדשים:**
- `supabase/migrations/..._ride_messages.sql` — טבלה + RLS + realtime + טריגר התראות.
- `src/components/RideChat.tsx` — דיאלוג צ'אט.
- `src/hooks/use-unread-messages.ts` — מונה הודעות שלא נקראו.

**קבצים שמשתנים:**
- `src/components/DriverLiveTracker.tsx` — prop `pickupLocation`, החלפת יעד החישוב לפי `phase`, טקסטים מותאמים.
- `src/pages/Bookings.tsx`:
  - שליפת `pickup_location` כבר קיימת — נעביר אותה ל-tracker.
  - כפתור "הודעה" + פתיחת `RideChat` (לנוסע מול הנהג; לנהג מול כל נוסע מקובל).
- `src/lib/rides-api.ts` — פונקציות `sendRideMessage`, `markMessagesRead`.

**קיצורי הודעות (presets):**
```
["אני בכניסה", "הגעתי", "מאחר 2 דק׳", "איפה אתה?", "תודה!"]
```

## מחוץ ל-Scope
- אין שינוי בזרימת השלבים של הנהג (`DriverLocationSharer`) — הם כבר כוללים `en_route → picked_up → in_progress → completed`.
- אין שינוי בטופס ההצטרפות (`JoinRideDialog`) — נקודת איסוף כבר נשמרת ב-booking.
