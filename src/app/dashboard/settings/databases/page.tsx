"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Server,
  Zap,
  Shield,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

interface DatabaseStatus {
  target: "primary" | "secondary";
  name: string;
  configured: boolean;
  connected: boolean;
  url?: string;
  error?: string;
}

interface DatabaseConfig {
  activeDatabase: "primary" | "secondary";
  databases: DatabaseStatus[];
}

export default function DatabasesPage() {
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);

  const { data: config, isLoading, refetch } = useQuery<DatabaseConfig>({
    queryKey: ["/api/settings/databases"],
    queryFn: async () => {
      const res = await fetch("/api/settings/databases");
      if (!res.ok) throw new Error("Failed to fetch database config");
      return res.json();
    },
  });

  const switchMutation = useMutation({
    mutationFn: async (target: "primary" | "secondary") => {
      const res = await fetch("/api/settings/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeDatabase: target }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to switch database");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/databases"] });
      toast.success(`Base de datos cambiada a: ${data.activeDatabase === "primary" ? "Principal" : "Secundaria"}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const testConnection = async (target: "primary" | "secondary") => {
    setIsChecking(true);
    try {
      const res = await fetch(`/api/settings/databases/test?target=${target}`);
      const result = await res.json();
      if (result.connected) {
        toast.success(`Conexion a ${target === "primary" ? "Principal" : "Secundaria"} exitosa`);
      } else {
        toast.error(`Error de conexion: ${result.error}`);
      }
      refetch();
    } catch (error) {
      toast.error("Error al probar conexion");
    } finally {
      setIsChecking(false);
    }
  };

  const handleSwitch = (target: "primary" | "secondary") => {
    const db = config?.databases.find(d => d.target === target);
    if (!db?.configured) {
      toast.error(`La base de datos ${target === "primary" ? "principal" : "secundaria"} no esta configurada`);
      return;
    }
    switchMutation.mutate(target);
  };

  const isSecondaryConfigured = config?.databases.find(d => d.target === "secondary")?.configured;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          Bases de Datos Supabase
        </h1>
        <p className="text-muted-foreground mt-2">
          Administra y cambia entre tus bases de datos de Supabase
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Base de Datos Activa</CardTitle>
                  <CardDescription>
                    {config?.activeDatabase === "primary" ? "Principal (Primary)" : "Secundaria (Secondary)"}
                  </CardDescription>
                </div>
              </div>
              <Badge 
                variant={config?.activeDatabase === "primary" ? "default" : "secondary"}
                className="text-sm"
                data-testid="badge-active-db"
              >
                {config?.activeDatabase === "primary" ? "PRIMARY" : "SECONDARY"}
              </Badge>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {config?.databases.map((db) => (
              <Card 
                key={db.target}
                className={`relative overflow-hidden transition-all ${
                  config.activeDatabase === db.target 
                    ? "ring-2 ring-primary ring-offset-2" 
                    : ""
                }`}
                data-testid={`card-database-${db.target}`}
              >
                {config.activeDatabase === db.target && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                )}
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      db.configured 
                        ? db.connected 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : "bg-yellow-100 dark:bg-yellow-900/30"
                        : "bg-muted"
                    }`}>
                      <Database className={`h-5 w-5 ${
                        db.configured 
                          ? db.connected 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-yellow-600 dark:text-yellow-400"
                          : "text-muted-foreground"
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {db.name}
                        {config.activeDatabase === db.target && (
                          <Badge variant="outline" className="text-xs font-normal">
                            Activa
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        {db.target === "primary" ? "Base principal del sistema" : "Base secundaria opcional"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    {db.configured ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {db.configured ? "Configurada" : "No configurada"}
                    </span>
                  </div>

                  {db.configured && (
                    <>
                      <div className="flex items-center gap-2">
                        {db.connected ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="text-sm">
                          {db.connected ? "Conectada" : "Sin verificar"}
                        </span>
                      </div>

                      {db.url && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Server className="h-3 w-3" />
                          <span className="truncate">{db.url}</span>
                        </div>
                      )}
                    </>
                  )}

                  {db.error && (
                    <div className="p-2 bg-destructive/10 rounded text-xs text-destructive">
                      {db.error}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Usar esta base</span>
                      <Switch
                        checked={config.activeDatabase === db.target}
                        onCheckedChange={() => handleSwitch(db.target)}
                        disabled={
                          !db.configured || 
                          switchMutation.isPending || 
                          config.activeDatabase === db.target
                        }
                        data-testid={`switch-database-${db.target}`}
                      />
                    </div>
                    {db.configured && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testConnection(db.target)}
                        disabled={isChecking}
                        data-testid={`button-test-${db.target}`}
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${isChecking ? "animate-spin" : ""}`} />
                        Probar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!isSecondaryConfigured && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Base de datos secundaria no configurada</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  Para habilitar el soporte multi-base de datos, configura las siguientes variables de entorno:
                </p>
                <div className="bg-muted p-4 rounded-lg text-left text-xs font-mono space-y-1">
                  <div>SUPABASE_URL_2=tu_url_secundaria</div>
                  <div>SUPABASE_ANON_KEY_2=tu_anon_key</div>
                  <div>SUPABASE_SERVICE_ROLE_KEY_2=tu_service_role_key</div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informacion del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                El cambio de base de datos se aplica a nivel de sesion. 
                Cada marca puede tener su propia configuracion de base de datos.
              </p>
              <p>
                La preferencia se guarda en el navegador y se mantiene entre sesiones.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
