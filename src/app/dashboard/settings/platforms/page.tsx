"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Link2, 
  Unlink, 
  Settings, 
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { DeliveryPlatform, DELIVERY_PLATFORMS } from "@/types/printer";
import { cn } from "@/lib/utils";

const PLATFORMS_STORAGE_KEY = "pos_delivery_platforms";

function getPlatforms(): DeliveryPlatform[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(PLATFORMS_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return DELIVERY_PLATFORMS.map(p => ({
    ...p,
    apiKey: "",
    storeId: "",
    isConnected: false,
    webhookUrl: "",
    enabled: false,
  }));
}

function savePlatforms(platforms: DeliveryPlatform[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLATFORMS_STORAGE_KEY, JSON.stringify(platforms));
}

const platformLogos: Record<string, () => React.ReactElement> = {
  uber: () => (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13H9v6h2V7zm4 0h-2v6h2V7z"/>
    </svg>
  ),
  didi: () => (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">D</text>
    </svg>
  ),
  rappi: () => (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">R</text>
    </svg>
  ),
  sinDelantal: () => (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">SD</text>
    </svg>
  ),
  pedidosYa: () => (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">PY</text>
    </svg>
  ),
  pedidos_ya: () => (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">PY</text>
    </svg>
  ),
  cornershop: () => (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">CS</text>
    </svg>
  ),
  sin_delantal: () => (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">SD</text>
    </svg>
  ),
};

export default function PlatformsSettingsPage() {
  const [platforms, setPlatforms] = useState<DeliveryPlatform[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<DeliveryPlatform | null>(null);
  const [formData, setFormData] = useState({
    apiKey: "",
    storeId: "",
    enabled: true,
  });
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    setPlatforms(getPlatforms());
  }, []);

  const generateWebhookUrl = (platformId: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/api/webhooks/${platformId}`;
  };

  const handleConnect = (platform: DeliveryPlatform) => {
    setSelectedPlatform(platform);
    setFormData({
      apiKey: platform.apiKey || "",
      storeId: platform.storeId || "",
      enabled: platform.enabled,
    });
    setDialogOpen(true);
  };

  const handleDisconnect = (platformId: string) => {
    const updated = platforms.map(p => 
      p.id === platformId 
        ? { ...p, apiKey: "", storeId: "", isConnected: false, enabled: false }
        : p
    );
    setPlatforms(updated);
    savePlatforms(updated);
    toast.success("Plataforma desconectada");
  };

  const handleSave = async () => {
    if (!selectedPlatform) return;

    setConnecting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    const updated = platforms.map(p => 
      p.id === selectedPlatform.id 
        ? { 
            ...p, 
            apiKey: formData.apiKey,
            storeId: formData.storeId,
            isConnected: !!formData.apiKey && !!formData.storeId,
            webhookUrl: generateWebhookUrl(selectedPlatform.id),
            enabled: formData.enabled,
          }
        : p
    );
    
    setPlatforms(updated);
    savePlatforms(updated);
    setConnecting(false);
    setDialogOpen(false);
    
    if (formData.apiKey && formData.storeId) {
      toast.success(`${selectedPlatform.name} conectado exitosamente`);
    } else {
      toast.info("Configuración guardada");
    }
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada al portapapeles");
  };

  const connectedCount = platforms.filter(p => p.isConnected).length;

  const PlatformLogo = ({ icon, color }: { icon: string; color: string }) => {
    const LogoComponent = platformLogos[icon];
    return LogoComponent ? (
      <div style={{ color }}>
        <LogoComponent />
      </div>
    ) : (
      <div 
        className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold"
        style={{ backgroundColor: color }}
      >
        {icon[0]?.toUpperCase()}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plataformas Digitales</h1>
          <p className="text-muted-foreground">
            Conecta tu POS con Uber Eats, Didi Food, Rappi y más
          </p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">
          {connectedCount} de {platforms.length} conectadas
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {platforms.map((platform) => (
          <Card 
            key={platform.id} 
            className={cn(
              "transition-all",
              platform.isConnected && "border-green-500/50 bg-green-50/30 dark:bg-green-950/10"
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <PlatformLogo icon={platform.icon} color={platform.color} />
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {platform.name}
                      {platform.isConnected ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      {platform.isConnected ? "Conectado" : "No conectado"}
                    </CardDescription>
                  </div>
                </div>
                {platform.isConnected && (
                  <Switch
                    checked={platform.enabled}
                    onCheckedChange={(enabled) => {
                      const updated = platforms.map(p => 
                        p.id === platform.id ? { ...p, enabled } : p
                      );
                      setPlatforms(updated);
                      savePlatforms(updated);
                    }}
                    data-testid={`switch-platform-${platform.id}`}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {platform.isConnected && platform.storeId && (
                <div className="text-sm text-muted-foreground">
                  Store ID: {platform.storeId}
                </div>
              )}

              <div className="flex gap-2">
                {platform.isConnected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleConnect(platform)}
                      data-testid={`button-settings-${platform.id}`}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Configurar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(platform.id)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`button-disconnect-${platform.id}`}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    style={{ backgroundColor: platform.color }}
                    onClick={() => handleConnect(platform)}
                    data-testid={`button-connect-${platform.id}`}
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Conectar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información Importante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Para conectar tu restaurante con cada plataforma, necesitarás:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Una cuenta activa de comercio en cada plataforma</li>
            <li>Acceso al panel de administración o API del comercio</li>
            <li>Las credenciales API (API Key y Store ID)</li>
          </ul>
          <p>
            Una vez conectado, los pedidos de cada plataforma llegarán 
            automáticamente a tu POS y podrás gestionarlos desde aquí.
          </p>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPlatform && (
                <PlatformLogo 
                  icon={selectedPlatform.icon} 
                  color={selectedPlatform.color} 
                />
              )}
              Conectar {selectedPlatform?.name}
            </DialogTitle>
            <DialogDescription>
              Ingresa las credenciales de tu cuenta de comercio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>API Key / Token</Label>
              <Input
                type="password"
                placeholder="Ingresa tu API Key"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                data-testid="input-api-key"
              />
              <p className="text-xs text-muted-foreground">
                Encuentra esta clave en el panel de desarrolladores de {selectedPlatform?.name}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Store ID / Restaurant ID</Label>
              <Input
                placeholder="Ej: 12345-abcde"
                value={formData.storeId}
                onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                data-testid="input-store-id"
              />
              <p className="text-xs text-muted-foreground">
                El identificador único de tu restaurante en la plataforma
              </p>
            </div>

            {selectedPlatform?.webhookUrl && (
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={generateWebhookUrl(selectedPlatform.id)}
                    readOnly
                    className="flex-1 bg-muted"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyWebhookUrl(generateWebhookUrl(selectedPlatform.id))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configura esta URL en el panel de {selectedPlatform?.name} para recibir pedidos
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Label>Habilitar integración</Label>
              <Switch
                checked={formData.enabled}
                onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
                data-testid="switch-enabled"
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                ¿Cómo obtener las credenciales?
              </h4>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal pl-4">
                <li>Ingresa al portal de comercios de {selectedPlatform?.name}</li>
                <li>Ve a Configuración &gt; Integraciones o API</li>
                <li>Genera o copia tu API Key</li>
                <li>Copia tu Store ID desde la configuración de tu restaurante</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={connecting}
              style={{ backgroundColor: selectedPlatform?.color }}
              data-testid="button-save-platform"
            >
              {connecting && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {connecting ? "Conectando..." : "Guardar y Conectar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
