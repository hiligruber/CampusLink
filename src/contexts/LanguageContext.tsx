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
  no_rides_desc: { EN: "Publish the first trip!", HE: "פרסם את הנסיעה הראשונה" },
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
  phase_en_route: { EN: "En route", HE: "בדרך" },
  phase_picked_up: { EN: "Picked up", HE: "אספו את הנוסעים" },
  phase_in_progress: { EN: "In progress", HE: "בנסיעה" },
  phase_completed: { EN: "Completed", HE: "הסתיימה" },

  // Auth
  auth_tagline: { EN: "Carpool with fellow students on campus", HE: "טרמפים בקמפוס עם סטודנטים אחרים" },
  auth_welcome_back: { EN: "Welcome back", HE: "ברוך/ה שובך" },
  auth_create_account: { EN: "Create your account", HE: "יצירת חשבון חדש" },
  auth_signin_subtitle: { EN: "Sign in to continue to CampusLink", HE: "התחברו כדי להמשיך ל-CampusLink" },
  auth_signup_subtitle: { EN: "Join the student carpool community", HE: "הצטרפו לקהילת הטרמפים הסטודנטיאלית" },
  auth_full_name: { EN: "Full name", HE: "שם מלא" },
  auth_full_name_ph: { EN: "Noa Cohen", HE: "נועה כהן" },
  auth_email: { EN: "Email", HE: "אימייל" },
  auth_email_ph: { EN: "you@mta.ac.il", HE: "you@mta.ac.il" },
  auth_password: { EN: "Password", HE: "סיסמה" },
  auth_password_ph: { EN: "••••••••", HE: "••••••••" },
  auth_sign_in: { EN: "Sign In", HE: "התחברות" },
  auth_create_btn: { EN: "Create Account", HE: "יצירת חשבון" },
  auth_loading: { EN: "Loading...", HE: "טוען..." },
  auth_have_account: { EN: "Already have an account?", HE: "כבר יש לך חשבון?" },
  auth_no_account: { EN: "Don't have an account?", HE: "אין לך חשבון?" },
  auth_sign_up_link: { EN: "Sign up", HE: "הרשמה" },
  auth_sign_in_link: { EN: "Sign in", HE: "התחברות" },
  auth_signup_success: { EN: "Signed up successfully! Continue to verification.", HE: "נרשמת בהצלחה! המשך לאימות סטודנט" },
  auth_signin_success: { EN: "Welcome back!", HE: "ברוך/ה הבא/ה!" },
  auth_terms: { EN: "By continuing you agree to our terms & privacy policy.", HE: "בהמשך התחברות את/ה מסכים/ה לתנאי השימוש ולמדיניות הפרטיות." },

  // Generic
  loading: { EN: "Loading…", HE: "טוען…" },
  save: { EN: "Save", HE: "שמור" },
  send: { EN: "Send", HE: "שלח" },
  retry: { EN: "Try again", HE: "נסה שוב" },
  generic_error: { EN: "Something went wrong", HE: "פעולה נכשלה" },
  no_name: { EN: "No name", HE: "ללא שם" },
  student_fallback: { EN: "Student", HE: "סטודנט" },
  user_fallback: { EN: "User", HE: "משתמש" },

  // Notifications / inbox
  inbox_messages: { EN: "Messages", HE: "הודעות" },
  inbox_grouped: { EN: "Grouped by ride", HE: "מקובץ לפי נסיעה" },
  inbox_empty_title: { EN: "No messages yet", HE: "אין הודעות עדיין" },
  inbox_empty_desc: { EN: "Conversations with drivers and passengers will appear here", HE: "שיחות עם נהגים ונוסעים יופיעו כאן" },
  inbox_you_prefix: { EN: "You: ", HE: "את/ה: " },
  aria_notifications: { EN: "Notifications", HE: "התראות" },
  aria_profile: { EN: "Profile", HE: "פרופיל" },
  toast_request_accepted: { EN: "Request accepted", HE: "הבקשה אושרה" },
  toast_request_rejected: { EN: "Request rejected", HE: "הבקשה נדחתה" },

  // Live tracking / driver phases
  phase_driver_on_way: { EN: "Driver is en route", HE: "הנהג בדרך" },
  phase_picked_passengers: { EN: "Picked up passengers", HE: "אספת את הנוסעים" },
  phase_to_destination: { EN: "On the way to destination", HE: "בדרך ליעד" },
  phase_ride_finished: { EN: "Ride finished", HE: "הנסיעה הסתיימה" },
  phase_awaiting_start: { EN: "Awaiting start", HE: "ממתין ליציאה" },
  live_loading_driver: { EN: "Loading driver location…", HE: "טוען מיקום נהג…" },
  live_no_location_title: { EN: "Driver location not available yet", HE: "אין עדיין מיקום של הנהג" },
  live_no_location_desc: { EN: "It will appear here as soon as the driver heads out", HE: "ברגע שהנהג ייצא לדרך זה יופיע כאן" },
  live_aria_track: { EN: "Live driver tracking", HE: "מעקב חי אחרי הנהג" },
  live_aria_close: { EN: "Close map", HE: "סגור מפה" },
  live_aria_center: { EN: "Center on driver", HE: "מרכז על הנהג" },
  live_aria_expand: { EN: "Expand details", HE: "הרחב פרטים" },
  live_aria_collapse: { EN: "Collapse details", HE: "כווץ פרטים" },
  live_marker_driver: { EN: "Driver", HE: "הנהג" },
  live_marker_pickup: { EN: "Pickup", HE: "איסוף" },
  live_marker_destination: { EN: "Destination", HE: "יעד" },
  live_updated_ago: { EN: "Updated", HE: "עודכן" },
  live_seconds_ago: { EN: "{s}s ago", HE: "לפני {s}ש'" },
  live_about_minute_ago: { EN: "about a minute ago", HE: "לפני כדקה" },
  eta_arriving_in: { EN: "ETA", HE: "מגיע אליך בעוד" },
  distance: { EN: "Distance", HE: "מרחק" },
  computing_eta: { EN: "Computing ETA…", HE: "מחשב זמן הגעה…" },
  pickup: { EN: "Pickup", HE: "איסוף" },
  open_in_waze: { EN: "Open in Waze", HE: "פתח ב-Waze" },
  live_track_of: { EN: "Live tracking of {name}", HE: "מעקב חי אחרי {name}" },
  thanks_for_riding: { EN: "Thanks for riding with us", HE: "תודה שנסעת איתנו" },
  awaiting_first_fix: { EN: "Driver is on the way — waiting for first GPS fix", HE: "הנהג בדרך — מחכים לפיקס GPS ראשון" },
  connecting_driver: { EN: "Connecting to driver location…", HE: "מתחבר למיקום הנהג…" },
  driver_not_started: { EN: "Driver has not started yet", HE: "הנהג עדיין לא יצא לדרך" },
  driver_will_update: { EN: 'Once the driver taps "Share Live Location" the map will update here in real time', HE: 'ברגע שהנהג ילחץ "שתף מיקום חי" המפה תעודכן כאן בזמן אמת' },
  ended: { EN: "Ended", HE: "הסתיימה" },
  aria_expand_map: { EN: "Expand tracking map", HE: "הרחב מפת מעקב" },
  tap_to_expand: { EN: "Tap to expand", HE: "הקש להרחבה" },
  on_the_way_dot: { EN: "En route · {place}", HE: "בדרך · {place}" },

  // Driver controls
  gps_active: { EN: "GPS active", HE: "GPS פעיל" },
  gps_locating: { EN: "Locating GPS…", HE: "מאתר GPS…" },
  gps_unsupported: { EN: "GPS not supported", HE: "GPS לא נתמך" },
  gps_no_fix: { EN: "No location · try again", HE: "אין מיקום · נסה שוב" },
  btn_on_the_way: { EN: "Share Live Location", HE: "שתף מיקום חי" },
  btn_picked_up: { EN: "Picked up passengers", HE: "אספתי את הנוסעים" },
  btn_start_ride: { EN: "Start ride", HE: "התחל נסיעה" },
  btn_drop_off: { EN: "Dropped off passengers", HE: "הורדתי את הנוסעים" },
  toast_passengers_notified: { EN: "Passengers can now track your location", HE: "הנוסעים יכולים עכשיו לעקוב אחרי המיקום שלך" },
  toast_started_no_loc: { EN: "Started — but location not shared", HE: "התחלת — אך המיקום לא משותף" },
  toast_passengers_with_you: { EN: "Great — passengers are with you", HE: "מצויין — הנוסעים אצלך" },
  toast_ride_started: { EN: "Ride started", HE: "הנסיעה התחילה" },
  toast_ride_finished: { EN: "Ride finished", HE: "הנסיעה הסתיימה" },
  loc_error_title: { EN: "We couldn't read your location", HE: "לא הצלחנו לקרוא את המיקום שלך" },
  loc_error_desc: { EN: "Check that location permission is granted in the browser and on the device, and that you're connected to GPS / data.", HE: "ודא/י שהרשאת מיקום מאושרת בדפדפן ובמכשיר, ושאתה מחובר/ת ל-GPS / לרשת." },
  loc_continue_without: { EN: "Continue without location", HE: "המשך בלי מיקום" },
  loc_browser_unsupported: { EN: "Browser doesn't support location", HE: "הדפדפן לא תומך במיקום" },
  loc_permission_denied: { EN: "Location permission denied", HE: "גישה למיקום נדחתה" },

  // Join dialog
  join_title: { EN: "Request to join ride", HE: "בקשה להצטרף לנסיעה" },
  join_pickup_label: { EN: "Pickup point", HE: "נקודת איסוף" },
  join_pickup_ph: { EN: "Where should we pick you up?", HE: "באיזו כתובת לאסוף אותך?" },
  join_pickup_hint: { EN: "Make sure the pickup point is close to the driver's route to help them approve.", HE: "ודאו שנקודת האיסוף קרובה למסלול של הנהג כדי לסייע באישור הבקשה." },
  join_send: { EN: "Send request", HE: "שלח בקשה" },
  toast_join_sent: { EN: "Request sent to {name}", HE: "הבקשה נשלחה ל-{name}" },
  toast_pickup_at: { EN: "Pickup: {place}", HE: "איסוף: {place}" },
  toast_ride_cancelled: { EN: "Ride cancelled", HE: "הנסיעה בוטלה" },
  toast_cancel_failed: { EN: "Failed to cancel ride", HE: "ביטול הנסיעה נכשל" },

  // Chat
  chat_with: { EN: "Chat with {name}", HE: "צ'אט עם {name}" },
  chat_empty: { EN: "No messages yet. Send the first one ✨", HE: "עדיין אין הודעות. שלחו את הראשונה ✨" },
  chat_placeholder: { EN: "Type a message…", HE: "כתוב הודעה…" },
  chat_send_failed: { EN: "Failed to send", HE: "שליחה נכשלה" },
  chat_preset_1: { EN: "I'm at the entrance", HE: "אני בכניסה" },
  chat_preset_2: { EN: "I've arrived", HE: "הגעתי" },
  chat_preset_3: { EN: "Running 2 min late", HE: "מאחר ב-2 דק׳" },
  chat_preset_4: { EN: "Where are you?", HE: "איפה אתה?" },
  chat_preset_5: { EN: "Thanks!", HE: "תודה!" },

  // Edit profile
  edit_profile_title: { EN: "Edit profile", HE: "עריכת פרופיל" },
  aria_change_photo: { EN: "Change photo", HE: "החלף תמונה" },
  change_photo_hint: { EN: "Tap the camera to change photo", HE: "לחץ על המצלמה להחלפת תמונה" },
  full_name: { EN: "Full name", HE: "שם מלא" },
  full_name_ph: { EN: "Your name", HE: "השם שלך" },
  hobbies_label: { EN: "Hobbies / interests", HE: "תחביבים / תחומי עניין" },
  hobbies_ph: { EN: "Sports, series, tech…", HE: "ספורט, סדרות, טכנולוגיה..." },
  music_label: { EN: "Music / conversation style on the ride", HE: "מוזיקה מועדפת / סגנון שיחה בנסיעה" },
  music_ph: { EN: "Israeli pop, podcasts, chatty / quiet…", HE: "פופ ישראלי, פודקאסטים, אוהב לדבר / שקט..." },
  toast_photo_too_big: { EN: "Image too large (max 5MB)", HE: "התמונה גדולה מדי (מקסימום 5MB)" },
  toast_photo_uploaded: { EN: "Photo uploaded", HE: "התמונה הועלתה" },
  toast_upload_failed: { EN: "Upload failed", HE: "העלאה נכשלה" },
  toast_profile_updated: { EN: "Profile updated", HE: "הפרופיל עודכן" },
  toast_save_failed: { EN: "Save failed", HE: "שמירה נכשלה" },

  // Bookings
  bookings_title: { EN: "My requests", HE: "הבקשות שלי" },
  ride_details_unavailable: { EN: "Ride details unavailable", HE: "פרטי נסיעה לא זמינים" },
  seats_avail_fmt: { EN: "{a}/{t} seats available", HE: "{a}/{t} מקומות פנויים" },
  tab_received: { EN: "Requests received", HE: "בקשות שקיבלתי" },
  tab_my_requests: { EN: "My requests", HE: "הבקשות שלי" },
  bookings_empty_received: { EN: "No requests yet. When someone asks to join, it'll appear here.", HE: "עדיין אין בקשות. כשמישהו יבקש להצטרף, זה יופיע כאן." },
  bookings_empty_mine: { EN: "You haven't requested to join any rides yet.", HE: "עוד לא ביקשת להצטרף לנסיעות." },
  status_accepted: { EN: "Accepted", HE: "אושר" },
  status_rejected: { EN: "Rejected", HE: "נדחה" },
  status_cancelled: { EN: "Cancelled", HE: "בוטל" },
  status_pending: { EN: "Pending", HE: "ממתין" },
  aria_msg_passenger: { EN: "Message passenger", HE: "שלח הודעה לנוסע" },
  aria_msg_driver: { EN: "Message driver", HE: "הודעה לנהג" },

  // Admin
  admin_title: { EN: "Admin - Student verification", HE: "ניהול - אימות סטודנטים" },
  admin_view_id: { EN: "View student ID", HE: "צפה בכרטיס סטודנט" },
  admin_approve: { EN: "Approve", HE: "אשר" },
  admin_reject: { EN: "Reject", HE: "דחה" },
  admin_no_pending: { EN: "No pending requests", HE: "אין בקשות ממתינות" },
  admin_manage_admins: { EN: "Manage admins", HE: "ניהול מנהלים" },
  admin_no_admins: { EN: "No admins registered", HE: "אין מנהלים רשומים" },
  admin_cant_remove_self: { EN: "You can't remove yourself", HE: "לא ניתן להסיר את עצמך" },
  admin_add_by_email: { EN: "Add admin by email", HE: "הוסף מנהל לפי מייל" },
  add: { EN: "Add", HE: "הוסף" },
  reject_reason: { EN: "Rejection reason", HE: "סיבת דחייה" },
  reject_reason_ph: { EN: "Explain why the request is being rejected…", HE: "הסבר למה הבקשה נדחית..." },
  reject_request: { EN: "Reject request", HE: "דחה בקשה" },
  toast_student_approved: { EN: "Student approved", HE: "הסטודנט אושר" },
  toast_request_rejected2: { EN: "Request rejected", HE: "הבקשה נדחתה" },
  toast_user_not_found: { EN: "No user found with that email", HE: "לא נמצא משתמש עם המייל הזה" },
  toast_already_admin: { EN: "User is already an admin", HE: "המשתמש כבר מנהל" },
  toast_admin_added: { EN: "User promoted to admin", HE: "המשתמש מונה למנהל" },
  toast_admin_removed: { EN: "Admin role removed", HE: "הרשאת המנהל הוסרה" },

  // Verification onboarding
  pending_heading: { EN: "Your join request is awaiting admin approval", HE: "בקשת ההצטרפות שלך ממתינה לאישור מנהל" },
  pending_desc: { EN: "Once an admin approves the request, you'll get full access to CampusLink. We'll email you.", HE: "ברגע שמנהל יאשר את הבקשה, תקבל גישה מלאה ל-CampusLink. נשלח לך הודעה במייל." },
  pending_username: { EN: "Username:", HE: "שם משתמש:" },
  pending_institution: { EN: "Institution:", HE: "מוסד:" },
  contact_support: { EN: "Contact support", HE: "צור קשר עם התמיכה" },
  contact_support_appeal: { EN: "Contact support / appeal a block", HE: "צור קשר עם התמיכה / ערעור על חסימה" },
  step_x_of_y: { EN: "Step {n} of {t}", HE: "שלב {n} מתוך {t}" },
  prev_rejected_title: { EN: "Your previous request was rejected", HE: "הבקשה הקודמת נדחתה" },
  step_username_title: { EN: "Choose a username", HE: "בחר שם משתמש" },
  step_username_sub: { EN: "How others will recognize you", HE: "כך אחרים יזהו אותך" },
  step_institution_title: { EN: "Academic institution", HE: "מוסד הלימודים" },
  step_institution_sub: { EN: "Which campus are you on?", HE: "מאיזה קמפוס אתה?" },
  step_interests_title: { EN: "Interests & music", HE: "תחביבים ומוזיקה" },
  step_interests_sub: { EN: "Tell us what you like", HE: "ספר לנו מה אתה אוהב" },
  step_id_title: { EN: "Student verification", HE: "אימות סטודנט" },
  step_id_sub: { EN: "Upload a photo of your student ID", HE: "העלה תמונת תעודת סטודנט" },
  username_label: { EN: "Username", HE: "שם משתמש" },
  username_hint: { EN: "3-24 chars: English letters, digits, dot or underscore.", HE: "3-24 תווים, אותיות באנגלית, מספרים, נקודה או קו תחתון." },
  institution_label: { EN: "Institution", HE: "מוסד לימודים" },
  institution_ph: { EN: "Select institution", HE: "בחר מוסד" },
  interests_label: { EN: "Interests", HE: "תחביבים" },
  music_genres_label: { EN: "Preferred genres", HE: "ז'אנרים מועדפים" },
  student_id_label: { EN: "Student ID", HE: "תעודת סטודנט" },
  preview_alt: { EN: "Preview", HE: "תצוגה מקדימה" },
  upload_id_hint: { EN: "Click to upload an image of your student ID", HE: "לחץ להעלאת תמונה של תעודת הסטודנט" },
  file_hint: { EN: "JPG, PNG up to 5MB", HE: "JPG, PNG עד 5MB" },
  next: { EN: "Next", HE: "המשך" },
  submit_for_review: { EN: "Submit for review", HE: "שלח לאישור" },
  toast_image_required: { EN: "Please upload an image file", HE: "נא להעלות קובץ תמונה" },
  toast_file_too_big: { EN: "File larger than 5MB", HE: "קובץ גדול מ-5MB" },
  toast_fill_all: { EN: "Please fill out all details", HE: "נא למלא את כל הפרטים" },
  toast_username_taken: { EN: "Username already taken, try another", HE: "שם המשתמש כבר תפוס, נסה אחר" },
  toast_submitted_for_review: { EN: "Your request was submitted for admin approval", HE: "הבקשה נשלחה לאישור מנהל המערכת" },

  // Support
  support_title: { EN: "Support", HE: "תמיכה" },
  support_appeals_heading: { EN: "Support & appeals", HE: "תמיכה וערעורים" },
  support_appeals_desc: { EN: "You can contact our support team or submit a block appeal.", HE: "אתה יכול לפנות לצוות התמיכה או להגיש ערעור על חסימה." },
  my_tickets: { EN: "My tickets", HE: "הפניות שלי" },
  new_ticket: { EN: "New ticket", HE: "פנייה חדשה" },
  no_tickets_yet: { EN: "You haven't opened any tickets yet. Click \"New ticket\" to start.", HE: "עוד לא פתחת פניות. לחץ \"פנייה חדשה\" כדי להתחיל." },
  category: { EN: "Category", HE: "קטגוריה" },
  subject: { EN: "Subject", HE: "נושא" },
  message: { EN: "Message", HE: "הודעה" },
  short_description_ph: { EN: "Short description", HE: "תיאור קצר" },
  tell_us_ph: { EN: "Tell us what happened…", HE: "ספר לנו מה קרה..." },
  send_ticket: { EN: "Send request", HE: "שלח פנייה" },
  toast_ticket_sent: { EN: "Your request has been submitted", HE: "הבקשה נשלחה בהצלחה" },
  toast_ticket_failed: { EN: "Failed to send", HE: "שגיאה בשליחה" },
  sender_support: { EN: "Support", HE: "תמיכה" },
  sender_you: { EN: "You", HE: "אתה" },
  sender_user: { EN: "User", HE: "משתמש" },
  back_to_verify: { EN: "Back to verification screen", HE: "חזרה למסך האימות" },
  cat_technical: { EN: "Technical issue", HE: "בעיה טכנית" },
  cat_report_user: { EN: "Report a user", HE: "דיווח על משתמש" },
  cat_account: { EN: "Account problem", HE: "בעיית חשבון" },
  cat_appeal: { EN: "Appeal a block", HE: "ערעור על חסימה" },
  cat_other: { EN: "Other", HE: "אחר" },
  st_open: { EN: "Open", HE: "פתוח" },
  st_in_progress: { EN: "In progress", HE: "בטיפול" },
  st_resolved: { EN: "Resolved", HE: "נסגר" },
  all_categories: { EN: "All categories", HE: "כל הקטגוריות" },
  all_statuses: { EN: "All statuses", HE: "כל הסטטוסים" },
  support_admin_title: { EN: "Support tickets", HE: "פניות תמיכה" },
  no_matching_tickets: { EN: "No matching tickets", HE: "אין פניות תואמות" },
  reply_ph: { EN: "Write a reply to the user…", HE: "כתוב תגובה למשתמש..." },
  unblock_and_approve: { EN: "Unblock and approve user", HE: "שחרר חסימה ואשר משתמש" },
  toast_updated: { EN: "Updated", HE: "עודכן" },
  toast_user_unblocked: { EN: "User unblocked and approved", HE: "המשתמש שוחרר ואושר" },
} as const;

type Key = keyof typeof dict;

const interp = (s: string, vars?: Record<string, string | number>) => {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
};

interface Ctx {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<Ctx>({
  lang: "HE",
  dir: "rtl",
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
  const t = (k: Key, vars?: Record<string, string | number>) =>
    interp(dict[k] ? dict[k][lang] : (k as string), vars);
  const dir = lang === "EN" ? "ltr" : "rtl";

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
