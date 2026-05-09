# שיפורי CampusLink — תוכנית

עוברים מ-PHP backend ל-Lovable Cloud, ובונים את 6 הפיצ'רים. מחולק ל-3 שלבים, כל שלב נשלח ונבדק לפני המשך.

## שלב 1 — תשתית נסיעות + ביטול + סטטוס "עברה" + מקומות=0

**מסד נתונים:**
- הרחבת טבלת `rides`: `status` (active/cancelled/completed), `notes`, `driver_name` (snapshot)
- הרחבת `bookings`: `status` (pending/accepted/rejected/cancelled)
- Triggers: עדכון `available_seats` אוטומטית כשהזמנה מאושרת/מבוטלת; סימון `completed` אוטומטית כשהשעה עברה
- אינדקסים מתאימים

**קוד:**
- מחיקת `mta-api.ts` ושימוש ישיר ב-Supabase client
- עדכון `Index`, `PostRide`, `SearchRides`, `RideCard` לעבוד מול Supabase
- כפתור "בטל נסיעה" בכרטיס למפרסם בלבד (עם דיאלוג אישור)
- חסימת "Join Ride" כש-`available_seats=0` (כבר חצי קיים)
- נסיעות שעברו / בוטלו: אפורות, תג "עברה" / "בוטלה", בלי כפתור הצטרפות
- מיון: עתידיות פעילות בראש, אחר כך עברו

## שלב 2 — מיילים למפרסם על הצטרפות + פרופ