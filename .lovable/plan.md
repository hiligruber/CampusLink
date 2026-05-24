# תיקון שיתוף מיקום הנהג

## מה הבעיה
בנסיעה של ליאם הטבלה `driver_locations` נשארה ריקה לכל אורך הנסיעה — לכן הנוסעת לא ראתה כלום. שלושת שורשי הבעיה:

1. **המעקב חי רק כשהדף מוצג** — `watchPosition` רץ בתוך `DriverLocationSharer`. ברגע שהנהג עובר ל"בית"/"בקשות"/סוגר לשונית, המעקב נעצר.
2. **אין פיקס ראשון מיידי** — `watchPosition` יכול לקחת 10–30 שניות עד קואורדינטה ראשונה. ליאם עברה בין השלבים מהר מדי, ולכן שום שורה לא נכתבה.
3. **הנהג לא מודע לכשל** — הצ׳יפ "המיקום שלך משותף" מופיע מיד אחרי לחיצה, גם אם ההרשאה נדחתה או שאין GPS. שגיאות נופלות ל-toast חד-פעמי שנעלם.

---

## הפתרון

### 1. Provider גלובלי שמשתף מיקום ברקע
ספק חדש `LocationSharingProvider` שיעטוף את כל האפליקציה ב-`App.tsx`. הוא:
- מאזין לנסיעות שבהן המשתמש הנוכחי הוא נהג ובשלב `en_route` / `picked_up` / `in_progress` (subscription על `rides`).
- מריץ `watchPosition` יחיד גלובלי כשיש לפחות נסיעה אחת פעילה. כותב upsert ל-`driver_locations` עבור **כל** הנסיעות הפעילות של הנהג.
- מנקה את ה-watcher כשאין יותר נסיעות פעילות.
- שורד מעבר בין דפים — בניגוד לרכיב הנוכחי שמת ברגע ש-`DriverLocationSharer` נשלף מה-DOM.
- חושף `useLocationSharing()` עם: `status` (`idle` / `requesting` / `active` / `denied` / `unavailable`), `lastFix` (timestamp), `error`, ו-`retry()`.

### 2. פיקס מיידי בלחיצה על "בדרך אליך"
ב-`DriverLocationSharer.advance()` כשעוברים מ-`scheduled` ל-`en_route`:
1. לפני `setRidePhase`, להריץ `getCurrentPosition` (פעם אחת, timeout 8 שניות).
2. לכתוב upsert ראשון ל-`driver_locations` עם הקואורדינטה שהתקבלה.
3. רק אז להעביר את ה-phase ולהמשיך לסטרימינג רגיל דרך ה-Provider.
4. אם `getCurrentPosition` נכשל (הרשאה נדחתה/timeout): הצגת `AlertDialog` עם הסבר "לא הצלחנו לקרוא את המיקום שלך — הנוסעים לא יראו אותך. ניתן להמשיך בכל זאת או לתת הרשאה ולנסות שוב". זה מבטיח שהפיקס הראשון נוצר *לפני* שמישהו מצפה לראות אותו.

### 3. אינדיקטור סטטוס GPS אמיתי לנהג
החלפת הצ׳יפ הסטטי "המיקום שלך משותף" בצ׳יפ דינמי הקורא מ-`useLocationSharing()`:
- 🟢 `active` + "עודכן לפני Xש'" — מבוסס על `lastFix`.
- 🟡 `requesting` + ספינר — מחפש GPS.
- 🔴 `denied` + כפתור "אפשר גישה" שמריץ `retry()`.
- ⚪ `unavailable` + "GPS לא זמין בדפדפן".
זה נותן לנהג ביטחון שהמיקום *באמת* יוצא, ומבליט מיד תקלות.

### 4. עדכון `DriverLiveTracker` (צד נוסע) למצבי שוליים
התוספת ל-empty state הקיים:
- אם `phase` ב-`en_route`/`picked_up`/`in_progress` אבל אין `driver_locations` כבר 60+ שניות → "הנהג חזר לחיבור" עם spinner קטן (במקום הריק הנוכחי).
- אם `phase === 'completed'` ויש last-known location עם השלב הקודם — להשאיר את הסיכום במקום מסך ריק. (אופציונלי, אם מתאפשר.)

---

## פרטים טכניים

### קבצים חדשים
- `src/contexts/LocationSharingContext.tsx` — Provider + hook. שימוש ב-`useAuth()` ושאילתת TanStack על `rides` עם `driver_id = user.id` ו-`ride_phase in (en_route, picked_up, in_progress)`. subscription realtime על שינויי שלב כדי להתחיל/לעצור watcher.

### קבצים שמתעדכנים
- `src/App.tsx` — עטיפה ב-`<LocationSharingProvider>` בתוך `<AuthProvider>`.
- `src/components/DriverLocationSharer.tsx`:
  - הסרת ה-`watchPosition` המקומי (הועבר ל-Provider).
  - הוספת קריאת `getCurrentPosition` יחידה כ"פיקס ראשון" ב-`advance("en_route", …)`.
  - שימוש ב-`useLocationSharing()` לרינדור הצ׳יפ הדינמי.
  - `AlertDialog` למקרה של דחיית הרשאה.
- `src/components/DriverLiveTracker.tsx` — תוספת מסך "מתחבר מחדש" כש-phase פעיל אך אין נתון >60ש'.

### בלי שינויי DB
המבנה הקיים (`driver_locations` + RLS + טריגר מחיקה ב-`completed`) מספיק. אין מיגרציה.

### Edge cases
- נהג מנהל כמה נסיעות פעילות במקביל — ה-Provider עושה upsert בלולאה על כולן עבור כל פיקס.
- טלפון נעול / טאב ברקע — `watchPosition` ממשיך בדפדפנים נתמכים. מסמכים את המגבלה ב-tooltip על הצ׳יפ.
- אין שום שינוי בלוגיקת הזמנות/הרשאות/ניתוב.
