// CinematicShell — שכבת עיצוב משותפת בסגנון הדמו לכל מסכי ה-SaaS
// כוללת: רקע נייבי עמוק, תמונת hero אופציונלית, חלקיקי זהב, vignette, grain
// + תפריט צד בנייד דרך כפתור Hamburger
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Upload as UploadIcon,
  UserCog,
  ListChecks,
  LogOut,
  Sparkles,
  ShieldCheck,
  Menu,
  X,
  Globe,
  Film,
  Briefcase,
} from "lucide-react";
import { LOGO, ASSETS } from "@/lib/demoData";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { AccessGuard } from "./AccessGuard";

interface CinematicShellProps {
  children: ReactNode;
  /** האם להציג את התמונה הסינמטית ברקע (ברירת מחדל: כן) */
  showHero?: boolean;
  /** איזה asset של hero להציג */
  heroAsset?: "hero" | "summary" | "brain";
  /** האם להציג חלקיקי זהב מאנימציה */
  showParticles?: boolean;
  /** האם להציג header עם הלוגו וקישורי הניווט (ברירת מחדל: כן) */
  showHeader?: boolean;
  /** האם להציג סייד-בר ניווט שמאלי (false עבור Landing) */
  showSidebar?: boolean;
  /** טקסט eyebrow מעל התוכן */
  eyebrow?: string;
  /** עוצמת ה-overlay על תמונת ה-hero (0-100, ברירת מחדל 80) */
  overlayStrength?: number;
}

const HERO_MAP: Record<NonNullable<CinematicShellProps["heroAsset"]>, string> = {
  hero: ASSETS.hero,
  summary: ASSETS.summary,
  brain: ASSETS.brain,
};

