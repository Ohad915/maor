# מאור - ניהול בית כנסת (לוח דיגיטלי חכם) — Next.js + Firebase

## הקמה (פעם אחת)
1. **Firebase Console** → צרו פרויקט. תחת *Authentication → Sign-in method* הפעילו **Email/Password** ו-**Anonymous** (המסך בטלוויזיה נכנס אנונימית).
2. *Firestore Database* → Create database (production mode).
3. *Project settings → Your apps → Web app* → העתיקו את ה-config לקובץ `.env.local` (תבנית ב-`.env.local.example`).
4. *Firestore → Rules* → הדביקו את `firestore.rules` ולחצו **Publish**.
5. במחשב: `npm install` ואז `npm run dev` (או העלו ל-Vercel והגדירו שם את אותם משתני סביבה).
6. הירשמו ב-`/login`. ב-Firestore Console פתחו `users/<uid>` ושנו: `role = super_admin`, `status = approved`. מעכשיו `/super-admin` שלכם.

## זרימת עבודה
- גבאי נרשם ב-`/login` ← מצב *pending* ← אתם ב-`/super-admin` משייכים בית כנסת, בוחרים חבילה ומאשרים.
- ב-`/super-admin` לכל בית כנסת: **כניסה כגבאי** (שליטה מלאה ב-`/admin?s=<id>`), **הקפא/הפשר** (הגבאי חסום והמסך מציג הודעת השהיה), **מחק** (מוחק את כל הנתונים).
- הגבאי מנהל ב-`/admin`; כפתור **תצוגה מקדימה** פותח חלון חי של המסך. הטלוויזיה (Fully Kiosk) פותחת: `/display?s=<synagogueId>&screen=main-hall`

## מבנה Firestore
- `users/{uid}`: uid, email, role (`super_admin|gabbai|sub_gabbai`), status (`pending|approved|rejected|suspended`), synagogueId, createdAt
- `synagogues/{sid}`: name, city, street, location{lat,lng,elevation}, plan{planTier,maxScreens,features,subscriptionStatus,validUntil}, settings{...}
- תתי-אוספים: announcements, memorials, refuah, halacha, prayers, overrides, members, receipts, donations, tickets, inventory, expenses, screens (heartbeat), private (org, counters)

## מה לא כלול (להשלמה)
- דף `/report` לדיווח תקלות ע״י מתפללים (QR) ובוט וואטסאפ.
- סנכרון חי עם נדרים פלוס/משולם/Grow (דורש Cloud Function ומפתחות הספק). קיים ייבוא CSV.
- אכיפת מגבלת הנצחות לפי חבילה בצד השרת (קיימת ב-UI בלבד). מגבלת המסכים נאכפת ב-rules לפי `index`.
- קבלות סעיף 46: טיוטה בלבד, יש לאמת מול רואה חשבון ורשות המסים.

## חיבור איטי / WebSockets חסומים
המסך מציג מיד עותק שמור, ואם אין תשובה חיה תוך 4 שניות הוא קורא את הנתונים בקריאה חד-פעמית וממשיך לנסות ברקע. Firestore מוגדר לזיהוי אוטומטי של Long Polling. לכפיית Long Polling בסטרימר מסוים פתחו פעם אחת `/display?...&lp=1` (נשמר במכשיר; `lp=0` מבטל), או הגדירו `NEXT_PUBLIC_FORCE_LONG_POLLING=1`.

## PWA / APK
`public/manifest.json`, אייקונים ב-`public/icons/` ו-`public/sw.js` כבר כלולים (הקישור ב-`app/layout.js`). לאחר פריסה ל-HTTPS הדביקו את כתובת האתר ב-PWABuilder.com ← Package for stores ← Android.

