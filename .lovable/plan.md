## מה מוסיפים

### 1. אייקון הודעות (Inbox) ליד הפעמון
ב-`AppHeader.tsx` נוסיף כפתור צ'אט (`MessageCircle`) משמאל לפעמון, שפותח Dropdown בסגנון זהה להתראות.

**מבנה התיבה:**
- כותרת "הודעות" + "סמן הכל כנקרא"
- רשימה **מקובצת לפי נסיעה** (group by `ride_id`): לכל נסיעה כרטיס עם מסלול (`origin ← destination`), שם הצד השני (נהג/נוסע), תצוגה מקדימה של ההודעה האחרונה, חותמת זמן ו-badge עם מספר ההודעות שלא נקראו.
- לחיצה על שורה פותחת את `RideChat` הקיים בדיאלוג ישירות מהכותרת (בלי לעבור דרך /bookings).
- ריק → מסך empty state מעוצב.
- Badge אדום עם סך כל ההודעות שלא נקראו על כפתור התיבה (Realtime — כבר יש subscription על `ride_messages` ב-`use-unread-messages`).

**hook חדש `use-message-threads.ts`:**
שולף את כל ההודעות שבהן המשתמש sender/recipient, מקבץ לפי `ride_id` + `other_user_id`, ומחזיר רשימת threads עם: `rideId`, `otherUserId`, `otherUserName`, `rideOrigin`, `rideDestination`, `lastMessage`, `lastMessageAt`, `unreadCount`. Subscribe ל-realtime על `ride_messages`.

### 2. עמוד "נסיעות פעילות" (`/active`)
עמוד חדש שמרכז את כל הנסיעות שהמשתמש משתתף בהן כרגע (כנהג או נוסע) — בלי להיכנס לטאבים של בקשות.

**מה נחשב "פעיל":**
- נסיעות שהמשתמש הוא הנהג שלהן ו-`status='active'` ו-`ride_phase != 'completed'`.
- בקשות `status='accepted'` שלו כנוסע, על נסיעה פעילה.

**עיצוב — כרטיס פעולה מהיר לכל נסיעה:**
- שורה עליונה: תווית תפקיד ("אתה הנהג" / "אתה נוסע"), שלב הנסיעה כ-pill צבעוני (`scheduled` / `en_route` / `picked_up` / `in_progress`), שעת יציאה.
- מסלול עם בולטים מרובעים (עיצוב RideCard הקיים).
- שורת CTA אחת ברורה לפי תפקיד+שלב:
  - **נהג**: כפתור גדול "נהל נסיעה" שפותח את `DriverLocationSharer` inline + כפתורי השלבים.
  - **נוסע**: כפתור "עקוב אחר הנהג" שפותח `DriverLiveTracker` inline (ETA + מפה).
- שורת actions משנית: "הודעה" (פותח `RideChat`), "התקשר" (אם יש טלפון בפרופיל — לא ב-scope עכשיו, נדלג), "פרטים" (פותח `RideCard` מלא ב-dialog).
- מיון: שלב פעיל קודם (`en_route` → `picked_up` → `in_progress`), אחר כך לפי `departure_time` הקרוב.

**Empty state:** אייקון + טקסט "אין לך נסיעות פעילות כרגע" + כפתור "חפש נסיעה".

### 3. ניווט
- מוסיפים פריט חדש ל-`BottomNav.tsx`: "פעילות" (אייקון `Activity` או `Car`) שמפנה ל-`/active`. סה"כ 5 פריטים — בית, חיפוש, **פעילות**, פרסם, פרופיל.
- נוסיף route ב-`App.tsx` ל-`/active` שמרנדר את `ActiveRides.tsx`.
- כפתור הסטטוס "עקוב" שכבר קיים ב-`Bookings` ימשיך לעבוד, אבל ה-CTA הראשי לנוסעים עם בקשה מאושרת יוביל עכשיו ל-`/active`.

## פירוט טכני

**קבצים חדשים:**
- `src/pages/ActiveRides.tsx` — עמוד הנסיעות הפעילות (query משולב נהג+נוסע, ממיין לפי שלב).
- `src/components/InboxDropdown.tsx` — תיבת ההודעות בכותרת (משתמשת ב-hook למטה).
- `src/hooks/use-message-threads.ts` — שולף ומקבץ הודעות + realtime + סך unread.

**קבצים שמשתנים:**
- `src/components/AppHeader.tsx` — מוסיפים את `InboxDropdown` משמאל לפעמון.
- `src/components/BottomNav.tsx` — מוסיפים פריט "פעילות" עם אייקון.
- `src/App.tsx` — route חדש `/active`.
- `src/contexts/LanguageContext.tsx` — מפתחות תרגום: `messages`, `active_rides_title`, `you_are_driver`, `you_are_passenger`, `manage_ride`, `track_driver`, `no_active_rides`.

## מחוץ ל-Scope
- אין שינוי במבנה ה-DB — מנצלים את `ride_messages`, `bookings`, `rides` כפי שהם.
- אין כפתור התקשרות (אין שדה טלפון מוצג כרגע).
- אין שינוי לוגיקה בקבלת/דחיית בקשות — נשאר ב-`Bookings`.
