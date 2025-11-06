import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Settings, Package, Users, TrendingUp, BarChart3, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Product, Customer, TenantConfig } from "@shared/schema";

export default function AdminPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: config } = useQuery<TenantConfig>({
    queryKey: ["/api/config"],
  });

  const [businessName, setBusinessName] = useState("");
  const [domain, setDomain] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");

  // Sync form state with fetched config data
  useEffect(() => {
    if (config) {
      setBusinessName(config.businessName || "");
      setDomain(config.domain || "");
      setPrimaryColor(config.primaryColor || "#3b82f6");
    }
  }, [config]);

  const handleSaveConfig = async () => {
    try {
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          domain,
          primaryColor,
        }),
      });

      if (response.ok) {
        toast({
          title: "Configuración guardada",
          description: "Los cambios se aplicaron exitosamente",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
    }
  };

  const activeProducts = products.filter((p) => p.active);
  const lowStock = products.filter((p) => p.stock <= p.minStock);
  const activeCustomers = customers.filter((c) => c.active);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            data-testid="button-back-to-pos"
          >
            ← Volver al POS
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Productos Activos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-active-products">
                  {activeProducts.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {products.length} totales
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
                <TrendingUp className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive" data-testid="text-low-stock">
                  {lowStock.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Requieren reabastecimiento
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="text-active-customers">
                  {activeCustomers.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {customers.length} totales
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ${products.reduce((sum, p) => sum + (parseFloat(p.cost) * p.stock), 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Costo total de inventario
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Configuration Tabs */}
          <Tabs defaultValue="branding" className="space-y-4">
            <TabsList>
              <TabsTrigger value="branding" data-testid="tab-branding">
                <Palette className="h-4 w-4 mr-2" />
                Marca Blanca
              </TabsTrigger>
              <TabsTrigger value="inventory" data-testid="tab-inventory">
                <Package className="h-4 w-4 mr-2" />
                Inventario
              </TabsTrigger>
              <TabsTrigger value="customers" data-testid="tab-customers">
                <Users className="h-4 w-4 mr-2" />
                Clientes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="branding" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Marca Blanca</CardTitle>
                  <CardDescription>
                    Personaliza el nombre, dominio y colores de tu negocio
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Nombre del Negocio</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Mi Tienda POS"
                      data-testid="input-business-name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domain">Dominio</Label>
                    <Input
                      id="domain"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="mitienda.com"
                      data-testid="input-domain"
                    />
                    <p className="text-sm text-muted-foreground">
                      Este dominio será único para tu instalación
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Color Primario</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-20 h-12"
                        data-testid="input-primary-color"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <Button onClick={handleSaveConfig} data-testid="button-save-config">
                    Guardar Configuración
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Inventario</CardTitle>
                  <CardDescription>
                    {activeProducts.length} productos activos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lowStock.length > 0 && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                        <h3 className="font-semibold text-destructive mb-2">
                          ⚠️ Productos con Stock Bajo
                        </h3>
                        <div className="space-y-2">
                          {lowStock.slice(0, 5).map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span>{product.name}</span>
                              <Badge variant="destructive">
                                Stock: {product.stock}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-2">
                      <h3 className="font-semibold">Productos Activos</h3>
                      <div className="max-h-96 overflow-auto space-y-2">
                        {activeProducts.slice(0, 10).map((product) => (
                          <div
                            key={product.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                            data-testid={`product-row-${product.id}`}
                          >
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                SKU: {product.sku}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold font-mono">
                                ${parseFloat(product.price).toFixed(2)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Stock: {product.stock}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Clientes</CardTitle>
                  <CardDescription>
                    {activeCustomers.length} clientes activos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-auto space-y-2">
                    {activeCustomers.slice(0, 10).map((customer) => (
                      <div
                        key={customer.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                        data-testid={`customer-row-${customer.id}`}
                      >
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {customer.email || customer.phone || "Sin contacto"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            Puntos: {customer.points}
                          </p>
                          {parseFloat(customer.creditBalance) > 0 && (
                            <p className="text-sm text-destructive">
                              Crédito: ${parseFloat(customer.creditBalance).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
