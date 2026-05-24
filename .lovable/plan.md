# מפה ברורה + מעקב במסך מלא בסגנון Uber

הרעיון: המפה הקטנה בכרטיס הופכת ל"תצוגה מקדימה" קליקבילית. בלחיצה נפתח Sheet במסך מלא עם חוויית מעקב מקצועית — מפה ענקית, כרטיס מידע צף מלמטה, אנימציה חלקה של רכב הנהג, ופעולות מהירות (התקשרות לנהג, ניווט ב־Google Maps, שיתוף).

## מה משתנה

### 1) המפה בכרטיס (תצוגה מקדימה משופרת)
- גובה מעט גדול יותר + פינות מעוגלות יותר (1.25rem).
- שכבת overlay עדינה למעלה: "הקש להרחבה" עם אייקון Maximize2.
- שכבת gradient עדינה למטה כדי לשפר ניגודיות הצ'יפים.
- כל המפה לחיצה אחת → פותח את התצוגה המלאה.
- בלי אינטראקציה בתוך התצוגה המקדימה (gesture handling = "none") כדי שלא יבלע גלילה.

### 2) תצוגה מלאה — `LiveTrackingSheet` (חדש)
Sheet מלמטה (`vaul`/shadcn Sheet קיים) שעולה למסך מלא:

```text
┌─────────────────────────────────┐
│  ✕                              │  ← כפתור סגירה צף
│                                 │
│         M A P  (full)           │  ← מפה ממלאת את כל המסך
│         🚗 ─ ─ ─ 📍              │
│                                 │
├─────────────────────────────────┤
│  ● הנהג בדרך אליך               │  ← כרטיס צף תחתון
│  ⏱ 7 דק'   📏 2.4 ק"מ            │
│  ─────────────────────          │
│  👤 ליאם · 4.9★                 │
│  [📞 התקשר] [🧭 פתח בWaze]      │
└─────────────────────────────────┘
```

מאפיינים:
- **מפה מלאת מסך** עם styling כהה/בהיר תואם theme, ללא UI מיותר.
- **Marker רכב מסתובב** לפי `heading` (אנימציית `transition: transform`).
- **קו מסלול חי** (DirectionsRenderer) בצבע primary, עבה ועם stroke לבן מתחת לקריאות.
- **Auto-fit bounds** — תמיד מציג גם את הנהג וגם את היעד/האיסוף בפריים אחד; כפתור "מרכז על הנהג" צף כשהמשתמש גורר.
- **כרטיס מידע תחתון צף** (`rounded-t-3xl`, blur background): שלב נסיעה, ETA גדול, מרחק, פרטי נהג, ושני CTAs:
  - `tel:` — התקשר לנהג (אם יש טלפון בפרופיל).
  - `https://www.google.com/maps/dir/?api=1&destination=...` — פתח ניווט.
- **חיווי "live"** — נקודה ירוקה פועמת + "עודכן לפני Xש'".
- **State ריק חכם** — אותו טיפול שכבר קיים (ממתין ל־GPS / הנסיעה הסתיימה).

### 3) שינויים בקוד (מינימליים)
- **חדש**: `src/components/LiveTrackingSheet.tsx` — ה־Sheet במסך מלא. מקבל אותם props כמו `DriverLiveTracker` + `open/onOpenChange`.
- **חדש**: `src/components/MapPreviewCard.tsx` (אופציונלי, או בתוך `DriverLiveTracker`) — wrapper לחיץ סביב המפה הקטנה.
- **עדכון**: `src/components/DriverLiveTracker.tsx` — להוסיף state `expanded`, להפוך את ה־`GoogleMap` ל־wrapper לחיץ, ולרנדר את `LiveTrackingSheet`. הלוגיקה של realtime/ETA/directions עוברת ל־hook משותף `useDriverLiveLocation(rideId, target)` כדי לא לשכפל בין preview ל־sheet.
- **חדש**: `src/hooks/use-driver-live-location.ts` — מאגד את ה־subscription, ה־ETA throttling וה־directions.

### 4) נגישות + UX
- כפתור הפתיחה: `aria-label="הרחב מפת מעקב"`, גובה min 44px.
- ב־Sheet: `aria-label="מעקב חי אחרי הנהג"`, סגירה ב־Esc ובלחיצה מחוץ.
- ניגודיות: שימוש בטוקנים `bg-background/95 backdrop-blur` לכרטיס התחתון.
- RTL מלא נשמר.
- אנימציית פתיחה/סגירה חלקה (Sheet קיים מספק את זה).

## מה לא משתנה
- ה־schema של `driver_locations`, ה־realtime, וה־`LocationSharingContext` — כולם נשארים בדיוק כמו שהם.
- הגיון ה־ETA וה־directions זהה, רק נשלף ל־hook.

## פתוח להחלטה
האם להוסיף כפתורי **התקשרות לנהג** ו/או **פתח ב־Waze/Google Maps** בכרטיס התחתון? (דורש קריאת `phone` מטבלת `profiles` של הנהג — קיימת.) ברירת המחדל שלי: כן, שניהם.
