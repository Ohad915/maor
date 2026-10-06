# לוח דיגיטלי חכם לבית הכנסת — Next.js + Firebase

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