## עבודה ללא אינטרנט (Offline)
- Firestore שומר את כל הנתונים ב-IndexedDB (`persistentLocalCache`, כולל מספר לשוניות), ועותק נוסף ב-localStorage. מסך שנפתח ללא רשת מציג מיד את המידע האחרון (סימון בפינה: "אופליין").
- זמני היום מחושבים תמיד מקומית ב-`kosher-zmanim` לפי הקואורדינטות השמורות, לכן הם מדויקים גם בלי רשת.
- כשהרשת חוזרת (או נקודה חמה לכמה שניות) המסך מתחבר מחדש ומתעדכן לבד, בלי רענון.
- כדי שהמסך ייפתח אופליין גם אחרי הדלקה מחדש של הסטרימר: פתחו את `/display?...` פעם אחת עם חיבור (ה-service worker שומר את האפליקציה).

## "שכחתי סיסמה" (`/login` → `/api/auth/forgot-password`)
- הטופס דורש אימייל + טלפון (בהרשמה נשמר גם `phone` ב-`users/{uid}`). הבקשה נשלחת למייל `FORGOT_PASSWORD_NOTIFY_TO` (ברירת מחדל ohad915@gmail.com) עם האימייל, הטלפון, התאריך והשעה, ה-IP ותוצאת ההתאמה.
- אם האימייל והטלפון תואמים לרשומה ב-`users` – נשלח גם מייל האיפוס הסטנדרטי של Firebase (`PASSWORD_RESET`). התשובה למשתמש זהה בכל מקרה (למניעת בדיקת קיום חשבונות).
- משתני סביבה ב-Vercel (ראו `.env.local.example`): שליחת מייל – `SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS` (למשל Gmail עם סיסמת אפליקציה) **או** `RESEND_API_KEY`; ולאימות מול Firestore – `FIREBASE_SERVICE_ACCOUNT` (JSON של Service Account). בלי מייל מוגדר הטופס מחזיר שגיאה; בלי Service Account נשלחת התראה למנהל בלבד (ללא איפוס אוטומטי).
- משתמשים שנרשמו לפני הוספת השדה אין להם `phone` ולכן לא יותאמו אוטומטית – ההתראה למנהל תגיע ואפשר לאפס ידנית, או להוסיף להם `phone` ב-Firestore.

## התחברות בטלפון + סיסמה (ללא SMS)
- הרשמה והתחברות במספר נייד ישראלי וסיסמה. מאחורי הקלעים נוצר ב-Firebase Auth זהות `p05XXXXXXXX@phone.maor.local` (לא נשלחים אליה מיילים) – הסיסמאות מוצפנות ומנוהלות ע״י Firebase, בלי JWT עצמי.
- התחברות במייל ממשיכה לעבוד לחשבונות קיימים (שדה אחד "טלפון או אימייל").
- שכחתי סיסמה: הבקשה מגיעה למנהל המערכת; ב-Super Admin לוחצים "🔑 אפס סיסמה" (`/api/admin/reset-password`, דורש `FIREBASE_SERVICE_ACCOUNT`) ומוסרים בטלפון סיסמה זמנית. המשתמש מחליף אותה ב"הגדרות מערכת ← שינוי סיסמה".

## שיוך אוטומטי של גבאי לבית כנסת
- הרשמה: בוחרים "בית כנסת חדש" (שם + עיר) או "הצטרפות עם קוד". `/api/auth/onboard` (Admin SDK, דורש `FIREBASE_SERVICE_ACCOUNT`) יוצר את בית הכנסת / מממש את הקוד וכותב `users/{uid}.synagogueId` – בלי עריכה ידנית ב-Firestore.
- בית כנסת חדש: הסטטוס נשאר "ממתין" עד שמנהל המערכת לוחץ "אשר" (ה-ID כבר משויך). אפשר לאשר אוטומטית עם `AUTO_APPROVE_NEW_SYNAGOGUES=1`.
- קוד הצטרפות: הגבאי הראשי יוצר אותו ב"הגדרות מערכת ← 🔗 קוד הצטרפות" (אוסף `joinCodes`, חוקי Firestore כבר מעודכנים – צריך לפרסם אותם בקונסולה). המצטרף הופך לגבאי משנה (הודעות בלבד) ומאושר מיידית.
