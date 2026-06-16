// SPARK AI · Clients — תיק לקוחות בסגנון הסינמטי של הדמו
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { trpc } from "@/lib/trpc";
import {
  Crown,
  Loader2,
  Mail,
  Phone,
  Search,
  User,
  Users,
  Upload,
  Sparkles,
  Wallet,
  TrendingUp,
  Shield,
  FileWarning,
  PlayCircle,
  CheckSquare,
  Square,
  Mail as MailIcon,
  CalendarClock,
} from "lucide-react";
import { CategoryScenarioModal } from "@/components/CategoryScenarioModal";
import { BulkEmailModal } from "@/components/BulkEmailModal";
import { SequenceModal } from "@/components/SequenceModal";
import { TableToolbar, type ExportColumn } from "@/components/TableToolbar";
import {
  ClientDetailDrawer,
  type ClientDetailRow,
} from "@/components/ClientDetailDrawer";

type FlagKind = "all" | "vip" | "liquid_fund" | "tikun_190" | "high_fees" | "risk_ending" | "coverage_gaps";

const FLAG_META: Record<
  Exclude<FlagKind, "all" | "vip">,
  { label: string; icon: typeof Sparkles; color: string }
> = {
  liquid_fund: { label: "השתלמות נזילה", icon: Sparkles, color: "emerald" },
  tikun_190: { label: "תיקון 190", icon: Wallet, color: "sky" },
  high_fees: { label: "דמי ניהול גבוהים", icon: TrendingUp, color: "amber" },
  risk_ending: { label: "ריסק מסתיים", icon: Shield, color: "rose" },
  coverage_gaps: { label: "חוסרי כיסוי", icon: FileWarning, color: "orange" },
};

type DashboardCategory = "vip" | "liquidFund" | "190" | "highFees" | "risk" | "coverageGaps";
const FLAG_TO_CATEGORY: Record<Exclude<FlagKind, "all">, DashboardCategory> = {
  vip: "vip",
  liquid_fund: "liquidFund",
  tikun_190: "190",
  high_fees: "highFees",
  risk_ending: "risk",
  coverage_gaps: "coverageGaps",
};
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

