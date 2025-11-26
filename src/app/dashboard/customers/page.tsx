"use client";

import { useState } from "react";
import { useCustomers, useCustomerMutations } from "@/hooks/use-customers";
import { Customer } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  CreditCard,
  Award,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomerModal } from "@/components/customers/customer-modal";
import { toast } from "sonner";

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [creditFilter, setCreditFilter] = useState<string>("all");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { customers, loading, page, totalPages, setPage, updateFilter, refresh } = useCustomers();
  const { remove } = useCustomerMutations();

  // Apply filters
  const handleSearch = () => {
    updateFilter({
      search: searchQuery || undefined,
      has_credit: creditFilter === "with_credit" ? true : creditFilter === "no_credit" ? false : undefined,
    });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setCreditFilter("all");
    updateFilter({});
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingCustomer(null);
    setCustomerModalOpen(true);
  };

  const handleCloseModal = () => {
    setCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  const handleDelete = async (customer: Customer) => {
    // Verificar si el cliente tiene saldo pendiente
    if (customer.credit_balance > 0) {
      toast.error(
        `No se puede eliminar a ${customer.name} porque tiene un saldo pendiente de $${customer.credit_balance.toFixed(2)}`,
        { duration: 5000 }
      );
      return;
    }

    if (window.confirm(`¿Estás seguro de eliminar al cliente "${customer.name}"?\n\nEsta acción no se puede deshacer.`)) {
      try {
        await remove(customer.id);
        toast.success("Cliente eliminado correctamente");
        refresh();
      } catch (error) {
        toast.error("Error al eliminar cliente");
      }
    }
  };

  const totalCustomers = customers.length;
  const customersWithCredit = customers.filter((c) => c.credit_balance > 0).length;
  const totalCreditBalance = customers.reduce((sum, c) => sum + c.credit_balance, 0);
  const totalPoints = customers.reduce((sum, c) => sum + c.points, 0);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Clientes
            </h1>
            <p className="text-muted-foreground mt-2">
              Gestiona tu base de clientes y cuentas por cobrar
            </p>
          </div>
          <Button onClick={handleAddNew} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Agregar Cliente
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Clientes
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Clientes con Crédito
              </CardTitle>
              <CreditCard className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {customersWithCredit}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total por Cobrar
              </CardTitle>
              <CreditCard className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${totalCreditBalance.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Puntos Totales
              </CardTitle>
              <Award className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {totalPoints.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>
              Busca y filtra clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={creditFilter === "all" ? "default" : "outline"}
                  onClick={() => {
                    setCreditFilter("all");
                    updateFilter({ search: searchQuery || undefined });
                  }}
                >
                  Todos
                </Button>
                <Button
                  variant={creditFilter === "with_credit" ? "default" : "outline"}
                  onClick={() => {
                    setCreditFilter("with_credit");
                    updateFilter({
                      search: searchQuery || undefined,
                      has_credit: true,
                    });
                  }}
                >
                  Con Crédito
                </Button>
                <Button
                  variant={creditFilter === "no_credit" ? "default" : "outline"}
                  onClick={() => {
                    setCreditFilter("no_credit");
                    updateFilter({
                      search: searchQuery || undefined,
                      has_credit: false,
                    });
                  }}
                >
                  Sin Crédito
                </Button>
              </div>
              <Button onClick={handleSearch}>Buscar</Button>
              <Button variant="outline" onClick={handleClearFilters}>
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead className="text-right">Límite Crédito</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Puntos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Cargando clientes...
                      </TableCell>
                    </TableRow>
                  ) : customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No se encontraron clientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => {
                      const creditUsed = (customer.credit_balance / customer.credit_limit) * 100;

                      return (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div className="font-medium">{customer.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {customer.email || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{customer.phone || "N/A"}</div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${customer.credit_limit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div
                              className={cn(
                                "font-semibold",
                                customer.credit_balance > 0 && "text-red-600"
                              )}
                            >
                              ${customer.credit_balance.toFixed(2)}
                            </div>
                            {customer.credit_balance > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {creditUsed.toFixed(0)}% usado
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Award className="h-3 w-3 text-yellow-500" />
                              <span className="font-medium">{customer.points}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {customer.active ? (
                              <Badge variant="default" className="bg-green-600">
                                Activo
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactivo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(customer)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Ver Historial
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(customer)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Modal */}
      <CustomerModal
        open={customerModalOpen}
        onOpenChange={handleCloseModal}
        customer={editingCustomer}
      />
    </div>
  );
}
