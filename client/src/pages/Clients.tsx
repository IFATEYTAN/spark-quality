// SPARK AI · Clients - תיק לקוחות במערכת ה-SaaS
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Loader2,
  Mail,
  Phone,
  Search,
  Sparkles,
  User,
  Users,
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
      c =>
        c.fullName?.toLowerCase().includes(q) ||
        c.idNumber.includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [clientsQuery.data, search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-deep">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-deep text-white">
      <header className="border-b border-white/10">
        <div className="container mx-auto py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-gold" />
            <span className="font-serif text-lg text-gold">SPARK AI</span>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-white/70">
              <ArrowRight className="h-4 w-4 ml-1" />
              לדשבורד
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif text-white mb-1">
              <Users className="inline h-7 w-7 text-gold ml-2" />
              תיק הלקוחות שלי
            </h1>
            <p className="text-white/50 text-sm">
              {clientsQuery.data?.length ?? 0} לקוחות במערכת ·{" "}
              {user?.workspaceRole === "agent"
                ? "מציג רק את הלקוחות שלך"
                : "מציג את כל לקוחות הסוכנות"}
            </p>
          </div>
          <Link href="/upload">
            <Button className="bg-gold text-navy-deep hover:bg-gold/90">
              העלאת דוח חדש
            </Button>
          </Link>
        </div>

        <div className="relative mb-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="חיפוש לפי שם, ת.ז, מייל או טלפון..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>

        {clientsQuery.isLoading ? (
          <Card className="p-12 bg-white/5 border-white/10 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-gold mx-auto mb-3" />
            <p className="text-white/60">טוען לקוחות...</p>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 bg-white/5 border-white/10 text-center">
            <Users className="h-12 w-12 text-white/30 mx-auto mb-3" />
            <h3 className="text-lg font-serif text-white mb-2">
              {search ? "לא נמצאו תוצאות" : "אין עדיין לקוחות"}
            </h3>
            <p className="text-white/50 text-sm mb-4">
              {search
                ? "נסה מילת חיפוש אחרת"
                : "התחל בהעלאת דוח שורנס כדי לראות את הלקוחות שלך"}
            </p>
            {!search && (
              <Link href="/upload">
                <Button className="bg-gold text-navy-deep hover:bg-gold/90">
                  העלאת דוח ראשון
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(client => (
              <Card
                key={client.id}
                className="p-4 bg-white/5 border-white/10 hover:border-gold/30 transition-all"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center text-gold">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">
                        {client.fullName || `לקוח ${client.idNumber.slice(-4)}`}
                      </h3>
                      <p className="text-xs text-white/40 font-mono">
                        ת.ז {client.idNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    {client.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="text-xs">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        <span className="text-xs">{client.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
