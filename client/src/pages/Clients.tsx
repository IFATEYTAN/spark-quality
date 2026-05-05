// SPARK AI · Clients — תיק לקוחות בסגנון הסינמטי של הדמו
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CinematicShell, GlassCard, GoldEyebrow } from "@/components/CinematicShell";
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  Mail,
  Phone,
  Search,
  User,
  Users,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

export default function Clients() {
  const { user, loading, isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = "/";
  }, [loading, isAuthenticated]);

  const clientsQuery = trpc.clients.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const filtered = useMemo(() => {
    const list = clientsQuery.data ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.fullName?.toLowerCase().includes(q) ||
        c.idNumber.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [clientsQuery.data, search]);

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
      <div className="container py-10 lg:py-14">
        {/* Page header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 animate-fade-up">
          <div>
            <GoldEyebrow>תיק לקוחות</GoldEyebrow>
            <h1 className="font-display text-4xl lg:text-5xl font-black text-white tracking-tighter leading-[1.05]">
              <span className="text-gold mono-num">
                {totalCount.toLocaleString("he-IL")}
              </span>{" "}
              לקוחות
            </h1>
            <p className="mt-3 text-sm lg:text-base text-white/65 leading-relaxed">
              {user?.workspaceRole === "agent"
                ? "מציג רק את הלקוחות שלך — בידוד מלא בתוך הסוכנות."
                : "מציג את כל לקוחות הסוכנות — כתפקיד מנהל יש לך גישה מלאה."}
            </p>
          </div>
          <Link href="/upload">
            <Button className="bg-gradient-to-br from-gold to-[#B89346] text-[#06101F] hover:scale-[1.02] hover:shadow-lg hover:shadow-gold/30 font-bold">
              <Upload className="h-4 w-4 ml-2" />
              העלאת דוח חדש
            </Button>
          </Link>
        </div>

        {/* Search bar */}
        <GlassCard className="p-2 mb-6">
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
                ? "נסי מילת חיפוש אחרת — שם פרטי, חלק מתעודת הזהות, או הסיומת של המייל."
                : "התחילי בהעלאת דוח שורנס כדי לראות את הלקוחות בתיק שלך."}
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
              <GlassCard
                key={client.id}
                className="p-5 hover:bg-white/[0.07] hover:border-gold/30 transition-all"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/40 flex items-center justify-center text-gold shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-white tracking-tight">
                        {client.fullName ||
                          `לקוח ${client.idNumber.slice(-4)}`}
                      </h3>
                      <p className="text-[11px] text-white/45 font-mono tracking-wider mt-0.5">
                        ת&quot;ז · {client.idNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
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
            ))}
          </div>
        )}
      </div>
    </CinematicShell>
  );
}
