// SPARK Quality · Legal Pages — תנאי שימוש, פרטיות, נגישות
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Shield, Accessibility } from "lucide-react";
import { useLocation } from "wouter";

type LegalKind = "terms" | "privacy" | "accessibility";

interface LegalPageProps {
  kind: LegalKind;
}

const META: Record<LegalKind, { title: string; eyebrow: string; icon: typeof FileText }> = {
  terms: { title: "תנאי שימוש", eyebrow: "SPARK QUALITY · משפטי", icon: FileText },
  privacy: { title: "מדיניות פרטיות", eyebrow: "SPARK QUALITY · משפטי", icon: Shield },
  accessibility: { title: "הצהרת נגישות", eyebrow: "SPARK QUALITY · משפטי", icon: Accessibility },
};

export default function Legal({ kind }: LegalPageProps) {
  const [, navigate] = useLocation();
  const meta = META[kind];
  const Icon = meta.icon;

  return (
    <CinematicShell heroAsset="hero" overlayStrength={92}>
      <div className="container py-14 lg:py-20">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.length > 1 ? window.history.back() : navigate("/")}
            className="mb-6 border-white/25 bg-white/5 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 ml-2" />
            חזרה
          </Button>

          <div className="mb-10 text-center animate-fade-up">
            <GoldEyebrow>{meta.eyebrow}</GoldEyebrow>
            <h1 className="font-display text-3xl lg:text-5xl font-black text-white tracking-tighter mt-3">
              <Icon className="inline h-8 w-8 lg:h-10 lg:w-10 text-gold ml-3 -mt-1" />
              {meta.title}
            </h1>
            <p className="mt-3 text-sm text-white/60">
              עודכן: 6 במאי 2026 · גרסה 1.0
            </p>
          </div>

          <GlassCard className="p-6 lg:p-10">
            <article className="prose prose-invert max-w-none text-white/85 leading-relaxed text-[15px] space-y-5">
              {kind === "terms" && <TermsContent />}
              {kind === "privacy" && <PrivacyContent />}
              {kind === "accessibility" && <AccessibilityContent />}
            </article>
          </GlassCard>

          <p className="text-xs text-white/45 text-center mt-8">
            לשאלות בנוגע למסמך זה ניתן ליצור קשר: legal@spark-ai.co.il
          </p>
        </div>
      </div>
    </CinematicShell>
  );
}

function TermsContent() {
  return (
    <>
      <h2 className="text-xl font-bold text-gold">1. כללי</h2>
      <p>
        ברוכים הבאים ל-SPARK Quality (להלן: "המערכת"), שירות SaaS לניהול בית סוכן ביטוח, מבית חברת SPARK AI
        בע"מ (להלן: "החברה"). השימוש במערכת מותנה בהסכמה לתנאים אלה.
      </p>

      <h2 className="text-xl font-bold text-gold">2. הגדרות</h2>
      <p>
        <strong>"משתמש"</strong> – בית סוכן ביטוח, סוכן עצמאי או עובד מורשה מטעמם המורשים לפעול במערכת. <br />
        <strong>"לקוח קצה"</strong> – מבוטח של בית הסוכן שעל אודותיו נשמר מידע במערכת.
      </p>

      <h2 className="text-xl font-bold text-gold">3. רישיון שימוש</h2>
      <p>
        החברה מעניקה למשתמש רישיון שימוש לא-בלעדי, לא-עביר, להשתמש במערכת בהתאם לחבילה שנרכשה. אסור להעתיק,
        להפיץ, לבצע הנדסה לאחור, או להפוך חלק כלשהו מהמערכת לזמין לצדדים שלישיים שאינם מורשים.
      </p>

      <h2 className="text-xl font-bold text-gold">4. תשלום ומנויים</h2>
      <p>
        השימוש במערכת כרוך בתשלום דמי מנוי לפי התוכנית הנבחרת. התשלום מתבצע מראש.
        ניתן לבטל את המנוי בכל עת, והביטול ייכנס לתוקף בסוף תקופת החיוב הנוכחית.
      </p>

      <h2 className="text-xl font-bold text-gold">5. אחריות וחבות</h2>
      <p>
        המערכת מסופקת AS-IS. החברה אינה אחראית לנזקים עקיפים, אובדן רווחים, או החלטות עסקיות המבוססות על
        ניתוחי AI שמספקת המערכת. סכום החבות המקסימלי שלנו מוגבל לסך התשלומים ששילם המשתמש ב-12 החודשים
        האחרונים.
      </p>

      <h2 className="text-xl font-bold text-gold">6. סיום ההתקשרות</h2>
      <p>
        כל צד רשאי לסיים את ההתקשרות בכל עת. עם סיום, יישמרו הנתונים למשך 90 יום נוספים לצורך גיבוי, ולאחר
        מכן יימחקו לצמיתות.
      </p>

      <h2 className="text-xl font-bold text-gold">7. תיקונים</h2>
      <p>
        החברה רשאית לעדכן תנאים אלה מעת לעת. עדכונים מהותיים יישלחו במייל 30 יום מראש.
      </p>

      <h2 className="text-xl font-bold text-gold">8. דין וסמכות שיפוט</h2>
      <p>
        על תנאים אלה חל הדין הישראלי. סמכות השיפוט הבלעדית נתונה לבתי המשפט במחוז תל-אביב יפו.
      </p>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <h2 className="text-xl font-bold text-gold">1. מבוא</h2>
      <p>
        SPARK AI בע"מ ("אנו") מתחייבים להגן על הפרטיות של המשתמשים והלקוחות שלהם. מסמך זה מתאר אילו נתונים
        אנו אוספים, כיצד אנו משתמשים בהם, ואת הזכויות שלכם, בהתאם ל
        <strong>חוק הגנת הפרטיות, התשמ"א-1981</strong> ולתקנות אבטחת מידע, התשע"ז-2017.
      </p>

      <h2 className="text-xl font-bold text-gold">2. סוגי המידע שנאסף</h2>
      <ul className="list-disc pr-6 space-y-1">
        <li>פרטי המשתמש: שם, אימייל, טלפון, תפקיד.</li>
        <li>פרטי הסוכנות: שם, מספר ח"פ/עוסק, כתובת.</li>
        <li>נתוני הלקוחות (מבוטחים): שם, ת"ז (מוצפנת), פוליסות, תשואות, עמלות.</li>
        <li>לוגים טכניים: כתובת IP, דפדפן, זמני גישה.</li>
      </ul>

      <h2 className="text-xl font-bold text-gold">3. סעיף 13 לחוק - אבטחת מידע ברמה גבוהה</h2>
      <p>
        מערכת SPARK Quality מסווגת כמאגר מידע ברמה גבוהה. אנו מיישמים את כלל החובות:
      </p>
      <ul className="list-disc pr-6 space-y-1">
        <li>הצפנת AES-256 על כל המידע במנוחה ובתעבורה (TLS 1.3).</li>
        <li>בקרת גישה מבוססת תפקידים (RBAC) עם MFA למנהלי מערכת.</li>
        <li>תיעוד גישה (Audit Log) לכל פעולה רגישה למשך 24 חודשים.</li>
        <li>מבדקי חוסן (Penetration Tests) שנתיים על-ידי גורם חיצוני מוסמך.</li>
        <li>גיבוי יומי + תוכנית התאוששות מאסון (DRP) עם RTO של 4 שעות.</li>
      </ul>

      <h2 className="text-xl font-bold text-gold">4. שיתוף מידע</h2>
      <p>
        איננו משתפים מידע אישי עם צדדים שלישיים, למעט:
      </p>
      <ul className="list-disc pr-6 space-y-1">
        <li>ספקי תשתית מורשים (AWS, Cloudflare) הכפופים להסכם DPA.</li>
        <li>חובה חוקית (צו בית משפט, רגולטור).</li>
        <li>בהסכמה מפורשת של המשתמש.</li>
      </ul>

      <h2 className="text-xl font-bold text-gold">5. זכויות המשתמש</h2>
      <p>
        זכותכם לעיין במידע, לבקש תיקון או מחיקה, ולמשוך את הסכמתכם. בקשות יש לשלוח ל-privacy@spark-ai.co.il
        ויטופלו תוך 30 יום.
      </p>

      <h2 className="text-xl font-bold text-gold">6. עוגיות</h2>
      <p>
        אנו משתמשים בעוגיות חיוניות בלבד (סשן התחברות) ועוגיות אנליטיקס אנונימיות. ניתן לחסום אותן בדפדפן.
      </p>

      <h2 className="text-xl font-bold text-gold">7. ילדים</h2>
      <p>השירות אינו מיועד לקטינים מתחת לגיל 18.</p>
    </>
  );
}

