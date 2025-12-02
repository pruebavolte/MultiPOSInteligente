"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Settings,
    Store,
    User,
    Receipt,
    Bell,
    Shield,
    Save,
    Building2,
    Database,
    Plus,
    Trash2,
    Globe,
    Printer,
    ChevronRight,
    Truck,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { BrandSettingsForm } from "@/components/brands/brand-settings-form";

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);

    // General settings state
    const [businessName, setBusinessName] = useState("SalvadorX");
    const [businessAddress, setBusinessAddress] = useState("");
    const [businessPhone, setBusinessPhone] = useState("");
    const [businessEmail, setBusinessEmail] = useState("");
    const [taxId, setTaxId] = useState("");

    // POS settings state
    const [autoOpenCashDrawer, setAutoOpenCashDrawer] = useState(true);
    const [printReceiptAutomatically, setPrintReceiptAutomatically] = useState(false);
    const [requireCustomerForSale, setRequireCustomerForSale] = useState(false);
    const [lowStockThreshold, setLowStockThreshold] = useState("10");
    const [currency, setCurrency] = useState("USD");

    // Receipt settings state
    const [receiptHeader, setReceiptHeader] = useState("");
    const [receiptFooter, setReceiptFooter] = useState("");
    const [showTaxOnReceipt, setShowTaxOnReceipt] = useState(true);
    const [showBusinessLogoOnReceipt, setShowBusinessLogoOnReceipt] = useState(false);

    // Notification settings state
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [lowStockAlerts, setLowStockAlerts] = useState(true);
    const [dailySalesReport, setDailySalesReport] = useState(false);

    // Database settings state
    const [databases, setDatabases] = useState([
        { id: 1, name: "General", type: "general", status: "active" },
        { id: 2, name: "Restaurantes", type: "restaurant", status: "active" },
    ]);
    const [showDbForm, setShowDbForm] = useState(false);
    const [newDb, setNewDb] = useState({ name: "", type: "general" });

    const handleAddDatabase = () => {
        if (!newDb.name.trim()) {
            toast.error("El nombre de la base de datos es requerido");
            return;
        }
        setDatabases([
            ...databases,
            {
                id: Math.max(...databases.map(d => d.id)) + 1,
                name: newDb.name,
                type: newDb.type,
                status: "active",
            },
        ]);
        toast.success(`Base de datos "${newDb.name}" creada`);
        setNewDb({ name: "", type: "general" });
        setShowDbForm(false);
    };

    const handleDeleteDatabase = (id: number) => {
        if (id <= 2) {
            toast.error("No puedes eliminar bases de datos del sistema");
            return;
        }
        setDatabases(databases.filter(d => d.id !== id));
        toast.success("Base de datos eliminada");
    };

    const handleSaveGeneralSettings = async () => {
        setLoading(true);
        try {
            // TODO: Implement API call to save settings
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast.success("Configuración general guardada correctamente");
        } catch (error) {
            toast.error("Error al guardar la configuración");
        } finally {
            setLoading(false);
        }
    };

    const handleSavePOSSettings = async () => {
        setLoading(true);
        try {
            // TODO: Implement API call to save settings
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast.success("Configuración de POS guardada correctamente");
        } catch (error) {
            toast.error("Error al guardar la configuración");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveReceiptSettings = async () => {
        setLoading(true);
        try {
            // TODO: Implement API call to save settings
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast.success("Configuración de recibos guardada correctamente");
        } catch (error) {
            toast.error("Error al guardar la configuración");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNotificationSettings = async () => {
        setLoading(true);
        try {
            // TODO: Implement API call to save settings
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast.success("Configuración de notificaciones guardada correctamente");
        } catch (error) {
            toast.error("Error al guardar la configuración");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-8">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                        Configuración
                    </h1>
                    <p className="text-muted-foreground">
                        Administra la configuración de tu sistema de punto de venta
                    </p>
                </div>

                {/* Quick Access - Platforms & Printers */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Link href="/dashboard/settings/platforms" data-testid="link-platforms-config">
                        <Card className="hover-elevate cursor-pointer transition-all border-2 border-transparent hover:border-primary/20">
                            <CardContent className="flex items-center justify-between p-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                                        <Truck className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Plataformas</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Uber Eats, Didi Food, Rappi y más
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/dashboard/settings/printers" data-testid="link-printers-config">
                        <Card className="hover-elevate cursor-pointer transition-all border-2 border-transparent hover:border-primary/20">
                            <CardContent className="flex items-center justify-between p-6">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                                        <Printer className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Impresoras</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Configurar impresoras térmicas 58mm y 80mm
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Settings Tabs */}
                <Tabs defaultValue="brand" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                        <TabsTrigger value="brand" className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Marca</span>
                        </TabsTrigger>
                        <TabsTrigger value="general" className="flex items-center gap-2">
                            <Store className="h-4 w-4" />
                            <span className="hidden sm:inline">General</span>
                        </TabsTrigger>
                        <TabsTrigger value="pos" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            <span className="hidden sm:inline">POS</span>
                        </TabsTrigger>
                        <TabsTrigger value="receipt" className="flex items-center gap-2">
                            <Receipt className="h-4 w-4" />
                            <span className="hidden sm:inline">Recibos</span>
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            <span className="hidden sm:inline">Notificaciones</span>
                        </TabsTrigger>
                        <TabsTrigger value="databases" className="flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            <span className="hidden sm:inline">Bases de Datos</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Brand Settings */}
                    <TabsContent value="brand" className="space-y-4">
                        <BrandSettingsForm />
                    </TabsContent>

                    {/* General Settings */}
                    <TabsContent value="general" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Store className="h-5 w-5" />
                                    Información del Negocio
                                </CardTitle>
                                <CardDescription>
                                    Configure la información básica de su negocio
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="businessName">Nombre del Negocio</Label>
                                        <Input
                                            id="businessName"
                                            value={businessName}
                                            onChange={(e) => setBusinessName(e.target.value)}
                                            placeholder="Ej: Mi Tienda"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="taxId">RUT/NIT</Label>
                                        <Input
                                            id="taxId"
                                            value={taxId}
                                            onChange={(e) => setTaxId(e.target.value)}
                                            placeholder="Ej: 12345678-9"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="businessAddress">Dirección</Label>
                                    <Input
                                        id="businessAddress"
                                        value={businessAddress}
                                        onChange={(e) => setBusinessAddress(e.target.value)}
                                        placeholder="Ej: Calle Principal #123"
                                    />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="businessPhone">Teléfono</Label>
                                        <Input
                                            id="businessPhone"
                                            value={businessPhone}
                                            onChange={(e) => setBusinessPhone(e.target.value)}
                                            placeholder="Ej: +503 1234-5678"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="businessEmail">Email</Label>
                                        <Input
                                            id="businessEmail"
                                            type="email"
                                            value={businessEmail}
                                            onChange={(e) => setBusinessEmail(e.target.value)}
                                            placeholder="Ej: contacto@mitienda.com"
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div className="flex justify-end">
                                    <Button onClick={handleSaveGeneralSettings} disabled={loading}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Guardar Cambios
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* POS Settings */}
                    <TabsContent value="pos" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5" />
                                    Configuración del Punto de Venta
                                </CardTitle>
                                <CardDescription>
                                    Configure el comportamiento del sistema POS
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="autoOpenCashDrawer">
                                            Abrir cajón automáticamente
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Abre el cajón de dinero después de cada venta
                                        </p>
                                    </div>
                                    <Switch
                                        id="autoOpenCashDrawer"
                                        checked={autoOpenCashDrawer}
                                        onCheckedChange={setAutoOpenCashDrawer}
                                    />
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="printReceiptAutomatically">
                                            Imprimir recibo automáticamente
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Imprime el recibo después de cada venta
                                        </p>
                                    </div>
                                    <Switch
                                        id="printReceiptAutomatically"
                                        checked={printReceiptAutomatically}
                                        onCheckedChange={setPrintReceiptAutomatically}
                                    />
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="requireCustomerForSale">
                                            Requerir cliente para venta
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Obliga a seleccionar un cliente antes de completar una venta
                                        </p>
                                    </div>
                                    <Switch
                                        id="requireCustomerForSale"
                                        checked={requireCustomerForSale}
                                        onCheckedChange={setRequireCustomerForSale}
                                    />
                                </div>

                                <Separator />

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="lowStockThreshold">
                                            Umbral de stock bajo
                                        </Label>
                                        <Input
                                            id="lowStockThreshold"
                                            type="number"
                                            value={lowStockThreshold}
                                            onChange={(e) => setLowStockThreshold(e.target.value)}
                                            min="1"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Alerta cuando el stock esté por debajo de este número
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="currency">Moneda</Label>
                                        <Select value={currency} onValueChange={setCurrency}>
                                            <SelectTrigger id="currency">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="USD">USD ($)</SelectItem>
                                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                                <SelectItem value="MXN">MXN ($)</SelectItem>
                                                <SelectItem value="CRC">CRC (₡)</SelectItem>
                                                <SelectItem value="GTQ">GTQ (Q)</SelectItem>
                                                <SelectItem value="HNL">HNL (L)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Separator />

                                <div className="flex justify-end">
                                    <Button onClick={handleSavePOSSettings} disabled={loading}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Guardar Cambios
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Receipt Settings */}
                    <TabsContent value="receipt" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Receipt className="h-5 w-5" />
                                    Configuración de Recibos
                                </CardTitle>
                                <CardDescription>
                                    Personalice el formato de sus recibos
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="receiptHeader">Encabezado del Recibo</Label>
                                    <Input
                                        id="receiptHeader"
                                        value={receiptHeader}
                                        onChange={(e) => setReceiptHeader(e.target.value)}
                                        placeholder="Ej: ¡Gracias por su compra!"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Texto que aparece en la parte superior del recibo
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="receiptFooter">Pie del Recibo</Label>
                                    <Input
                                        id="receiptFooter"
                                        value={receiptFooter}
                                        onChange={(e) => setReceiptFooter(e.target.value)}
                                        placeholder="Ej: Vuelva pronto"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Texto que aparece en la parte inferior del recibo
                                    </p>
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="showTaxOnReceipt">
                                            Mostrar impuestos en recibo
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Muestra el desglose de impuestos en el recibo
                                        </p>
                                    </div>
                                    <Switch
                                        id="showTaxOnReceipt"
                                        checked={showTaxOnReceipt}
                                        onCheckedChange={setShowTaxOnReceipt}
                                    />
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="showBusinessLogoOnReceipt">
                                            Mostrar logo en recibo
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Incluye el logo del negocio en el recibo impreso
                                        </p>
                                    </div>
                                    <Switch
                                        id="showBusinessLogoOnReceipt"
                                        checked={showBusinessLogoOnReceipt}
                                        onCheckedChange={setShowBusinessLogoOnReceipt}
                                    />
                                </div>

                                <Separator />

                                <div className="flex justify-end">
                                    <Button onClick={handleSaveReceiptSettings} disabled={loading}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Guardar Cambios
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Notification Settings */}
                    <TabsContent value="notifications" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Bell className="h-5 w-5" />
                                    Configuración de Notificaciones
                                </CardTitle>
                                <CardDescription>
                                    Administre cómo y cuándo recibir notificaciones
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="emailNotifications">
                                            Notificaciones por email
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Recibe notificaciones importantes por correo electrónico
                                        </p>
                                    </div>
                                    <Switch
                                        id="emailNotifications"
                                        checked={emailNotifications}
                                        onCheckedChange={setEmailNotifications}
                                    />
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="lowStockAlerts">
                                            Alertas de stock bajo
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Notifica cuando los productos alcancen el umbral de stock bajo
                                        </p>
                                    </div>
                                    <Switch
                                        id="lowStockAlerts"
                                        checked={lowStockAlerts}
                                        onCheckedChange={setLowStockAlerts}
                                    />
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="dailySalesReport">
                                            Reporte diario de ventas
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Recibe un resumen de ventas al final de cada día
                                        </p>
                                    </div>
                                    <Switch
                                        id="dailySalesReport"
                                        checked={dailySalesReport}
                                        onCheckedChange={setDailySalesReport}
                                    />
                                </div>

                                <Separator />

                                <div className="flex justify-end">
                                    <Button onClick={handleSaveNotificationSettings} disabled={loading}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Guardar Cambios
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Database Settings */}
                    <TabsContent value="databases" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="h-5 w-5" />
                                    Bases de Datos
                                </CardTitle>
                                <CardDescription>
                                    Gestiona las bases de datos generales y por giro de negocio
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Add Database Form */}
                                {showDbForm && (
                                    <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
                                        <div className="space-y-2">
                                            <Label>Nombre de la Base de Datos</Label>
                                            <Input
                                                placeholder="Ej: Cafeterías"
                                                value={newDb.name}
                                                onChange={(e) => setNewDb({ ...newDb, name: e.target.value })}
                                                data-testid="input-db-name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Tipo / Giro de Negocio</Label>
                                            <Select
                                                value={newDb.type}
                                                onValueChange={(val) => setNewDb({ ...newDb, type: val })}
                                            >
                                                <SelectTrigger data-testid="select-db-type">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="general">General</SelectItem>
                                                    <SelectItem value="restaurant">Restaurante</SelectItem>
                                                    <SelectItem value="cafe">Cafetería</SelectItem>
                                                    <SelectItem value="retail">Retail / Tienda</SelectItem>
                                                    <SelectItem value="pharmacy">Farmacia</SelectItem>
                                                    <SelectItem value="other">Otro</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={handleAddDatabase} data-testid="button-create-db">
                                                Crear Base de Datos
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowDbForm(false)}
                                                data-testid="button-cancel-db"
                                            >
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Databases List */}
                                <div className="space-y-3">
                                    {databases.map((db) => (
                                        <div
                                            key={db.id}
                                            className="flex items-center justify-between p-4 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Database className="h-5 w-5 text-primary" />
                                                <div>
                                                    <p className="font-medium">{db.name}</p>
                                                    <p className="text-sm text-muted-foreground capitalize">
                                                        {db.type}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1">
                                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                                    <span className="text-sm text-muted-foreground">
                                                        {db.status}
                                                    </span>
                                                </div>
                                                {db.id > 2 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteDatabase(db.id)}
                                                        data-testid={`button-delete-db-${db.id}`}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Separator />

                                {/* Add Button */}
                                {!showDbForm && (
                                    <Button onClick={() => setShowDbForm(true)} data-testid="button-add-db">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Agregar Base de Datos
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
