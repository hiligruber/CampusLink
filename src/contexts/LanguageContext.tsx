import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "EN" | "HE";

const dict = {
  // Nav
  nav_home: { EN: "Home", HE: "ראשי" },
  nav_search: { EN: "Search", HE: "חיפוש" },
  nav_post: { EN: "Post", HE: "פרסום" },
  nav_profile: { EN: "Profile", HE: "פרופיל" },
  nav_activity: { EN: "Activity", HE: "פעילות" },
  nav_settings: { EN: "Settings", HE: "הגדרות" },

  // Header
  notifications: { EN: "Notifications", HE: "התראות" },
  notif_pending: { EN: "pending", HE: "ממתינות" },
  notif_empty_title: { EN: "All caught up", HE: "הכל שקט כאן" },
  notif_empty_desc: { EN: "No new requests right now", HE: "אין בקשות חדשות כרגע" },
  notif_requested: { EN: " requested to join", HE: " ביקש/ה להצטרף" },
  notif_mark_all_read: { EN: "Mark all read", HE: "סמן הכל כנקרא" },
  accept: { EN: "Accept", HE: "אישור" },
  reject: { EN: "Reject", HE: "דחייה" },
  view_all_requests: { EN: "View all requests", HE: "צפייה בכל הבקשות" },
  follow_driver: { EN: "Track driver", HE: "עקוב אחר הנהג" },

  // Home / Index
  home_tagline: { EN: "All your rides here.", HE: "כל הנסיעות שלך במקום אחד." },
  active_rides: { EN: "active rides", HE: "נסיעות פעילות" },
  no_rides_title: { EN: "No rides yet", HE: "עוד אין נסיעות" },
  no_rides_desc: { EN: "Be the first to post a ride to campus", HE: "היי הראשון/ה לפרסם נסיעה לקמפוס" },
  search_placeholder: { EN: "Search by origin or destination...", HE: "חיפוש לפי מוצא או יעד..." },
  no_match_title: { EN: "No matching rides found", HE: "לא נמצאו נסיעות תואמות" },
  no_match_desc: { EN: "Try different search terms", HE: "נסה/י לחפש מילים אחרות" },
  show_all: { EN: "Show ended rides", HE: "הצג נסיעות שהסתיימו" },
  hide_ended: { EN: "Hide ended", HE: "הסתר שהסתיימו" },
  results: { EN: "results", HE: "תוצאות" },

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
  passed: { EN: "Ended", HE: "הסתיימה" },
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

  // Post
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

  // Activity
  activity_title: { EN: "Activity", HE: "פעילות" },
  no_active_title: { EN: "You have no active rides", HE: "אין לך נסיעות פעילות" },
  no_active_desc: {
    EN: "Once you post or join a ride, it'll appear here.",
    HE: "ברגע שתפרסם נסיעה או תצטרף לאחת — היא תופיע כאן",
  },
  find_ride: { EN: "Find a ride", HE: "חפש נסיעה" },
  open_map: { EN: "Open live map", HE: "פתח מפה חיה" },
  send_message: { EN: "Send a message", HE: "שלח/י הודעה" },
  you_driver: { EN: "You're the driver", HE: "את/ה הנהג" },
  you_passenger: { EN: "You're a passenger", HE: "את/ה נוסע" },
  driver_short: { EN: "Driver", HE: "נהג" },
  passenger_short: { EN: "Passenger", HE: "נוסע" },
  pickup_yours: { EN: "Your pickup", HE: "איסוף שלך" },

  // Profile
  profile_title: { EN: "Profile", HE: "פרופיל" },
  reliability: { EN: "Rating", HE: "דירוג" },
  hobbies: { EN: "Hobbies", HE: "תחביבים" },
  music_pref: { EN: "Music / ride vibe", HE: "מוזיקה / שיחה בנסיעה" },
  edit_profile: { EN: "Edit profile", HE: "עריכת פרופיל" },
  admin_panel: { EN: "Admin panel", HE: "פאנל ניהול" },
  sign_out: { EN: "Sign Out", HE: "התנתק" },
  my_rides: { EN: "My rides", HE: "הנסיעות שלי" },
  as_driver: { EN: "As driver", HE: "כנהג" },
  as_passenger: { EN: "As passenger", HE: "כנוסע" },
  no_rides_driver: { EN: "You haven't posted any rides yet.", HE: "עוד לא פרסמת נסיעות." },
  no_rides_passenger: { EN: "You haven't joined any rides yet.", HE: "עוד לא הצטרפת לנסיעות." },

  // Settings
  settings_title: { EN: "Settings", HE: "הגדרות" },
  appearance: { EN: "Appearance", HE: "מראה" },
  theme_light: { EN: "Light", HE: "בהיר" },
  theme_dark: { EN: "Dark", HE: "כהה" },
  theme_system: { EN: "System", HE: "מערכת" },
  language: { EN: "Language", HE: "שפה" },
  english: { EN: "English", HE: "אנגלית" },
  hebrew: { EN: "Hebrew", HE: "עברית" },

  // Rating
  rate_ride_title: { EN: "How was your ride?", HE: "איך הייתה הנסיעה?" },
  rate_ride_desc: {
    EN: "Rate your experience to help the community.",
    HE: "דרג/י את החוויה כדי לעזור לקהילה.",
  },
  rate_with: { EN: "Rate", HE: "דרג/י את" },
  rating_comment_ph: { EN: "Leave a short comment (optional)", HE: "השאר/י הערה קצרה (לא חובה)" },
  submit_rating: { EN: "Submit rating", HE: "שלח דירוג" },
  skip: { EN: "Skip", HE: "דלג" },
  thanks_rating: { EN: "Thanks for rating!", HE: "תודה על הדירוג!" },

  // Phases
  phase_scheduled: { EN: "Scheduled", HE: "מתוכננת" },
  phase_en_route: { EN: "On the way", HE: "בדרך אליך" },
  phase_picked_up: { EN: "Picked up", HE: "אספו את הנוסעים" },
  phase_in_progress: { EN: "In progress", HE: "בנסיעה" },
  phase_completed: { EN: "Completed", HE: "הסתיימה" },
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
  const t = (k: Key) => (dict[k] ? dict[k][lang] : (k as string));

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
