"use client";

import { format } from "date-fns";
import {
  Building2,
  Calendar,
  FileText,
  Info,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  TrendingUp,
  Truck,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface OrdenCompraItem {
  Correlativo: number;
  NombreProducto: string;
  Descripcion: string;
  Cantidad: number;
  PrecioNeto: number;
  Total: number;
  Moneda?: string;
}

interface OrdenCompra {
  Codigo: string;
  Nombre: string;
  Descripcion: string;
  CodigoEstado: number;
  EstadoProveedor?: string;
  Estado?: string;
  TotalNeto: number;
  PorcentajeIva: number;
  Impuestos: number;
  Total: number;
  Comprador: {
    NombreOrganismo: string;
    NombreUnidad?: string;
    RutUnidad?: string;
  };
  Proveedor: {
    Nombre: string;
    RutSucursal?: string;
  };
  Fechas: {
    FechaCreacion?: string;
    FechaEnvio?: string;
    FechaAceptacion?: string;
  };
  Items?: {
    Cantidad: number;
    Listado: OrdenCompraItem[];
  };
}

interface OrdenCompraDetailProps {
  data: {
    Cantidad: number;
    Listado?: OrdenCompra[];
  };
}

export function OrdenCompraDetail({ data }: OrdenCompraDetailProps) {
  const [showItems, setShowItems] = useState(true);

  const oc = data?.Listado?.[0];

  if (!oc) {
    return (
      <Card className="w-full md:max-w-[500px] border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900">
        <CardContent className="p-4 flex flex-row items-center gap-3">
          <Info className="text-red-500 shrink-0" size={20} />
          <div className="text-sm text-red-700 dark:text-red-400">
            No se encontró información de la orden de compra solicitada.
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (estado?: string) => {
    const defaultState = estado || `Código Estado: ${oc.CodigoEstado}`;
    const norm = (estado || "").toLowerCase();
    if (norm.includes("aceptada") || norm.includes("recepcionada") || norm.includes("conforme")) {
      return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">{defaultState}</Badge>;
    }
    if (norm.includes("enviada") || norm.includes("emitida")) {
      return <Badge className="bg-blue-500 text-white hover:bg-blue-600">{defaultState}</Badge>;
    }
    if (norm.includes("cancelada") || norm.includes("rechazada")) {
      return <Badge className="bg-red-500 text-white hover:bg-red-600">{defaultState}</Badge>;
    }
    return <Badge className="bg-zinc-500 text-white hover:bg-zinc-600">{defaultState}</Badge>;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "No especificada";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm");
    } catch (e) {
      return dateStr;
    }
  };

  const items = oc.Items?.Listado || [];

  return (
    <Card className="w-full md:max-w-[500px] border-zinc-200 dark:border-zinc-800 bg-card/60 backdrop-blur-md overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl">
      <CardHeader className="pb-3 border-b dark:border-zinc-800 bg-muted/40">
        <div className="flex flex-row justify-between items-start gap-2">
          <div className="flex flex-col gap-1 w-[70%]">
            <span className="text-xs text-muted-foreground font-mono leading-none">
              Orden de Compra: {oc.Codigo}
            </span>
            <CardTitle className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-tight line-clamp-2">
              {oc.Nombre || "Orden de Compra"}
            </CardTitle>
          </div>
          <div className="shrink-0">
            {getStatusBadge(oc.Estado || oc.EstadoProveedor)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 flex flex-col gap-4">
        {/* Parties involved */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b dark:border-zinc-800 pb-3">
          <div className="flex flex-row gap-2.5">
            <Building2 className="text-zinc-400 shrink-0 mt-0.5" size={16} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Comprador</span>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2">
                {oc.Comprador.NombreOrganismo}
              </span>
              {oc.Comprador.NombreUnidad && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                  {oc.Comprador.NombreUnidad}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-row gap-2.5">
            <Truck className="text-zinc-400 shrink-0 mt-0.5" size={16} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Proveedor</span>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2">
                {oc.Proveedor.Nombre}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {oc.Descripcion && (
          <div className="flex flex-row gap-2.5 border-b dark:border-zinc-800 pb-3">
            <FileText className="text-zinc-400 shrink-0 mt-0.5" size={16} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Instrucciones / Descripción</span>
              <span className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                {oc.Descripcion}
              </span>
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="flex flex-col gap-1.5 bg-muted/30 p-3 rounded-lg border dark:border-zinc-800">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total Neto:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              ${oc.TotalNeto?.toLocaleString("es-CL")} CLP
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">IVA ({oc.PorcentajeIva || 19}%):</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              ${oc.Impuestos?.toLocaleString("es-CL")} CLP
            </span>
          </div>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
          <div className="flex justify-between text-sm items-center">
            <span className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1">
              <TrendingUp size={14} className="text-emerald-500" /> Total:
            </span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
              ${oc.Total?.toLocaleString("es-CL")} CLP
            </span>
          </div>
        </div>

        {/* Date details */}
        <div className="flex flex-row gap-2 justify-between text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1">
            <Calendar size={12} /> Creado: {formatDate(oc.Fechas?.FechaCreacion)}
          </span>
          {oc.Fechas?.FechaEnvio && (
            <span className="flex items-center gap-1">
              <Truck size={12} /> Enviado: {formatDate(oc.Fechas.FechaEnvio)}
            </span>
          )}
        </div>

        {/* Items table */}
        {items.length > 0 && (
          <div className="border-t dark:border-zinc-800 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full flex justify-between items-center px-1.5 py-1 h-fit font-normal text-muted-foreground hover:text-zinc-900 dark:hover:text-zinc-100"
              onClick={() => setShowItems(!showItems)}
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <ShoppingBag size={14} /> Ítems de la orden ({items.length})
              </span>
              {showItems ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>
            
            {showItems && (
              <div className="mt-2 flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={idx} className="bg-muted/40 p-2 rounded-md border dark:border-zinc-800 text-xs flex flex-col gap-1">
                    <div className="flex justify-between font-semibold text-zinc-800 dark:text-zinc-200">
                      <span>{item.NombreProducto}</span>
                      <span className="font-mono text-blue-500 text-[10px]">
                        Cant: {item.Cantidad}
                      </span>
                    </div>
                    {item.Descripcion && item.Descripcion !== item.NombreProducto && (
                      <p className="text-muted-foreground leading-normal text-[11px]">
                        {item.Descripcion}
                      </p>
                    )}
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t dark:border-zinc-800 pt-1 mt-1 font-mono">
                      <span>Precio Unit: ${item.PrecioNeto?.toLocaleString("es-CL")} CLP</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        Total Neto: ${item.Total?.toLocaleString("es-CL")} CLP
                      </span>
                    </div>
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
