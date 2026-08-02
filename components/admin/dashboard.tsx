"use client";

import { useState, useEffect } from "react";

interface Stats {
  tenders: number;
  matchesPending: number;
  matchesApproved: number;
  suppliers: number;
  outreachBlocked: number;
  outreachQueued: number;
  outreachSent: number;
}

interface Tender {
  id: string;
  external_id?: string;
  title: string;
  organization: string;
  region: string;
  budget: number;
  status: string;
  close_date?: string;
  created_at?: string;
}

interface Match {
  id: string;
  score: number;
  status: string;
  reasons?: Record<string, number>;
  tender?: Tender;
  company?: {
    id: string;
    name: string;
    category: string;
    rating: number;
    reviews_count: number;
    phone?: string;
    website?: string;
    address?: string;
  };
}

interface Supplier {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews_count: number;
  phone?: string;
  website?: string;
  address?: string;
  created_at?: string;
}

function fmtCLP(n: number): string {
  return new Intl.NumberFormat("es-CL").format(n);
}

function fmtD(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function sClass(sc: number): string {
  return sc >= 90 ? "bg-green-100 text-green-800" : sc >= 80 ? "bg-blue-100 text-blue-800" : sc >= 70 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500";
}

function sLabel(sc: number): string {
  return sc >= 90 ? "Alto" : sc >= 80 ? "Bueno" : sc >= 70 ? "Aprobable" : sc >= 40 ? "Potencial" : "Bajo";
}

function stTag(st: string): string {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    published: "bg-blue-100 text-blue-800",
    closed: "bg-slate-100 text-slate-500",
    awarded: "bg-blue-100 text-blue-800",
    blocked: "bg-red-100 text-red-800",
    queued: "bg-amber-100 text-amber-800",
    sent: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };
  return map[st] || "bg-slate-100 text-slate-500";
}

function isArray(val: unknown): val is unknown[] {
  return Array.isArray(val);
}

export function AdminDashboard({ activeTab }: { activeTab: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, [activeTab]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [sRes, mRes, tRes, suRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/matches?limit=50&status=eq.pending"),
        fetch("/api/admin/demandas?limit=50"),
        fetch("/api/admin/suppliers?limit=50"),
      ]);
      const sData = await sRes.json();
      const mData = await mRes.json();
      const tData = await tRes.json();
      const suData = await suRes.json();

      if (sRes.status === 404 && sData?.code === "TABLE_NOT_FOUND") throw new Error("TABLE_NOT_FOUND");
      if (mRes.status === 404 && mData?.code === "TABLE_NOT_FOUND") throw new Error("TABLE_NOT_FOUND");
      if (tRes.status === 404 && tData?.code === "TABLE_NOT_FOUND") throw new Error("TABLE_NOT_FOUND");
      if (suRes.status === 404 && suData?.code === "TABLE_NOT_FOUND") throw new Error("TABLE_NOT_FOUND");

      if (!sRes.ok || !isArray(sData)) throw new Error("Error cargando estadísticas");
      if (!mRes.ok || !isArray(mData)) throw new Error("Error cargando oportunidades");
      if (!tRes.ok || !isArray(tData)) throw new Error("Error cargando licitaciones");
      if (!suRes.ok || !isArray(suData)) throw new Error("Error cargando proveedores");

      setStats(sData as unknown as Stats);
      setMatches(mData as unknown as Match[]);
      setTenders(tData as unknown as Tender[]);
      setSuppliers(suData as unknown as Supplier[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(msg);
      console.error("Admin data load error:", msg);
    } finally {
      setLoading(false);
    }
  }

  async function approveMatch(id: string) {
    await fetch(`/api/admin/matches/${id}/approve`, { method: "POST" });
    loadAll();
  }

  async function rejectMatch(id: string) {
    await fetch(`/api/admin/matches/${id}/reject`, { method: "POST" });
    loadAll();
  }

  async function runPipeline() {
    await fetch("/api/admin/run-pipeline", { method: "POST" });
    loadAll();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-slate-400 text-sm">Cargando panel...</div>
      </div>
    );
  }

  if (error) {
    const isTableNotFound = error === "TABLE_NOT_FOUND";
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">
          {isTableNotFound ? "⚠ Tablas del panel no creadas" : "⚠ Panel de administración no configurado"}
        </h3>
        <p className="text-sm text-amber-700">
          {isTableNotFound
            ? "Las tablas necesarias para el panel de administración no existen en la base de datos. Ejecuta las migraciones para crearlas."
            : "Las credenciales de Supabase del panel de administración no están configuradas. Agrega <code className=\"bg-amber-100 px-1 rounded\">ADMIN_SUPABASE_URL</code> y <code className=\"bg-amber-100 px-1 rounded\">ADMIN_SUPABASE_KEY</code> a las variables de entorno."}
        </p>
      </div>
    );
  }

  const pendingMatches = matches.filter((m) => m.status === "pending");

  return (
    <div className="space-y-6">
      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-400 font-medium">Licitaciones activas</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.tenders}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-400 font-medium">Oportunidades aprobadas</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{stats.matchesApproved}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-400 font-medium">Proveedores contactados</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.outreachSent}</div>
          </div>
        </div>
      )}

      {/* Pipeline + Pending */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pipeline funnel */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-600 mb-4">Pipeline</h3>
          {stats && [
            ["Mercado Público", stats.tenders, "#3B82F6"],
            ["Oportunidades", stats.matchesPending, "#F59E0B"],
            ["Aprobadas", stats.matchesApproved, "#22C55E"],
            ["Contactados", stats.outreachSent, "#EF4444"],
          ].map(([label, value, color]) => {
            const max = Math.max(Number(value), 1);
            return (
              <div key={label} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(Number(value) / max) * 100}%`, backgroundColor: color as string }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pending matches */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-600">Oportunidades pendientes</h3>
            <button
              onClick={runPipeline}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition"
            >
              ▶ Ejecutar pipeline
            </button>
          </div>
          {pendingMatches.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8">
              {matches.length > 0 ? "Todas revisadas" : "Ejecuta el pipeline para generar matches"}
            </div>
          ) : (
            <div className="space-y-2">
              {pendingMatches.slice(0, 5).map((m) => (
                <div key={m.id} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{m.tender?.title || "Sin título"}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {m.tender?.organization} · {m.tender?.region}
                      </div>
                      <div className="text-xs text-slate-400">{m.company?.name} · {m.company?.category}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${sClass(m.score || 0)}`}>
                        {m.score}
                      </span>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => approveMatch(m.id)} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200">
                          ✓ Aprobar
                        </button>
                        <button onClick={() => rejectMatch(m.id)} className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded hover:bg-red-200">
                          ✗ Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tenders list */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-600">Licitaciones recientes</h3>
        </div>
        {tenders.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-8">Sin licitaciones</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {tenders.slice(0, 10).map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{t.title}</div>
                  <div className="text-xs text-slate-400">{t.organization} · {t.region}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${stTag(t.status)}`}>{t.status}</span>
                  <span className="text-sm font-semibold text-blue-600">{fmtCLP(t.budget)}</span>
                  <span className="text-xs text-slate-400">{fmtD(t.close_date)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suppliers */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-600">Proveedores destacados</h3>
        </div>
        {suppliers.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-8">Sin proveedores</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {suppliers.slice(0, 5).map((s) => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">{s.name}</div>
                  <div className="text-xs text-slate-400">{s.category}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{s.rating} ⭐ ({s.reviews_count})</span>
                  {s.website && (
                    <a href={s.website} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                      Web
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
