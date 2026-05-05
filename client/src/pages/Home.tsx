// SPARK AI · Landing Page - דף נחיתה שיווקי
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import {
  ArrowLeft,
  BarChart3,
  Check,
  FileSpreadsheet,
  Lock,
  Play,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  const goToApp = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    if (!user?.workspaceId) {
      window.location.href = "/onboarding";
      return;
    }
    window.location.href = "/dashboard";
  };

  return (
    <div
      className="min-h-screen bg-navy-deep text-white"
      style={{ direction: "rtl" }}
    >
      {/* Navigation */}
      <nav className="border-b border-white/10 sticky top-0 z-50 bg-navy-deep/95 backdrop-blur-md">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-gold" />
            <span className="font-serif text-xl text-gold">SPARK AI</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/demo">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-gold hover:bg-white/5"
              >
                <Play className="h-4 w-4 ml-1.5" />
                צפייה בדמו
              </Button>
            </Link>
            {isAuthenticated ? (
              <Button
                onClick={goToApp}
                className="bg-gold text-navy-deep hover:bg-gold/90"
              >
                לאזור האישי
              </Button>
            ) : (
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                className="bg-gold text-navy-deep hover:bg-gold/90"
              >
                כניסה / הרשמה
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container mx-auto py-20 lg:py-28 text-center max-w-4xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/5 text-gold text-xs tracking-widest mb-6 uppercase">
          <Sparkles className="h-3 w-3" />
          AI לסוכני ביטוח · השקה ראשונה לבתי סוכן בישראל
        </div>
        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-white leading-tight mb-6">
          הסוכן שלך,{" "}
          <span className="text-gold">משוחרר מהעבודה הרפטטיבית</span>
        </h1>
        <p className="text-xl text-white/70 leading-relaxed mb-10 max-w-2xl mx-auto">
          העלאת דוח שורנס, ניתוח ב-AI תוך שניות, וזיהוי אוטומטי של הזדמנויות
          שימור, צ'ק-אפים, ופוליסות שמתחדשות. בלי קוד. בלי גוגל-שיטס. בלי
          הקלדות חוזרות.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button
            size="lg"
            onClick={goToApp}
            className="bg-gold text-navy-deep hover:bg-gold/90 text-base px-8"
          >
            התחילו 14 ימי ניסיון בחינם
            <ArrowLeft className="h-5 w-5 mr-2" />
          </Button>
          <Link href="/demo">
            <Button
              size="lg"
              variant="outline"
              className="border-gold/50 text-gold hover:bg-gold/10 text-base px-8"
            >
              <Play className="h-4 w-4 ml-2" />
              צפייה בדמו אינטראקטיבי
            </Button>
          </Link>
        </div>
        <p className="text-sm text-white/40 mt-6">
          ללא כרטיס אשראי · הקמה תוך 60 שניות · ביטול בקליק
        </p>
      </section>

      {/* Features */}
      <section className="container mx-auto py-16 max-w-6xl">
        <div className="text-center mb-14">
          <span className="text-gold text-xs tracking-[0.3em] uppercase mb-3 block">
            יכולות מרכזיות
          </span>
          <h2 className="font-serif text-4xl text-white">
            כל מה שסוכן צריך, במקום אחד
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: FileSpreadsheet,
              title: "ניתוח אוטומטי של דוח שורנס",
              desc: "העלאת קובץ אקסל אחד והמערכת מפיקה לקוחות, פוליסות, AUM, פרמיות וצבירה — ללא הקלדה ידנית.",
            },
            {
              icon: BarChart3,
              title: "דגלי פעולה חכמים",
              desc: "המערכת מזהה אוטומטית: לקוחות בלי פנסיה, ריסק זמני שמסתיים, חוסר במייל, פוליסות שמתחדשות.",
            },
            {
              icon: Users,
              title: "צוות סוכנים מסונכרן",
              desc: "בית סוכן? פתחו workspace, הזמינו את הצוות. כל סוכן רואה רק את הלקוחות שלו, מנהל רואה הכל.",
            },
            {
              icon: Zap,
              title: "אוטומציה של פעולות שימור",
              desc: "ניסוח מיילים, הצעות פגישה, מסעות SMS — הכל מותאם ללקוח, מוכן ליציאה בקליק.",
            },
            {
              icon: Lock,
              title: "אבטחה ופרטיות מלאה",
              desc: "הצפנה מקצה לקצה, שרתים אזוריים, בידוד נתונים מלא בין סוכנים. תואם תיקון 13 לחוק הגנת הפרטיות.",
            },
            {
              icon: Sparkles,
              title: "AI שמבין ביטוח",
              desc: "המודל מאומן על המינוח הענפי הישראלי: מסלקה, תום הנחה, נסיעות, ריסק, פנסיה, גמל. תוצאות מדויקות.",
            },
          ].map((f, i) => (
            <Card
              key={i}
              className="p-6 bg-white/5 border-white/10 hover:border-gold/30 transition-all"
            >
              <div className="w-11 h-11 rounded-lg bg-gold/10 text-gold flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-xl text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto py-16 max-w-5xl">
        <div className="text-center mb-12">
          <span className="text-gold text-xs tracking-[0.3em] uppercase mb-3 block">
            איך זה עובד
          </span>
          <h2 className="font-serif text-4xl text-white mb-3">
            מ-0 לתובנות תוך 60 שניות
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "01", t: "פתחו workspace", d: "ללא כרטיס אשראי. סוכן עצמאי או בית סוכן שלם." },
            { n: "02", t: "העלו דוח שורנס", d: "קובץ אקסל אחד. אנחנו מזהים גליונות, מטמיעים לקוחות ופוליסות אוטומטית." },
            { n: "03", t: "פעלו על התובנות", d: "דשבורד עם דגלי פעולה, רשימות שימור והזדמנויות cross-sell." },
          ].map(s => (
            <div key={s.n} className="text-center">
              <div className="font-serif text-5xl text-gold/50 mb-2">{s.n}</div>
              <h3 className="font-serif text-xl text-white mb-2">{s.t}</h3>
              <p className="text-sm text-white/60">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section
        className="container mx-auto py-16 max-w-5xl"
        id="pricing"
      >
        <div className="text-center mb-12">
          <span className="text-gold text-xs tracking-[0.3em] uppercase mb-3 block">
            תמחור פשוט
          </span>
          <h2 className="font-serif text-4xl text-white mb-3">
            תוכנית לכל גודל של בית סוכן
          </h2>
          <p className="text-white/60">
            כל החבילות מתחילות ב-14 ימי ניסיון חינם. ללא כרטיס.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: "Basic",
              price: "150",
              ann: "₪1,620 שנתי (חיסכון 10%)",
              tag: "סוכן עצמאי",
              feats: [
                "עד 500 לקוחות",
                "ניתוח אוטומטי של דוחות",
                "דגלי פעולה בסיסיים",
                "תמיכה במייל",
              ],
              highlight: false,
            },
            {
              name: "Premium",
              price: "350",
              ann: "₪3,780 שנתי (חיסכון 10%)",
              tag: "המומלץ ביותר",
              feats: [
                "לקוחות ללא הגבלה",
                "צוות עד 5 סוכנים",
                "AI לניסוח מיילים",
                "מסעות שימור אוטומטיים",
                "תמיכה טלפונית",
              ],
              highlight: true,
            },
            {
              name: "Enterprise",
              price: "צור קשר",
              ann: "מותאם אישית",
              tag: "בית סוכן גדול",
              feats: [
                "צוות ללא הגבלה",
                "אינטגרציה ל-API שורנס",
                "Branding מותאם",
                "DPA + Compliance",
                "מנהל לקוח ייעודי",
              ],
              highlight: false,
            },
          ].map(p => (
            <Card
              key={p.name}
              className={`p-6 relative ${
                p.highlight
                  ? "bg-gradient-to-b from-gold/10 to-transparent border-gold/40"
                  : "bg-white/5 border-white/10"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 right-1/2 translate-x-1/2 px-3 py-1 bg-gold text-navy-deep text-xs font-medium rounded-full">
                  המומלץ
                </div>
              )}
              <div className="text-xs text-gold/80 mb-2 tracking-wider uppercase">
                {p.tag}
              </div>
              <h3 className="font-serif text-2xl text-white mb-3">{p.name}</h3>
              <div className="mb-4">
                {p.price === "צור קשר" ? (
                  <div className="font-serif text-3xl text-gold">{p.price}</div>
                ) : (
                  <>
                    <span className="font-serif text-4xl text-gold">
                      ₪{p.price}
                    </span>
                    <span className="text-sm text-white/50">/חודש</span>
                  </>
                )}
                <div className="text-xs text-white/40 mt-1">{p.ann}</div>
              </div>
              <ul className="space-y-2 mb-6">
                {p.feats.map(f => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-white/70"
                  >
                    <Check className="h-4 w-4 text-gold mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={goToApp}
                className={`w-full ${
                  p.highlight
                    ? "bg-gold text-navy-deep hover:bg-gold/90"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {p.price === "צור קשר" ? "דברו איתנו" : "התחלת ניסיון"}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto py-20 max-w-3xl text-center">
        <h2 className="font-serif text-4xl md:text-5xl text-white mb-4">
          מוכנים להפסיק לעבוד פעמיים?
        </h2>
        <p className="text-white/70 text-lg mb-8">
          הצטרפו לבתי סוכן שכבר מטמיעים AI בעבודה השוטפת
        </p>
        <Button
          size="lg"
          onClick={goToApp}
          className="bg-gold text-navy-deep hover:bg-gold/90 text-base px-10 py-6"
        >
          התחילו את 14 ימי הניסיון
          <ArrowLeft className="h-5 w-5 mr-2" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Sparkles className="h-4 w-4 text-gold/70" />
            <span>SPARK AI · Sprinkle AI Magic Into Your Business</span>
          </div>
          <div className="text-xs text-white/40">
            © 2026 SPARK AI · כל הזכויות שמורות
          </div>
        </div>
      </footer>
    </div>
  );
}
