"use client";

import { format } from "date-fns";
import {
  Building2,
  Calendar,
  FileText,
  Info,
  ChevronDown,
  ChevronUp,
  Tag,
  Coins,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface LicitacionItem {
  CodigoProducto: number | string;
  NombreProducto: string;
  Descripcion: string;
  Cantidad: number;
  UnidadMedida: string;
}

interface Licitacion {
  CodigoExterno: string;
  Nombre: string;
  Descripcion: string;
  CodigoEstado: number;
  Estado: string;
  MontoEstimado?: number;
  Moneda?: string;
  Comprador: {
    NombreOrganismo: string;
    NombreUnidad?: string;
    RutUnidad?: string;
    DireccionUnidad?: string;
    ComunaUnidad?: string;
    RegionUnidad?: string;
  };
  Fechas: {
    FechaCreacion?: string;
    FechaCierre?: string;
    FechaAdjudicacion?: string;
  };
  Items?: {
    Cantidad: number;
    Listado: LicitacionItem[];
  };
}

interface LicitacionDetailProps {
  data: {
    Cantidad: number;
    Listado?: Licitacion[];
  };
}

export function LicitacionDetail({ data }: LicitacionDetailProps) {
  const [showItems, setShowItems] = useState(false);

  const licitacion = data?.Listado?.[0];

  if (!licitacion) {
    return (
      <Card className="w-full md:max-w-[500px] border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900">
        <CardContent className="p-4 flex flex-row items-center gap-3">
          <Info className="text-red-500 shrink-0" size={20} />
          <div className="text-sm text-red-700 dark:text-red-400">
            No se encontró información de la licitación solicitada.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get status color
  const getStatusBadge = (estado: string) => {
    const norm = (estado || "").toLowerCase();
    if (norm.includes("publicada") || norm.includes("adjudicada") || norm.includes("activa")) {
      return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">{estado}</Badge>;
    }
    if (norm.includes("cerrada") || norm.includes("finalizada")) {
      return <Badge className="bg-zinc-500 text-white hover:bg-zinc-600">{estado}</Badge>;
    }
    if (norm.includes("desierta") || norm.includes("cancelada") || norm.includes("revocada")) {
      return <Badge className="bg-red-500 text-white hover:bg-red-600">{estado}</Badge>;
    }
    return <Badge className="bg-blue-500 text-white hover:bg-blue-600">{estado || "Desconocido"}</Badge>;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "No especificada";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm");
    } catch (e) {
      return dateStr;
    }
  };

  const items = licitacion.Items?.Listado || [];

  return (
    <Card className="w-full md:max-w-[500px] border-zinc-200 dark:border-zinc-800 bg-card/60 backdrop-blur-md overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl">
      <CardHeader className="pb-3 border-b dark:border-zinc-800 bg-muted/40">
        <div className="flex flex-row justify-between items-start gap-2">
          <div className="flex flex-col gap-1 w-[70%]">
            <span className="text-xs text-muted-foreground font-mono leading-none">
              Licitación: {licitacion.CodigoExterno}
            </span>
            <CardTitle className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-tight line-clamp-2">
              {licitacion.Nombre}
            </CardTitle>
          </div>
          <div className="shrink-0">
            {getStatusBadge(licitacion.Estado || `Código Estado: ${licitacion.CodigoEstado}`)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 flex flex-col gap-4">
        {/* Buyer info */}
        <div className="flex flex-row gap-3">
          <Building2 className="text-zinc-400 shrink-0 mt-0.5" size={18} />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Institución Compradora
            </span>
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {licitacion.Comprador.NombreOrganismo}
            </span>
            {licitacion.Comprador.NombreUnidad && (
              <span className="text-xs text-muted-foreground">
                Unidad: {licitacion.Comprador.NombreUnidad}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {licitacion.Descripcion && (
          <div className="flex flex-row gap-3">
            <FileText className="text-zinc-400 shrink-0 mt-0.5" size={18} />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Descripción
              </span>
              <span className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-3 leading-relaxed">
                {licitacion.Descripcion}
              </span>
            </div>
          </div>
        )}

        {/* Budget & Currency */}
        <div className="grid grid-cols-2 gap-4 bg-muted/30 p-2.5 rounded-lg border dark:border-zinc-800">
          <div className="flex flex-row gap-2 items-center">
            <Coins className="text-zinc-400" size={16} />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Monto Estimado</span>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {licitacion.MontoEstimado 
                  ? `${licitacion.MontoEstimado.toLocaleString("es-CL")} ${licitacion.Moneda || "CLP"}` 
                  : "No estimado"}
              </span>
            </div>
          </div>
          
          <div className="flex flex-row gap-2 items-center">
            <Calendar className="text-zinc-400" size={16} />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Cierre Licitación</span>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {licitacion.Fechas?.FechaCierre 
                  ? formatDate(licitacion.Fechas.FechaCierre) 
                  : "No definida"}
              </span>
            </div>
          </div>
        </div>

        {/* Key Dates list */}
        <div className="flex flex-col gap-1.5 text-xs border-t dark:border-zinc-800 pt-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fecha Publicación:</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {formatDate(licitacion.Fechas?.FechaCreacion)}
            </span>
          </div>
          {licitacion.Fechas?.FechaAdjudicacion && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha Adjudicación:</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {formatDate(licitacion.Fechas.FechaAdjudicacion)}
              </span>
            </div>
          )}
        </div>

        {/* Items section */}
        {items.length > 0 && (
          <div className="border-t dark:border-zinc-800 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full flex justify-between items-center px-2 py-1 h-fit font-normal text-muted-foreground hover:text-zinc-900 dark:hover:text-zinc-100"
              onClick={() => setShowItems(!showItems)}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <Tag size={14} /> Productos licitados ({items.length})
              </span>
              {showItems ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
            
            {showItems && (
              <div className="mt-2 flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={idx} className="bg-muted/40 p-2 rounded-md border dark:border-zinc-800 text-xs flex flex-col gap-1">
                    <div className="flex justify-between font-semibold text-zinc-800 dark:text-zinc-200">
                      <span>{item.NombreProducto}</span>
                      <span className="text-blue-500 font-mono text-[10px]">
                        Cant: {item.Cantidad} {item.UnidadMedida}
                      </span>
                    </div>
                    {item.Descripcion && (
                      <p className="text-muted-foreground leading-normal text-[11px]">
                        {item.Descripcion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
