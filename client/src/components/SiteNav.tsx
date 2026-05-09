// SiteNav — סרגל ניווט עליון של ה-mini-site הציבורי (Home)
// תכונות: sticky, RTL, רספונסיבי (תפריט המבורגר במובייל), שני כפתורי CTA קבועים,
// scroll-spy פשוט שמדגיש את הלשונית הפעילה לפי ה-section שגלוי.
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Menu, X, Play, LogIn, Sparkles } from "lucide-react";
import { LOGO } from "@/lib/demoData";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { TopZoneNav } from "@/components/CinematicShell";

interface NavSection {
  id: string;
  label: string;
}

const SECTIONS: NavSection[] = [
  { id: "hero", label: "בית" },
  { id: "how", label: "איך זה עובד" },
  { id: "categories", label: "קטגוריות" },
  { id: "security", label: "אבטחה" },
  { id: "pricing", label: "תמחור" },
  { id: "team", label: "צוות" },
  { id: "contact", label: "צור קשר" },
];

interface SiteNavProps {
  /** Anchor IDs that exist on the current page (subset of SECTIONS).
   *  When a section is missing we render its label as a link to /#id so it still works
   *  from non-Home pages (e.g. /pricing). */
  available?: string[];
}

export function SiteNav({ available }: SiteNavProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("hero");
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, user } = useAuth();

  // Track scroll for shadow + transparency variant
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Simple scroll-spy: highlight the section closest to top
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ids = (available ?? SECTIONS.map(s => s.id));
    const onScroll = () => {
      let current = ids[0] ?? "hero";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top - 120 <= 0) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [available]);

  const handleNav = (id: string) => (e: React.MouseEvent) => {
    setOpen(false);
    // If section not on this page, fall back to /#id navigation (default <a> behavior)
    const el = document.getElementById(id);
    if (!el) return; // let browser handle href "/#id"
    e.preventDefault();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  const loginHref = getLoginUrl();
  const accountHref = isAuthenticated && user ? "/dashboard" : loginHref;
  const accountLabel = isAuthenticated && user ? "לאזור האישי" : "כניסה למערכת";

  return (
    <header
      dir="rtl"
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#06101F]/85 backdrop-blur-md border-b border-gold/20 shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <nav className="container flex items-center justify-between gap-4 py-3">
        {/* Logo + brand */}
        <a
          href="#hero"
          onClick={handleNav("hero")}
          className="flex items-center gap-2 flex-shrink-0"
          aria-label="SPARK AI — דף הבית"
        >
          <img src={LOGO.clear} alt="SPARK AI" className="h-9 w-auto" />
        </a>
        {/* 3-zone unified nav (Site / Demo / Product) */}
        <TopZoneNav />

        {/* Desktop tabs */}
        <ul className="hidden lg:flex items-center gap-1 mx-auto">
          {SECTIONS.map(section => {
            const onPage = (available ?? SECTIONS.map(s => s.id)).includes(section.id);
            const href = onPage ? `#${section.id}` : `/#${section.id}`;
            const isActive = active === section.id;
            return (
              <li key={section.id}>
                <a
                  href={href}
                  onClick={handleNav(section.id)}
                  className={`relative px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "text-gold"
                      : "text-white/75 hover:text-white"
                  }`}
                >
                  {section.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-gold rounded-full" />
                  )}
                </a>
              </li>
            );
          })}
        </ul>

        {/* CTAs (desktop) */}
        <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 rounded-md border border-gold/40 bg-transparent px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold hover:text-[#06101F] transition-colors"
          >
            <Play className="h-3.5 w-3.5" />
            לדמו האינטראקטיבי
          </Link>
          <a
            href={accountHref}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-l from-gold to-[#F4D87C] px-3 py-1.5 text-xs font-bold text-[#06101F] shadow-md shadow-gold/30 hover:shadow-gold/50 transition-shadow"
          >
            {isAuthenticated ? <Sparkles className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
            {accountLabel}
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-white/10"
          aria-label={open ? "סגור תפריט" : "פתח תפריט"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden border-t border-gold/20 bg-[#06101F]/95 backdrop-blur-md">
          <ul className="container py-3 flex flex-col gap-1">
            {SECTIONS.map(section => {
              const onPage = (available ?? SECTIONS.map(s => s.id)).includes(section.id);
              const href = onPage ? `#${section.id}` : `/#${section.id}`;
              const isActive = active === section.id;
              return (
                <li key={section.id}>
                  <a
                    href={href}
                    onClick={handleNav(section.id)}
                    className={`block px-3 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? "bg-gold/10 text-gold"
                        : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    {section.label}
                  </a>
                </li>
              );
            })}
            <li className="pt-2 mt-2 border-t border-white/10 flex flex-col gap-2">
              <Link
                href="/demo"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-gold/40 px-3 py-2 text-sm font-bold text-gold hover:bg-gold hover:text-[#06101F] transition-colors"
              >
                <Play className="h-4 w-4" />
                לדמו האינטראקטיבי
              </Link>
              <a
                href={accountHref}
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-l from-gold to-[#F4D87C] px-3 py-2 text-sm font-bold text-[#06101F]"
              >
                {isAuthenticated ? <Sparkles className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                {accountLabel}
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