function AccessibilityContent() {
  return (
    <>
      <h2 className="text-xl font-bold text-gold">1. מחויבותנו לנגישות</h2>
      <p>
        מערכת SPARK Quality פועלת לעמוד בדרישות
        <strong> תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013</strong>,
        ובתקן הישראלי ת"י 5568 ברמת AA לפי הנחיות WCAG 2.1.
      </p>

      <h2 className="text-xl font-bold text-gold">2. אמצעי הנגישות במערכת</h2>
      <ul className="list-disc pr-6 space-y-1">
        <li>תמיכה מלאה בניווט מקלדת (Tab/Enter/Esc/חצים).</li>
        <li>טקסט אלטרנטיבי לכל התמונות (alt-text).</li>
        <li>ניגודיות צבעים גבוהה (יחס 4.5:1 ומעלה).</li>
        <li>גודל טקסט מתכוונן (תמיכה בזום עד 200% ללא איבוד תוכן).</li>
        <li>תיוג ARIA נכון בכל הפקדים האינטראקטיביים.</li>
        <li>תאימות לקוראי מסך (NVDA, JAWS, VoiceOver).</li>
        <li>אזורי כותרת ברורים (Headings hierarchical).</li>
        <li>הימנעות מאנימציות מהבהבות שעלולות לגרום להתקפים.</li>
      </ul>

      <h2 className="text-xl font-bold text-gold">3. דרכי פנייה לרכז הנגישות</h2>
      <p>
        אם נתקלתם בבעיית נגישות או רוצים להעיר הערה, אנא פנו אל:
      </p>
      <ul className="list-disc pr-6 space-y-1">
        <li>שם: רכזת הנגישות, יפעת איתן</li>
        <li>אימייל: accessibility@spark-ai.co.il</li>
        <li>טלפון: 03-XXXXXXX</li>
        <li>זמן מענה: עד 5 ימי עסקים</li>
      </ul>

      <h2 className="text-xl font-bold text-gold">4. החרגות</h2>
      <p>
        חלק ממסמכי PDF ישנים שהועלו ע"י משתמשים עשויים שלא להיות נגישים מלאים. אנו עובדים על המרתם.
      </p>

      <h2 className="text-xl font-bold text-gold">5. עדכון אחרון</h2>
      <p>הצהרה זו עודכנה לאחרונה ב-6 במאי 2026.</p>
    </>
  );
}
