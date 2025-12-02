"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  CreditCard, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ExternalLink,
  Star,
  Wifi,
  WifiOff,
  RefreshCw,
  Copy,
  Check,
  HelpCircle,
  Smartphone,
  Zap,
} from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  PaymentTerminal, 
  TerminalProvider, 
  TerminalDevice,
  TERMINAL_PROVIDERS 
} from "@/types/printer";
import {
  getTerminals,
  addTerminal,
  updateTerminal,
  deleteTerminal,
  testTerminalConnection,
  fetchTerminalDevices,
  getTerminalName,
} from "@/lib/services/terminal-service";

export default function TerminalsSettingsPage() {
  const [terminals, setTerminals] = useState<PaymentTerminal[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<PaymentTerminal | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<TerminalProvider>("mercadopago");
  const [formData, setFormData] = useState({
    accessToken: "",
    deviceId: "",
    isDefault: true,
    enabled: true,
  });
  const [devices, setDevices] = useState<TerminalDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTerminals(getTerminals());
  }, []);

  const handleAddTerminal = (provider: TerminalProvider) => {
    setEditingTerminal(null);
    setSelectedProvider(provider);
    setFormData({
      accessToken: "",
      deviceId: "",
      isDefault: terminals.length === 0,
      enabled: true,
    });
    setDevices([]);
    setStep(1);
    setDialogOpen(true);
  };

  const handleEditTerminal = (terminal: PaymentTerminal) => {
    setEditingTerminal(terminal);
    setSelectedProvider(terminal.provider);
    setFormData({
      accessToken: terminal.accessToken || "",
      deviceId: terminal.deviceId,
      isDefault: terminal.isDefault,
      enabled: terminal.enabled,
    });
    setStep(3);
    setDialogOpen(true);
  };

  const handleFetchDevices = async () => {
    if (!formData.accessToken) {
      toast.error("Ingresa tu Access Token primero");
      return;
    }

    setLoadingDevices(true);
    try {
      const fetchedDevices = await fetchTerminalDevices(selectedProvider, formData.accessToken);
      setDevices(fetchedDevices);
      
      if (fetchedDevices.length > 0) {
        setStep(2);
        toast.success(`Se encontraron ${fetchedDevices.length} dispositivos`);
      } else if (selectedProvider === "clip") {
        setStep(2);
        toast.info("Ingresa el Device ID de tu terminal Clip manualmente");
      } else {
        toast.warning("No se encontraron dispositivos. Verifica que tu terminal esté enlazada a tu cuenta.");
      }
    } catch (error) {
      toast.error("Error al obtener dispositivos. Verifica tu Access Token.");
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleSelectDevice = (deviceId: string) => {
    setFormData({ ...formData, deviceId });
    setStep(3);
  };

  const handleSave = async () => {
    if (!formData.accessToken || !formData.deviceId) {
      toast.error("Completa todos los campos requeridos");
      return;
    }

    setSaving(true);
    try {
      if (editingTerminal) {
        updateTerminal(editingTerminal.id, {
          accessToken: formData.accessToken,
          deviceId: formData.deviceId,
          isDefault: formData.isDefault,
          enabled: formData.enabled,
        });
        toast.success("Terminal actualizada");
      } else {
        addTerminal({
          provider: selectedProvider,
          name: getTerminalName(selectedProvider),
          deviceId: formData.deviceId,
          accessToken: formData.accessToken,
          isConnected: true,
          isDefault: formData.isDefault,
          enabled: formData.enabled,
        });
        toast.success("Terminal agregada exitosamente");
      }

      setTerminals(getTerminals());
      setDialogOpen(false);
    } catch (error) {
      toast.error("Error al guardar la terminal");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (deleteTerminal(id)) {
      setTerminals(getTerminals());
      toast.success("Terminal eliminada");
    }
  };

  const handleTestConnection = async (terminal: PaymentTerminal) => {
    setTesting(terminal.id);
    try {
      const isConnected = await testTerminalConnection(terminal);
      if (isConnected) {
        updateTerminal(terminal.id, { isConnected: true, lastConnected: new Date().toISOString() });
        setTerminals(getTerminals());
        toast.success("Conexión exitosa");
      } else {
        updateTerminal(terminal.id, { isConnected: false });
        setTerminals(getTerminals());
        toast.error("No se pudo conectar. Verifica tus credenciales.");
      }
    } catch (error) {
      toast.error("Error al probar conexión");
    } finally {
      setTesting(null);
    }
  };

  const handleToggleEnabled = (terminal: PaymentTerminal) => {
    updateTerminal(terminal.id, { enabled: !terminal.enabled });
    setTerminals(getTerminals());
    toast.success(terminal.enabled ? "Terminal desactivada" : "Terminal activada");
  };

  const handleSetDefault = (terminal: PaymentTerminal) => {
    updateTerminal(terminal.id, { isDefault: true });
    setTerminals(getTerminals());
    toast.success("Terminal establecida como predeterminada");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const providerInfo = TERMINAL_PROVIDERS.find(p => p.id === selectedProvider);
  const hasTerminals = terminals.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/settings" data-testid="link-back-settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Terminales de Pago</h1>
            <p className="text-muted-foreground text-sm">
              Conecta tu terminal bancaria para cobrar con tarjeta automáticamente
            </p>
          </div>
        </div>

        {!hasTerminals && (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Conecta tu primera terminal</h3>
              <p className="text-muted-foreground text-sm max-w-md mb-6">
                Al conectar una terminal, podrás cobrar con tarjeta directamente desde el POS. 
                El monto se enviará automáticamente a tu terminal.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {TERMINAL_PROVIDERS.map((provider) => (
                  <Button
                    key={provider.id}
                    onClick={() => handleAddTerminal(provider.id)}
                    className="gap-2"
                    style={{ backgroundColor: provider.color }}
                    data-testid={`button-add-${provider.id}`}
                  >
                    <Plus className="h-4 w-4" />
                    Conectar {provider.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {hasTerminals && (
          <>
            <div className="flex justify-end gap-2">
              {TERMINAL_PROVIDERS.map((provider) => (
                <Button
                  key={provider.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddTerminal(provider.id)}
                  className="gap-2"
                  data-testid={`button-add-${provider.id}`}
                >
                  <Plus className="h-4 w-4" />
                  {provider.name}
                </Button>
              ))}
            </div>

            <div className="grid gap-4">
              {terminals.map((terminal) => {
                const provider = TERMINAL_PROVIDERS.find(p => p.id === terminal.provider);
                return (
                  <Card 
                    key={terminal.id} 
                    className={cn(
                      "transition-all",
                      !terminal.enabled && "opacity-60"
                    )}
                    data-testid={`card-terminal-${terminal.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div 
                          className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                          style={{ backgroundColor: provider?.color || "#666" }}
                        >
                          {terminal.provider === "mercadopago" ? "MP" : "C"}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">{terminal.name}</h3>
                            {terminal.isDefault && (
                              <Badge variant="secondary" className="gap-1 shrink-0">
                                <Star className="h-3 w-3" />
                                Predeterminada
                              </Badge>
                            )}
                            {terminal.isConnected ? (
                              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1 shrink-0">
                                <Wifi className="h-3 w-3" />
                                Conectada
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 gap-1 shrink-0">
                                <WifiOff className="h-3 w-3" />
                                Desconectada
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {provider?.name} · ID: {terminal.deviceId.substring(0, 20)}...
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTestConnection(terminal)}
                            disabled={testing === terminal.id}
                            data-testid={`button-test-${terminal.id}`}
                          >
                            {testing === terminal.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          
                          <Switch
                            checked={terminal.enabled}
                            onCheckedChange={() => handleToggleEnabled(terminal)}
                            data-testid={`switch-enabled-${terminal.id}`}
                          />
                          
                          {!terminal.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(terminal)}
                              data-testid={`button-default-${terminal.id}`}
                            >
                              <Star className="h-4 w-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTerminal(terminal)}
                            data-testid={`button-edit-${terminal.id}`}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(terminal.id)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-${terminal.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              ¿Cómo funciona?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Conecta tu terminal</p>
                  <p className="text-sm text-muted-foreground">
                    Solo necesitas tu Access Token de Mercado Pago o Clip
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">Selecciona "Tarjeta" al cobrar</p>
                  <p className="text-sm text-muted-foreground">
                    El monto se envía automáticamente a tu terminal
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium">¡Listo!</p>
                  <p className="text-sm text-muted-foreground">
                    El cliente paga y el ticket se imprime automáticamente
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div 
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                  style={{ backgroundColor: providerInfo?.color }}
                >
                  {selectedProvider === "mercadopago" ? "MP" : "C"}
                </div>
                {editingTerminal ? "Editar Terminal" : `Conectar ${providerInfo?.name}`}
              </DialogTitle>
              <DialogDescription>
                {step === 1 && "Paso 1: Ingresa tu Access Token para buscar tus dispositivos"}
                {step === 2 && "Paso 2: Selecciona el dispositivo que quieres conectar"}
                {step === 3 && "Paso 3: Confirma la configuración de tu terminal"}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Access Token de Producción</Label>
                    <Input
                      type="password"
                      placeholder="APP_USR-xxxxxxxxx..."
                      value={formData.accessToken}
                      onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                      data-testid="input-access-token"
                    />
                  </div>
                  
                  <Accordion type="single" collapsible>
                    <AccordionItem value="help">
                      <AccordionTrigger className="text-sm">
                        ¿Dónde encuentro mi Access Token?
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        {selectedProvider === "mercadopago" && (
                          <>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                              <li>Ve a <strong>Mercado Pago Developers</strong></li>
                              <li>Haz clic en <strong>Tus integraciones</strong></li>
                              <li>Selecciona tu aplicación o crea una nueva</li>
                              <li>Ve a <strong>Credenciales de producción</strong></li>
                              <li>Copia el <strong>Access Token</strong></li>
                            </ol>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-2 w-full"
                              onClick={() => window.open("https://www.mercadopago.com/developers/panel", "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                              Ir a Mercado Pago Developers
                            </Button>
                          </>
                        )}
                        {selectedProvider === "clip" && (
                          <>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                              <li>Ve al <strong>Portal de Desarrolladores de Clip</strong></li>
                              <li>Inicia sesión con tu cuenta de Clip</li>
                              <li>Crea una nueva aplicación</li>
                              <li>Copia el <strong>API Key</strong> o <strong>Access Token</strong></li>
                            </ol>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-2 w-full"
                              onClick={() => window.open("https://developer.clip.mx/", "_blank")}
                            >
                              <ExternalLink className="h-4 w-4" />
                              Ir a Clip Developers
                            </Button>
                          </>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  <Button 
                    onClick={handleFetchDevices}
                    disabled={!formData.accessToken || loadingDevices}
                    className="w-full"
                    data-testid="button-fetch-devices"
                  >
                    {loadingDevices ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Buscando dispositivos...
                      </>
                    ) : (
                      <>
                        <Smartphone className="h-4 w-4 mr-2" />
                        Buscar Dispositivos
                      </>
                    )}
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  {devices.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Selecciona tu dispositivo</Label>
                      <div className="grid gap-2">
                        {devices.map((device) => (
                          <Button
                            key={device.id}
                            variant="outline"
                            className="h-auto py-3 px-4 justify-start text-left"
                            onClick={() => handleSelectDevice(device.id)}
                            data-testid={`button-select-device-${device.id}`}
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <CreditCard className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{device.model || "Terminal"}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  ID: {device.id}
                                </p>
                              </div>
                              {device.operatingMode === "PDV" && (
                                <Badge variant="secondary" className="shrink-0">
                                  <Zap className="h-3 w-3 mr-1" />
                                  POS
                                </Badge>
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <p className="text-muted-foreground text-sm mb-4">
                          Ingresa el Device ID de tu terminal manualmente
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Device ID</Label>
                        <Input
                          placeholder="PAX_A910__SMARTPOS123456789"
                          value={formData.deviceId}
                          onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                          data-testid="input-device-id"
                        />
                      </div>
                      <Button
                        onClick={() => setStep(3)}
                        disabled={!formData.deviceId}
                        className="w-full"
                      >
                        Continuar
                      </Button>
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver
                  </Button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Proveedor</span>
                      <span className="font-medium">{providerInfo?.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Device ID</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm truncate max-w-[200px]">
                          {formData.deviceId}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(formData.deviceId)}
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Terminal predeterminada</Label>
                      <p className="text-xs text-muted-foreground">
                        Se usará automáticamente para pagos con tarjeta
                      </p>
                    </div>
                    <Switch
                      checked={formData.isDefault}
                      onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                      data-testid="switch-default"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Terminal activa</Label>
                      <p className="text-xs text-muted-foreground">
                        Desactiva temporalmente sin eliminar
                      </p>
                    </div>
                    <Switch
                      checked={formData.enabled}
                      onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                      data-testid="switch-enabled"
                    />
                  </div>

                  {!editingTerminal && (
                    <Button
                      variant="ghost"
                      onClick={() => setStep(devices.length > 0 ? 2 : 1)}
                      className="w-full"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Volver
                    </Button>
                  )}
                </div>
              )}
            </div>

            {step === 3 && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={saving}
                  style={{ backgroundColor: providerInfo?.color }}
                  data-testid="button-save-terminal"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {editingTerminal ? "Guardar Cambios" : "Conectar Terminal"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
