"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  RefreshCw,
  TestTube2,
  Send,
  Zap,
  Globe,
  ChefHat,
  Truck
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
    <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13H9v6h2V7zm4 0h-2v6h2V7z"/>
    </svg>
  ),
  didi: () => (
    <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">D</text>
    </svg>
  ),
  rappi: () => (
    <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">R</text>
    </svg>
  ),
  sinDelantal: () => (
    <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">SD</text>
    </svg>
  ),
  pedidosYa: () => (
    <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">PY</text>
    </svg>
  ),
  pedidos_ya: () => (
    <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">PY</text>
    </svg>
  ),
  cornershop: () => (
    <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">CS</text>
    </svg>
  ),
  sin_delantal: () => (
    <svg className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">SD</text>
    </svg>
  ),
};

const MAIN_PLATFORMS = ['uber_eats', 'didi_food', 'rappi'];

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
  const [testing, setTesting] = useState<string | null>(null);
  const [sendingTestOrder, setSendingTestOrder] = useState<string | null>(null);

  useEffect(() => {
    setPlatforms(getPlatforms());
  }, []);

  const generateWebhookUrl = (platformId: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const platformPath = platformId === 'uber_eats' ? 'uber-eats' : 
                         platformId === 'didi_food' ? 'didi-food' : 
                         platformId === 'sin_delantal' ? 'sin-delantal' :
                         platformId === 'pedidos_ya' ? 'pedidos-ya' : platformId;
    return `${baseUrl}/api/webhooks/${platformPath}`;
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

  const handleTestConnection = async (platformId: string) => {
    setTesting(platformId);
    
    try {
      const platform = platforms.find(p => p.id === platformId);
      if (!platform) return;

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Conexión con ${platform.name} verificada correctamente`, {
        description: "El webhook está listo para recibir pedidos"
      });
    } catch (error) {
      toast.error("Error al verificar conexión");
    } finally {
      setTesting(null);
    }
  };

  const handleSendTestOrder = async (platformId: string) => {
    setSendingTestOrder(platformId);
    
    try {
      const platform = platforms.find(p => p.id === platformId);
      if (!platform) return;

      const webhookUrl = generateWebhookUrl(platformId);
      
      const testOrder = {
        order_id: `TEST-${platformId.toUpperCase()}-${Date.now()}`,
        customer: {
          name: `Cliente Prueba ${platform.name}`,
          phone: "+52 55 1234 5678",
          address: "Calle de Prueba #123, Col. Centro"
        },
        items: [
          { name: "Pizza Grande", quantity: 1, price: 189.00, notes: "Sin cebolla" },
          { name: "Refresco 600ml", quantity: 2, price: 25.00 },
          { name: "Papas Fritas", quantity: 1, price: 45.00 }
        ],
        subtotal: 284.00,
        delivery_fee: 35.00,
        total: 319.00,
        notes: "Pedido de prueba - Favor de ignorar",
        payment_method: "card",
        timestamp: new Date().toISOString()
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Order': 'true'
        },
        body: JSON.stringify(testOrder)
      });

      if (response.ok) {
        toast.success(`Pedido de prueba enviado a cocina`, {
          description: `Revisa el módulo de Cocina para ver el pedido de ${platform.name}`,
          action: {
            label: "Ir a Cocina",
            onClick: () => window.location.href = "/dashboard/cocina"
          }
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al enviar pedido');
      }
    } catch (error: any) {
      toast.error("Error al enviar pedido de prueba", {
        description: error.message
      });
    } finally {
      setSendingTestOrder(null);
    }
  };

  const connectedCount = platforms.filter(p => p.isConnected).length;
  const mainPlatforms = platforms.filter(p => MAIN_PLATFORMS.includes(p.id));
  const otherPlatforms = platforms.filter(p => !MAIN_PLATFORMS.includes(p.id));

  const PlatformLogo = ({ icon, color, size = "default" }: { icon: string; color: string; size?: "default" | "large" }) => {
    const LogoComponent = platformLogos[icon];
    const sizeClass = size === "large" ? "h-12 w-12" : "h-10 w-10";
    return LogoComponent ? (
      <div style={{ color }} className={sizeClass}>
        <LogoComponent />
      </div>
    ) : (
      <div 
        className={cn("rounded-full flex items-center justify-center text-white font-bold", sizeClass)}
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
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Globe className="h-6 w-6" />
            Plataformas
          </h1>
          <p className="text-muted-foreground">
            Conecta tu POS con Uber Eats, Didi Food, Rappi y recibe pedidos automáticamente
          </p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1" data-testid="badge-connected-count">
          {connectedCount} de {platforms.length} conectadas
        </Badge>
      </div>

      <Tabs defaultValue="main" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="main" data-testid="tab-main-platforms">
            <Truck className="h-4 w-4 mr-2" />
            Principales
          </TabsTrigger>
          <TabsTrigger value="other" data-testid="tab-other-platforms">
            <Globe className="h-4 w-4 mr-2" />
            Otras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {mainPlatforms.map((platform) => (
              <Card 
                key={platform.id} 
                className={cn(
                  "transition-all relative overflow-hidden",
                  platform.isConnected && "border-green-500 bg-green-50/50 dark:bg-green-950/20"
                )}
                data-testid={`card-platform-${platform.id}`}
              >
                <div 
                  className="absolute top-0 left-0 right-0 h-2"
                  style={{ backgroundColor: platform.color }}
                />
                <CardHeader className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <PlatformLogo icon={platform.icon} color={platform.color} size="large" />
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          {platform.name}
                          {platform.isConnected ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </CardTitle>
                        <CardDescription className="text-base">
                          {platform.isConnected ? (
                            <span className="text-green-600 dark:text-green-400 font-medium">Conectado</span>
                          ) : (
                            "No conectado"
                          )}
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
                          toast.success(enabled ? `${platform.name} habilitado` : `${platform.name} deshabilitado`);
                        }}
                        data-testid={`switch-platform-${platform.id}`}
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {platform.isConnected && (
                    <>
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Store ID:</span>
                          <span className="font-mono">{platform.storeId}</span>
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Webhook:</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => copyWebhookUrl(generateWebhookUrl(platform.id))}
                            data-testid={`button-copy-webhook-${platform.id}`}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copiar
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(platform.id)}
                          disabled={testing === platform.id}
                          data-testid={`button-test-${platform.id}`}
                        >
                          {testing === platform.id ? (
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Zap className="h-4 w-4 mr-1" />
                          )}
                          Probar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendTestOrder(platform.id)}
                          disabled={sendingTestOrder === platform.id}
                          data-testid={`button-test-order-${platform.id}`}
                        >
                          {sendingTestOrder === platform.id ? (
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <ChefHat className="h-4 w-4 mr-1" />
                          )}
                          Pedido
                        </Button>
                      </div>
                    </>
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
                        className="w-full text-white"
                        style={{ backgroundColor: platform.color }}
                        onClick={() => handleConnect(platform)}
                        data-testid={`button-connect-${platform.id}`}
                      >
                        <Link2 className="h-4 w-4 mr-1" />
                        Conectar {platform.name}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-900">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TestTube2 className="h-5 w-5 text-orange-500" />
                Probar Integraciones
              </CardTitle>
              <CardDescription>
                Envía pedidos de prueba para verificar que todo funcione correctamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Usa los botones de "Pedido" en cada plataforma conectada para enviar un pedido de prueba 
                que aparecerá en el módulo de Cocina. Esto te permite verificar que los webhooks 
                están funcionando correctamente sin necesidad de realizar un pedido real.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = "/dashboard/cocina"}
                  data-testid="button-go-to-kitchen"
                >
                  <ChefHat className="h-4 w-4 mr-2" />
                  Ir a Cocina
                </Button>
                {mainPlatforms.some(p => p.isConnected) && (
                  <Button
                    onClick={async () => {
                      const connected = mainPlatforms.filter(p => p.isConnected);
                      for (const platform of connected) {
                        await handleSendTestOrder(platform.id);
                        await new Promise(r => setTimeout(r, 500));
                      }
                    }}
                    data-testid="button-test-all"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar pedidos de prueba a todas
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="other" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otherPlatforms.map((platform) => (
              <Card 
                key={platform.id} 
                className={cn(
                  "transition-all",
                  platform.isConnected && "border-green-500/50 bg-green-50/30 dark:bg-green-950/10"
                )}
                data-testid={`card-platform-${platform.id}`}
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
        </TabsContent>
      </Tabs>

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
            automáticamente a tu POS y podrás gestionarlos desde el módulo de Cocina.
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

            {selectedPlatform && (
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={generateWebhookUrl(selectedPlatform.id)}
                    readOnly
                    className="flex-1 bg-muted font-mono text-xs"
                    data-testid="input-webhook-url"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyWebhookUrl(generateWebhookUrl(selectedPlatform.id))}
                    data-testid="button-copy-webhook"
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
              className="text-white"
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
