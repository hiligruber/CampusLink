import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "EN" | "HE";

const dict = {
  // BottomNav
  nav_home: { EN: "Home", HE: "ראשי" },
  nav_search: { EN: "Search", HE: "חיפוש" },
  nav_post: { EN: "Post", HE: "פרסום" },
  nav_profile: { EN: "Profile", HE: "פרופיל" },

  // Header / notifications
  notifications: { EN: "Notifications", HE: "התראות" },
  notif_pending: { EN: "pending", HE: "ממתינות" },
  notif_empty_title: { EN: "All caught up", HE: "הכל שקט כאן" },
  notif_empty_desc: { EN: "No new requests right now", HE: "אין בקשות חדשות כרגע" },
  notif_requested: { EN: " requested to join", HE: " ביקש/ה להצטרף" },
  accept: { EN: "Accept", HE: "אישור" },
  reject: { EN: "Reject", HE: "דחייה" },
  view_all_requests: { EN: "View all requests", HE: "צפייה בכל הבקשות" },

  // Index
  active_rides: { EN: "active rides", HE: "נסיעות פעילות" },
  no_rides_title: { EN: "No rides yet", HE: "עוד אין נסיעות" },
  no_rides_desc: { EN: "Be the first to post a ride to campus", HE: "היי הראשון/ה לפרסם נסיעה לקמפוס" },

  // Ride card
  origin: { EN: "Origin", HE: "נקודת מוצא" },
  destination: { EN: "Destination", HE: "יעד" },
  posted_a_ride: { EN: "posted a ride", HE: "פרסם/ה נסיעה" },
  you: { EN: "YOU", HE: "את/ה" },
  seats: { EN: "seats", HE: "מקומות" },
  map: { EN: "Map", HE: "מפה" },
  calendar: { EN: "Calendar", HE: "יומן" },
  cancel: { EN: "Cancel", HE: "ביטול" },
  full: { EN: "Full", HE: "מלאה" },
  closed: { EN: "Closed", HE: "סגור" },
  cancelled: { EN: "Cancelled", HE: "בוטלה" },
  passed: { EN: "Past", HE: "עברה" },
  request_join: { EN: "Request to join", HE: "בקשת הצטרפות" },
  cancel_ride_q: { EN: "Cancel this ride?", HE: "לבטל את הנסיעה?" },
  cancel_ride_desc: {
    EN: "The ride will be marked as cancelled and no longer appear as active.",
    HE: "הנסיעה תסומן כמבוטלת ולא תופיע יותר כפעילה.",
  },
  back: { EN: "Back", HE: "חזרה" },
  cancel_ride: { EN: "Cancel ride", HE: "בטל נסיעה" },

  // Time ago
  now: { EN: "now", HE: "עכשיו" },
  min: { EN: "m", HE: "ד׳" },
  hr: { EN: "h", HE: "ש׳" },
  day: { EN: "d", HE: "י׳" },

  // Post ride
  post_a_ride: { EN: "Post a Ride", HE: "פרסום נסיעה" },
  post_intro: {
    EN: "Offer a ride to fellow students heading to campus.",
    HE: "הציעו טרמפ לסטודנטים אחרים שמגיעים לקמפוס.",
  },
  date: { EN: "Date", HE: "תאריך" },
  time: { EN: "Time", HE: "שעה" },
  available_seats: { EN: "Available seats", HE: "מקומות פנויים" },
  notes_opt: { EN: "Notes (optional)", HE: "הערות (לא חובה)" },
  posting: { EN: "Posting...", HE: "מפרסם..." },
  post_ride: { EN: "Post Ride", HE: "פרסם נסיעה" },
} as const;

type Key = keyof typeof dict;

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: Key) => string;
}

const LanguageContext = createContext<Ctx>({
  lang: "HE",
  setLang: () => {},
  toggle: () => {},
  t: (k) => k as string,
});

export const useLang = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() =>
    (localStorage.getItem("cl_lang") as Lang) || "HE"
  );

  useEffect(() => {
    document.documentElement.lang = lang === "EN" ? "en" : "he";
    document.documentElement.dir = lang === "EN" ? "ltr" : "rtl";
    localStorage.setItem("cl_lang", lang);
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const toggle = () => setLangState((p) => (p === "EN" ? "HE" : "EN"));
  const t = (k: Key) => dict[k][lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