export function CinematicShell({
  children,
  showHero = true,
  heroAsset = "hero",
  showParticles = true,
  showHeader = true,
  showSidebar = false,
  overlayStrength = 80,
}: CinematicShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  // סוגרים אוטומטית כשעוברים מסך
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // נועלים גלילה כש-drawer פתוח
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const particles = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 1 + Math.random() * 2.5,
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 4,
        opacity: 0.25 + Math.random() * 0.45,
      })),
    []
  );

  const overlayPct = Math.max(0, Math.min(100, overlayStrength)) / 100;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#06101F] text-white">
      {/* Hero image background */}
      {showHero && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img
            src={HERO_MAP[heroAsset]}
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
          {/* Cinematic gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, rgba(6,16,31,${overlayPct * 0.55}) 0%, rgba(6,16,31,${overlayPct * 0.85}) 60%, rgba(6,16,31,${Math.min(overlayPct + 0.05, 1)}) 100%)`,
            }}
          />
          {/* Side vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, transparent 35%, rgba(6,16,31,0.7) 100%)",
            }}
          />
          {/* Grain */}
          <div
            className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
            }}
          />
        </div>
      )}

      {/* Animated golden particles */}
      {showParticles && (
        <div className="fixed inset-0 z-[1] pointer-events-none">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full bg-gold animate-pulse"
              style={{
                top: `${p.top}%`,
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                opacity: p.opacity,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                boxShadow: "0 0 12px rgba(201, 169, 97, 0.7)",
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      {showHeader && (
        <CinematicHeader
          showMenuButton={showSidebar}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
      )}

      {/* Mobile drawer */}
      {showSidebar && (
        <MobileSidebarDrawer
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main layout */}
      <div className="relative z-10 flex">
        {showSidebar && <CinematicSidebar />}
        <main className="flex-1 min-w-0">
          {showSidebar ? <AccessGuard>{children}</AccessGuard> : children}
        </main>
      </div>
    </div>
  );
}

/** Header זהה לזה של הדמו: לוגו SPARK AI מימין, אינדיקטור LIVE משמאל */
export function CinematicHeader({
  showMenuButton = false,
  onMenuClick,
}: {
  showMenuButton?: boolean;
  onMenuClick?: () => void;
}) {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="relative z-20 border-b border-white/10 bg-[#06101F]/85 backdrop-blur-md">
      <div className="container">
        <div className="flex h-16 sm:h-20 lg:h-24 items-center justify-between gap-3 sm:gap-6">
          {/* Right (RTL primary) - SPARK AI logo */}
          <Link
            href="/"
            className="group flex items-center gap-3 transition-transform duration-300 hover:scale-[1.03] shrink-0"
            aria-label="חזרה לדף הבית"
          >
            <img
              src={LOGO.clear}
              alt="SPARK AI"
              className="h-10 sm:h-14 lg:h-20 w-auto object-contain"
              style={{ filter: "drop-shadow(0 2px 12px rgba(201,169,97,0.55)) brightness(1.1)" }}
            />
          </Link>

          {/* CENTER — unified 3-zone navigation (Site / Demo / Product) */}
          <TopZoneNav />

          {/* Left - user state + mobile menu (dedicated demo link removed; the central TopZoneNav exposes "דמו") */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && user ? (
              <>
                <div className="hidden md:flex flex-col items-end leading-tight">
                  <span className="font-display text-sm font-semibold text-white">
                    {user.name}
                  </span>
                  <span className="text-[10px] tracking-[0.25em] uppercase text-gold/70">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={() => logout()}
                  className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition-all hover:bg-white/10 hover:text-white"
                  aria-label="יציאה"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  יציאה
                </button>
              </>
            ) : null}

            {/* Hamburger button — מובייל בלבד, רק במסכים שיש להם sidebar */}
            {showMenuButton && (
              <button
                type="button"
                onClick={onMenuClick}
                className="lg:hidden flex items-center justify-center h-10 w-10 rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10 transition-colors"
                aria-label="פתיחת תפריט"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="h-px bg-gradient-to-l from-transparent via-gold/60 to-transparent" />
    </header>
  );
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "דשבורד", icon: LayoutDashboard, superAdminOnly: false },
  { href: "/tasks", label: "המשימות שלי", icon: ListChecks, superAdminOnly: false },
  { href: "/clients", label: "לקוחות", icon: Users, superAdminOnly: false },
  { href: "/upload", label: "העלאת דוח", icon: UploadIcon, superAdminOnly: false },
  { href: "/team", label: "צוות", icon: UserCog, superAdminOnly: false },
  { href: "/admin", label: "מנהל מערכת", icon: ShieldCheck, superAdminOnly: true },
] as const;

/**
 * TopZoneNav — 3-zone unified navigation: Site (אתר) / Demo (דמו) / Product (מערכת)
 * Highlights the active zone in gold so users always know where they are.
 * Hidden when only the user landing area is appropriate (logo still leads home).
 */
export function TopZoneNav() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();

  // Hide the Demo zone for paying users (active/grace); keep it for visitors and unpaid logged-in users.
  const accessQuery = trpc.billing.myAccessStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const hideDemoForPayingUser =
    isAuthenticated &&
    !!accessQuery.data &&
    (accessQuery.data.status === "active" || accessQuery.data.status === "grace");

  // Determine current zone
  const isProductZone =
    location.startsWith("/dashboard") ||
    location.startsWith("/tasks") ||
    location.startsWith("/clients") ||
    location.startsWith("/upload") ||
    location.startsWith("/team") ||
    location.startsWith("/admin") ||
    location.startsWith("/onboarding") ||
    location.startsWith("/billing");
  const isDemoZone = location.startsWith("/demo");
  const isSiteZone = !isProductZone && !isDemoZone;

  const productHref = isAuthenticated ? "/dashboard" : getLoginUrl();
  // משתמש מחובר לוחץ על "אתר" מקבל דגל למנוע מה-redirect האוטומטי ל-/dashboard.
  const siteHref = isAuthenticated ? "/?view=site" : "/";

  const zones = [
    { href: siteHref, label: "אתר", icon: Globe, active: isSiteZone },
    ...(hideDemoForPayingUser
      ? []
      : [{ href: "/demo", label: "דמו", icon: Film, active: isDemoZone }]),
    { href: productHref, label: "מערכת", icon: Briefcase, active: isProductZone },
  ];

  return (
    <nav
      className="hidden md:flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md px-1.5 py-1.5"
      aria-label="ניווט ראשי"
    >
      {zones.map((z) => {
        const Icon = z.icon;
        const isExternal = z.href.startsWith("http");
        const className = `group flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-wider transition-all ${
          z.active
            ? "bg-gold/15 border border-gold/50 text-gold shadow-[0_0_18px_rgba(201,169,97,0.25)]"
            : "border border-transparent text-white/70 hover:text-white hover:bg-white/5"
        }`;
        if (isExternal) {
          return (
            <a
              key={z.href}
              href={z.href}
              className={className}
              aria-current={z.active ? "page" : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{z.label}</span>
            </a>
          );
        }
        return (
          <Link
            key={z.href}
            href={z.href}
            className={className}
            aria-current={z.active ? "page" : undefined}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{z.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** סייד-בר ניווט בסגנון הדמו: רקע שקוף-נייבי, גבולות זהב, אקטיבי בזהב */
export function CinematicSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin;
  const visibleItems = NAV_ITEMS.filter((i) => !i.superAdminOnly || isSuperAdmin);
  return (
    <aside className="hidden lg:block sticky top-0 h-[calc(100vh)] w-64 shrink-0 border-l border-white/10 bg-[#06101F]/40 backdrop-blur-md p-6">
      <nav className="flex flex-col gap-2 mt-4">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-all ${
                active
                  ? "bg-gold/15 border border-gold/40 text-gold shadow-[0_0_20px_rgba(201,169,97,0.15)]"
                  : "border border-transparent text-white/70 hover:bg-white/5 hover:text-white hover:border-white/10"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

/** Drawer לתפריט הצדדי בנייד — נשלף מימין (RTL) */
function MobileSidebarDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const isSuperAdmin = !!user?.isSuperAdmin;
  const visibleItems = NAV_ITEMS.filter((i) => !i.superAdminOnly || isSuperAdmin);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`lg:hidden fixed top-0 right-0 z-50 h-screen w-72 max-w-[85vw] bg-[#06101F] border-l border-gold/30 shadow-[0_0_60px_rgba(201,169,97,0.15)] transform transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="תפריט ניווט"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
            <span className="font-display text-base text-gold tracking-wider">תפריט</span>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center h-9 w-9 rounded-md border border-white/15 bg-white/5 text-white/80 hover:bg-white/10 transition-colors"
              aria-label="סגירת תפריט"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {user && (
            <div className="px-5 py-4 border-b border-white/10">
              <div className="text-sm font-semibold text-white">{user.name}</div>
              <div className="text-xs text-gold/70 tracking-wider">{user.email}</div>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active =
                location === item.href || location.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-all min-h-[48px] ${
                    active
                      ? "bg-gold/15 border border-gold/40 text-gold shadow-[0_0_20px_rgba(201,169,97,0.15)]"
                      : "border border-transparent text-white/80 hover:bg-white/5 hover:text-white hover:border-white/10"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {user?.role === "admin" && (
            <div className="px-4 pb-2">
              <Link
                href="/demo"
                onClick={onClose}
                className="flex items-center justify-center gap-2 rounded-md border border-gold/40 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold hover:bg-gold/20 transition-colors min-h-[48px]"
              >
                <Sparkles className="h-4 w-4" />
                דמו הדרכה
              </Link>
            </div>
          )}

          <div className="p-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors min-h-[48px]"
            >
              <LogOut className="h-4 w-4" />
              יציאה
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/** כרטיס "glass" בסגנון הדמו — רקע שקוף, גבול דק לבן, פינה זהובה */
export function GlassCard({
  children,
  className = "",
  goldAccent = false,
}: {
  children: ReactNode;
  className?: string;
  goldAccent?: boolean;
}) {
  return (
    <div
      className={`relative rounded-lg backdrop-blur-md transition-all ${
        goldAccent
          ? "bg-white/5 border border-gold/30 shadow-[0_8px_32px_rgba(201,169,97,0.15)]"
          : "bg-white/5 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/** Eyebrow קטן עם קו זהוב ותווית — כמו בדמו */
export function GoldEyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px w-12 bg-gold" />
      <span className="text-[11px] tracking-[0.35em] uppercase text-gold font-medium">
        {children}
      </span>
    </div>
  );
}
