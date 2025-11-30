"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Database } from "lucide-react";
import { toast } from "sonner";

export default function DatabasesPage() {
  const [databases, setDatabases] = useState([
    { id: 1, name: "General", type: "general", status: "active" },
    { id: 2, name: "Restaurantes", type: "restaurant", status: "active" },
  ]);
  const [showForm, setShowForm] = useState(false);
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
    setShowForm(false);
  };

  const handleDeleteDatabase = (id: number) => {
    if (id <= 2) {
      toast.error("No puedes eliminar bases de datos del sistema");
      return;
    }
    setDatabases(databases.filter(d => d.id !== id));
    toast.success("Base de datos eliminada");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bases de Datos</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona las bases de datos generales y por giro de negocio
        </p>
      </div>

      {/* Add Database Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nueva Base de Datos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                placeholder="Ej: Cafeterías"
                value={newDb.name}
                onChange={(e) => setNewDb({ ...newDb, name: e.target.value })}
                data-testid="input-db-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <select
                value={newDb.type}
                onChange={(e) => setNewDb({ ...newDb, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                data-testid="select-db-type"
              >
                <option value="general">General</option>
                <option value="restaurant">Restaurante</option>
                <option value="cafe">Cafetería</option>
                <option value="retail">Retail</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddDatabase} data-testid="button-create-db">
                Crear
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                data-testid="button-cancel-db"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Databases List */}
      <div className="grid gap-4">
        {databases.map((db) => (
          <Card key={db.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">{db.name}</CardTitle>
                  <CardDescription className="capitalize">{db.type}</CardDescription>
                </div>
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
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-muted-foreground">Estado: {db.status}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Button */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)} data-testid="button-add-db">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Base de Datos
        </Button>
      )}
    </div>
  );
}
