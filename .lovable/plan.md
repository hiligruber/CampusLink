# תיקונים: פרופיל + מפה חיה

## 1. תמונת פרופיל עם סימן שאלה
ב‑`src/pages/Profile.tsx` וב‑`src/pages/EditProfile.tsx` התמונה מוצגת דרך `<img src={avatar_url}>` בלי טיפול בשגיאת טעינה. אם ה‑URL שמור ב‑DB אבל הקובץ נמחק/לא נגיש – הדפדפן מציג אייקון שבור (סימן שאלה).

**תיקון:**
- להוסיף `state` מקומי `imgFailed` ולהאזין ל‑`onError` על ה‑`<img>`.
- במקרה כשל – להחליף לתצוגת ראשי תיבות (אותו עיצוב שכבר קיים כשאין תמונה).
- אותו דבר ב‑`EditProfile.tsx`.
- בנוסף, גם ב‑`AppHeader.tsx` (אם משתמש באותה תמונה) נוסיף את אותו fallback כדי להיות עקביים.

## 2. שגיאת "ERROR" בלחיצה על "הקש להרחבה"
ב‑`src/components/DriverLiveTracker.tsx` כפתור ההרחבה הוא `<button>` שעוטף `<GoogleMap>`. ה‑Google Maps יוצר בתוכו אלמנטים אינטראקטיביים (כולל `<button>` פנימיים), מה שיוצר nesting לא חוקי ושגיאת hydration/runtime של React – משם מגיע ה‑"ERROR".

**תיקון:**
- להמיר את הכפתור החיצוני ל‑`<div role="button" tabIndex={0} onClick onKeyDown>` עם אותו עיצוב.
- לוודא שה‑`LiveTrackingSheet` מתרנדר מחוץ ל‑hierarchy של הכפתור (כבר `fixed inset-0 z-[100]`, תקין).
- וידוא שאין שגיאות בקונסול אחרי הפתיחה.

## 3. נקודת איסוף ויעד על המפה
כיום הקו מצויר אבל אין marker בנקודת האיסוף וגם לא תמיד ביעד הסופי. גם נוסע וגם נהג רואים רק את ה"רכב" ואת הקו.

**תיקון ב‑`src/hooks/use-driver-live-location.ts`:**
- להוסיף שני state חדשים: `pickupLatLng` ו‑`destinationLatLng`.
- בטעינה ראשונית/כשמשתנים `pickupLocation`/`destination` – להריץ `google.maps.Geocoder` פעם אחת לכל אחד מהם ולשמור את הקואורדינטות.
- להחזיר אותם בנוסף ל‑`location`, `eta`, `directions`.

**תיקון ב‑`src/components/DriverLiveTracker.tsx` (תצוגת preview):**
- להוסיף שני `<Marker>` חדשים:
  - איסוף – ריבוע ירוק/אינדיגו עם כיתוב "איסוף" (SVG inline).
  - יעד – סיכת מפה ורודה (אותו `destinationIcon` כמו בגיליון).
- להציג אותם רק כש‑`pickupLatLng` / `destinationLatLng` קיימים.
- כך גם כשרק קו מסלול מוצג – מבינים איפה הוא מתחיל ונגמר.

**תיקון ב‑`src/components/LiveTrackingSheet.tsx`:**
- להחליף את המרקר היחיד שמתבסס על `directions.routes[0].legs[0].end_location` בשני מרקרים מפורשים מתוך הקואורדינטות המוחזרות מה‑hook:
  - תמיד מרקר איסוף (כאשר יש `pickupLocation` והנסיעה עוד לא ב‑`in_progress`).
  - תמיד מרקר יעד.
- `fitBounds` יורחב לכלול גם את שני המרקרים בנוסף למיקום הנהג ולמסלול.

## פרטים טכניים
- שימוש ב‑Geocoder של Google שכבר טעון דרך `GoogleMapsProvider` – אין צורך בקריאות edge function.
- ה‑Geocoder ירוץ פעם אחת לכל ערך טקסטואלי (cache פנימי ב‑ref) כדי לא להיכנס ל‑rate limit.
- אם ה‑Geocoder נכשל – פשוט לא מציגים מרקר; הקו עדיין יצויר.
- כל הצבעים יישארו מתוך design tokens (primary/accent).
- אין שינוי ב‑DB, אין שינוי ב‑RLS, אין שינוי ב‑edge functions.

## קבצים שיתעדכנו
- `src/pages/Profile.tsx`
- `src/pages/EditProfile.tsx`
- `src/components/AppHeader.tsx` (אם רלוונטי)
- `src/components/DriverLiveTracker.tsx`
- `src/components/LiveTrackingSheet.tsx`
- `src/hooks/use-driver-live-location.ts`