export default function Clients() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FlagKind>("all");

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/", { replace: true });
  }, [loading, isAuthenticated, navigate]);

  const clientsQuery = trpc.clients.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  // Round 98 — export-lock: query subscription status so the toolbar can disable
  // export buttons (and surface the reason) when the workspace isn't on an
  // active paying subscription.
  const exportStatusQuery = trpc.exports.status.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const filtered = useMemo(() => {
    let list = clientsQuery.data ?? [];
    if (activeFilter === "vip") list = list.filter((c) => c.isVip);
    else if (activeFilter !== "all") {
      list = list.filter(
        (c) => (c as { flagStatus?: string }).flagStatus === activeFilter
      );
    }
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.fullName?.toLowerCase().includes(q) ||
        c.idNumber.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [clientsQuery.data, search, activeFilter]);

  const counts = useMemo(() => {
    const list = clientsQuery.data ?? [];
    const flagOf = (c: unknown) =>
      (c as { flagStatus?: string }).flagStatus ?? "regular";
    return {
      vip: list.filter((c) => c.isVip).length,
      liquid_fund: list.filter((c) => flagOf(c) === "liquid_fund").length,
      tikun_190: list.filter((c) => flagOf(c) === "tikun_190").length,
      high_fees: list.filter((c) => flagOf(c) === "high_fees").length,
      risk_ending: list.filter((c) => flagOf(c) === "risk_ending").length,
      coverage_gaps: list.filter((c) => flagOf(c) === "coverage_gaps").length,
    };
  }, [clientsQuery.data]);

  const [flowCategory, setFlowCategory] = useState<DashboardCategory | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientDetailRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [seqOpen, setSeqOpen] = useState(false);

  const toggleSelected = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exportColumns: ExportColumn<(typeof filtered)[number]>[] = useMemo(
    () => [
      { key: "fullName", label: "שם", format: (v) => (v ? String(v) : "-") },
      { key: "idNumber", label: "ת\"ז" },
      { key: "email", label: "מייל", format: (v) => (v ? String(v) : "") },
      { key: "phone", label: "טלפון", format: (v) => (v ? String(v) : "") },
      {
        key: "isVip",
        label: "VIP",
        format: (v) => (v ? "כן" : "לא"),
      },
      {
        key: "flagStatus",
        label: "דגל",
        format: (v) => {
          const meta = v && v !== "regular" ? FLAG_META[v as keyof typeof FLAG_META] : null;
          return meta?.label ?? "רגיל";
        },
      },
      {
        key: "totalBalance",
        label: "צבירה",
        format: (v) => Number(v ?? 0),
      },
      { key: "notes", label: "הערות", format: (v) => (v ? String(v) : "") },
      {
        key: "createdAt",
        label: "נוסף בתאריך",
        format: (v) => (v ? new Date(v as string).toLocaleDateString("he-IL") : ""),
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06101F]">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  const totalCount = clientsQuery.data?.length ?? 0;

  return (
    <CinematicShell heroAsset="hero" overlayStrength={90} showSidebar>
      <div className="container py-6 sm:py-10 lg:py-14">
        {/* Page header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-10 animate-fade-up">
          <div>
            <GoldEyebrow>תיק לקוחות</GoldEyebrow>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-[1.1]">
              <span className="text-gold mono-num">
                {totalCount.toLocaleString("he-IL")}
              </span>{" "}
              לקוחות
            </h1>
            <p className="mt-3 text-sm lg:text-base text-white/65 leading-relaxed">
              {user?.workspaceRole === "agent"
                ? "מציג רק את הלקוחות שלכם — בידוד מלא בתוך הסוכנות."
                : "מציג את כל לקוחות הסוכנות — כתפקיד מנהל יש לכם גישה מלאה."}
            </p>
          </div>
          <Link href="/upload">
            <Button className="bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/30 font-bold">
              <Upload className="h-4 w-4 ml-2" />
              העלאת דוח חדש
            </Button>
          </Link>
        </div>

        {/* Search bar + VIP filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <GlassCard className="p-2 flex-1">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
              <Input
                placeholder="חיפוש לפי שם, ת.ז, מייל או טלפון…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-12 bg-transparent border-0 text-white placeholder:text-white/35 h-12 text-base focus-visible:ring-0"
              />
            </div>
          </GlassCard>
        </div>

        {/* Filter chips: All / VIP / financial flags - scrolls horizontally on mobile */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap snap-x scrollbar-thin">
          {(
            [
              { key: "all" as const, label: "הכל", icon: Users, count: clientsQuery.data?.length ?? 0 },
              { key: "vip" as const, label: "VIP", icon: Crown, count: counts.vip },
              { key: "liquid_fund" as const, label: "השתלמות נזילה", icon: Sparkles, count: counts.liquid_fund },
              { key: "tikun_190" as const, label: "תיקון 190", icon: Wallet, count: counts.tikun_190 },
              { key: "high_fees" as const, label: "דמי ניהול גבוהים", icon: TrendingUp, count: counts.high_fees },
              { key: "risk_ending" as const, label: "ריסק מסתיים", icon: Shield, count: counts.risk_ending },
              { key: "coverage_gaps" as const, label: "חוסרי כיסוי", icon: FileWarning, count: counts.coverage_gaps },
            ]
          ).map(({ key, label, icon: Icon, count }) => {
            const active = activeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`flex items-center gap-2 rounded-md px-3.5 h-10 text-xs font-semibold transition-all border shrink-0 snap-start ${
                  active
                    ? "bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] border-gold shadow-md shadow-gold/30"
                    : "bg-white/[0.03] text-white/75 border-white/15 hover:bg-white/[0.06] hover:border-gold/40 hover:text-gold"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span
                  className={`mono-num text-[10px] px-1.5 py-0.5 rounded-full ${
                    active ? "bg-[#06101F]/20" : "bg-white/10"
                  }`}
                >
                  {count.toLocaleString("he-IL")}
                </span>
              </button>
            );
          })}
        </div>

        {/* Flowchart trigger - visible when a category is active */}
        {activeFilter !== "all" && (
          <div className="mb-6">
            <button
              onClick={() => setFlowCategory(FLAG_TO_CATEGORY[activeFilter])}
              className="w-full group rounded-lg border border-gold/30 bg-gradient-to-l from-gold/10 via-gold/5 to-transparent hover:from-gold/20 hover:border-gold/60 transition-all p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 text-right">
                <div className="h-10 w-10 rounded-md bg-gold/20 border border-gold/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PlayCircle className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">ראו תרשים זרימה אינטראקטיבי</div>
                  <div className="text-xs text-white/55">צפו בתרשים הזרימה של התהליך האוטומטי לקטגוריה זו</div>
                </div>
              </div>
              <span className="text-xs font-bold text-gold whitespace-nowrap">לצפיה ←</span>
            </button>
          </div>
        )}

        <CategoryScenarioModal
          categoryId={flowCategory}
          onClose={() => setFlowCategory(null)}
          onActivate={() => setFlowCategory(null)}
        />

        {/* Refresh + Export toolbar */}
        <TableToolbar
          rows={filtered}
          columns={exportColumns}
          fileName={`spark-clients-${new Date().toISOString().slice(0, 10)}`}
          reportTitle="דוח לקוחות · SPARK AI"
          summaryLabel={`מציג ${filtered.length.toLocaleString("he-IL")} מתוך ${(clientsQuery.data?.length ?? 0).toLocaleString("he-IL")} לקוחות`}
          onRefresh={() => clientsQuery.refetch()}
          isRefreshing={clientsQuery.isRefetching}
          exportEnabled={exportStatusQuery.data?.allowed ?? false}
          exportLockReason={exportStatusQuery.data?.reason ?? undefined}
        />

        <ClientDetailDrawer
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />

        {/* Bulk selection bar */}
        {selectedIds.size > 0 && (
          <div className="sticky top-2 z-20 mb-4 flex items-center justify-between gap-3 rounded-lg border border-gold/40 bg-[#0E1C35]/95 backdrop-blur px-4 py-3 shadow-lg shadow-gold/10">
            <span className="text-sm font-bold text-white">
              נבחרו <span className="text-gold mono-num">{selectedIds.size.toLocaleString("he-IL")}</span> לקוחות
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                נקה בחירה
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSeqOpen(true)}>
                <CalendarClock className="h-4 w-4 ml-1" /> רצף מעקב
              </Button>
              <Button size="sm" onClick={() => setBulkOpen(true)}>
                <MailIcon className="h-4 w-4 ml-1" /> שליחת מייל מרוכז
              </Button>
            </div>
          </div>
        )}

        <BulkEmailModal
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          clientIds={Array.from(selectedIds)}
          onSent={() => setSelectedIds(new Set())}
        />

        <SequenceModal
          open={seqOpen}
          onOpenChange={setSeqOpen}
          clientIds={Array.from(selectedIds)}
          onEnrolled={() => setSelectedIds(new Set())}
        />

        {/* Body */}
        {clientsQuery.isLoading ? (
          <GlassCard className="p-16 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-gold mx-auto mb-4" />
            <p className="text-white/60 text-sm">טוען לקוחות...</p>
          </GlassCard>
        ) : filtered.length === 0 ? (
          <GlassCard className="p-16 text-center">
            <div className="h-16 w-16 rounded-full bg-white/5 border border-white/15 flex items-center justify-center mx-auto mb-5">
              <Users className="h-7 w-7 text-white/40" />
            </div>
            <h3 className="font-display text-xl lg:text-2xl font-bold text-white tracking-tight mb-2">
              {search ? "לא נמצאו תוצאות" : "אין עדיין לקוחות"}
            </h3>
            <p className="text-sm text-white/55 mb-6 max-w-md mx-auto">
              {search
                ? "נסו מילת חיפוש אחרת — שם פרטי, חלק מתעודת הזהות, או הסיומת של המייל."
                : "התחילו בהעלאת דוח מוצרים בניהול כדי לראות את הלקוחות בתיק שלכם."}
            </p>
            {!search && (
              <Link href="/upload">
                <Button className="bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/30 font-bold">
                  <Upload className="h-4 w-4 ml-2" />
                  העלאת דוח ראשון
                </Button>
              </Link>
            )}
          </GlassCard>
        ) : (
          <div className="grid gap-3">
            {filtered.map((client) => (
              <div
                key={client.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  setSelectedClient({
                    id: client.id,
                    fullName: client.fullName,
                    idNumber: client.idNumber,
                    email: client.email,
                    phone: client.phone,
                    isVip: client.isVip,
                    notes: client.notes,
                    flagStatus: (client as { flagStatus?: string }).flagStatus,
                    totalBalance: (client as { totalBalance?: string | number })
                      .totalBalance,
                    birthDate: (client as { birthDate?: Date | string }).birthDate,
                    createdAt: client.createdAt,
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedClient({
                      id: client.id,
                      fullName: client.fullName,
                      idNumber: client.idNumber,
                      email: client.email,
                      phone: client.phone,
                      isVip: client.isVip,
                      notes: client.notes,
                      flagStatus: (client as { flagStatus?: string }).flagStatus,
                      totalBalance: (client as { totalBalance?: string | number })
                        .totalBalance,
                      birthDate: (client as { birthDate?: Date | string }).birthDate,
                      createdAt: client.createdAt,
                    });
                  }
                }}
                className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 rounded-lg"
              >
              <GlassCard className="p-4 sm:p-5 hover:bg-white/[0.07] hover:border-gold/30 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelected(client.id);
                      }}
                      className="shrink-0 text-white/50 hover:text-gold transition-colors"
                      aria-label={selectedIds.has(client.id) ? "בטל בחירה" : "בחר לקוח"}
                      aria-pressed={selectedIds.has(client.id)}
                    >
                      {selectedIds.has(client.id) ? (
                        <CheckSquare className="h-5 w-5 text-gold" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                    <div
                      className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 ${
                        client.isVip
                          ? "bg-gradient-to-br from-gold to-[#B89346] border-gold text-[#06101F] shadow-md shadow-gold/40"
                          : "bg-gradient-to-br from-gold/30 to-gold/10 border-gold/40 text-gold"
                      }`}
                    >
                      {client.isVip ? (
                        <Crown className="h-5 w-5" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-base font-bold text-white tracking-tight">
                          {client.fullName ||
                            `לקוח ${client.idNumber.slice(-4)}`}
                        </h3>
                        {client.isVip && (
                          <span className="text-[10px] font-bold tracking-wider bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] px-2 py-0.5 rounded-sm">
                            VIP
                          </span>
                        )}
                        {(() => {
                          const f = (client as { flagStatus?: string })
                            .flagStatus;
                          if (!f || f === "regular") return null;
                          const meta = FLAG_META[f as keyof typeof FLAG_META];
                          if (!meta) return null;
                          const Icon = meta.icon;
                          return (
                            <span
                              className={`text-[10px] font-semibold tracking-wide bg-${meta.color}-500/15 text-${meta.color}-300 border border-${meta.color}-500/30 px-2 py-0.5 rounded-sm flex items-center gap-1`}
                            >
                              <Icon className="h-3 w-3" />
                              {meta.label}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-[11px] text-white/45 font-mono tracking-wider mt-0.5">
                        ת&quot;ז · {client.idNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm pr-14 sm:pr-0">
                    {Number((client as { totalBalance?: string }).totalBalance ?? 0) > 0 && (
                      <div className="flex items-center gap-1.5 text-white/75">
                        <span className="text-[10px] tracking-wider text-white/45 uppercase">צבירה</span>
                        <span className="text-xs font-mono font-bold text-gold mono-num">
                          ₪{Number((client as { totalBalance?: string }).totalBalance ?? 0).toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-1.5 text-white/65">
                        <Mail className="h-3.5 w-3.5 text-gold/80" />
                        <span className="text-xs">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-1.5 text-white/65">
                        <Phone className="h-3.5 w-3.5 text-gold/80" />
                        <span className="text-xs font-mono">
                          {client.phone}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
              </div>
            ))}
          </div>
        )}
      </div>
    </CinematicShell>
  );
}
