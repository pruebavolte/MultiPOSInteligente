"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Store,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  Star,
  Crown,
  Sparkles,
  Package,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  FolderTree,
  Settings2,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

interface VerticalCategory {
  id: string;
  name: string;
  display_name: string;
  display_name_en?: string;
  icon?: string;
  sort_order: number;
  verticals?: Vertical[];
}

interface Vertical {
  id: string;
  name: string;
  slug?: string;
  display_name: string;
  display_name_en?: string;
  description?: string;
  icon?: string;
  category_id?: string;
  suggested_system_name?: string;
  suggested_domain_prefix?: string;
  popularity_score: number;
  sort_order: number;
  active: boolean;
}

interface VerticalTerminology {
  customer_singular: string;
  customer_plural: string;
  product_singular: string;
  product_plural: string;
  order_singular: string;
  order_plural: string;
  staff_singular: string;
  staff_plural: string;
  appointment_singular: string;
  appointment_plural: string;
}

interface VerticalModuleConfig {
  id: string;
  module_id: string;
  enabled_by_default: boolean;
  is_required: boolean;
  is_recommended: boolean;
  module?: SystemModule;
}

interface SystemModule {
  id: string;
  key: string;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  icon?: string;
  category: string;
  is_premium: boolean;
  is_ai_feature: boolean;
}

interface VerticalDetail extends Vertical {
  terminology?: VerticalTerminology;
  module_configs?: VerticalModuleConfig[];
  features?: Array<{
    feature_key: string;
    feature_name: string;
    enabled_by_default: boolean;
    is_premium: boolean;
  }>;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Store: Store,
  Package: Package,
  Users: Users,
  Calendar: Calendar,
  CreditCard: CreditCard,
  BarChart3: BarChart3,
  FolderTree: FolderTree,
  Star: Star,
  Crown: Crown,
  Sparkles: Sparkles,
  Settings2: Settings2,
  Layers: Layers,
};

const DynamicIcon = ({ name, className }: { name?: string; className?: string }) => {
  const IconComponent = name ? iconMap[name] : Store;
  return IconComponent ? <IconComponent className={className} /> : <Store className={className} />;
};

export default function VerticalsAdminPage() {
  const [language] = useState<"es" | "en">("es");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVertical, setSelectedVertical] = useState<VerticalDetail | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("all");

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/verticals/categories", { includeVerticals: true }],
    queryFn: async () => {
      const res = await fetch("/api/verticals/categories?includeVerticals=true");
      const json = await res.json();
      return json.data as VerticalCategory[];
    },
  });

  const { data: allVerticals, isLoading: verticalsLoading } = useQuery({
    queryKey: ["/api/verticals"],
    queryFn: async () => {
      const res = await fetch("/api/verticals");
      const json = await res.json();
      return json.data as Vertical[];
    },
  });

  const { data: modulesData } = useQuery({
    queryKey: ["/api/verticals/modules"],
    queryFn: async () => {
      const res = await fetch("/api/verticals/modules");
      const json = await res.json();
      return json.data as SystemModule[];
    },
  });

  const { data: verticalDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["/api/verticals", selectedVertical?.id],
    queryFn: async () => {
      if (!selectedVertical?.id) return null;
      const res = await fetch(`/api/verticals?id=${selectedVertical.id}&details=true`);
      const json = await res.json();
      return json.data as VerticalDetail;
    },
    enabled: !!selectedVertical?.id,
  });

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const filteredVerticals = allVerticals?.filter((v) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.display_name.toLowerCase().includes(query) ||
      v.name.toLowerCase().includes(query) ||
      v.description?.toLowerCase().includes(query)
    );
  });

  const popularVerticals = allVerticals
    ?.filter((v) => v.popularity_score >= 80)
    .sort((a, b) => b.popularity_score - a.popularity_score)
    .slice(0, 20);

  const isLoading = categoriesLoading || verticalsLoading;

  const t = {
    title: language === "es" ? "Giros de Negocio" : "Business Verticals",
    subtitle: language === "es" 
      ? "Gestiona los tipos de negocio disponibles en el sistema" 
      : "Manage available business types in the system",
    search: language === "es" ? "Buscar giros de negocio..." : "Search business types...",
    all: language === "es" ? "Todos" : "All",
    popular: language === "es" ? "Populares" : "Popular",
    byCategory: language === "es" ? "Por Categoría" : "By Category",
    modules: language === "es" ? "Módulos" : "Modules",
    totalVerticals: language === "es" ? "giros de negocio" : "business types",
    categories: language === "es" ? "categorías" : "categories",
    moduleCategories: {
      core: language === "es" ? "Básicos" : "Core",
      sales: language === "es" ? "Ventas" : "Sales",
      operations: language === "es" ? "Operaciones" : "Operations",
      marketing: language === "es" ? "Marketing" : "Marketing",
      ai: language === "es" ? "IA" : "AI",
      integrations: language === "es" ? "Integraciones" : "Integrations",
      compliance: language === "es" ? "Cumplimiento" : "Compliance",
    },
    terminology: language === "es" ? "Terminología" : "Terminology",
    suggestedName: language === "es" ? "Nombre sugerido" : "Suggested name",
    suggestedDomain: language === "es" ? "Dominio sugerido" : "Suggested domain",
    enabledModules: language === "es" ? "Módulos habilitados" : "Enabled modules",
    required: language === "es" ? "Requerido" : "Required",
    recommended: language === "es" ? "Recomendado" : "Recommended",
    optional: language === "es" ? "Opcional" : "Optional",
    premium: language === "es" ? "Premium" : "Premium",
    ai: language === "es" ? "IA" : "AI",
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
            <Store className="h-6 w-6" />
            {t.title}
          </h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span data-testid="total-verticals">
            {allVerticals?.length || 0} {t.totalVerticals}
          </span>
          <span data-testid="total-categories">
            {categoriesData?.length || 0} {t.categories}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all" data-testid="tab-all">{t.all}</TabsTrigger>
                  <TabsTrigger value="popular" data-testid="tab-popular">{t.popular}</TabsTrigger>
                  <TabsTrigger value="categories" data-testid="tab-categories">{t.byCategory}</TabsTrigger>
                  <TabsTrigger value="modules" data-testid="tab-modules">{t.modules}</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(8)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Tabs value={activeTab}>
                  <TabsContent value="all" className="mt-0">
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredVerticals?.map((vertical) => (
                          <VerticalCard
                            key={vertical.id}
                            vertical={vertical}
                            isSelected={selectedVertical?.id === vertical.id}
                            onClick={() => setSelectedVertical(vertical as VerticalDetail)}
                            language={language}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="popular" className="mt-0">
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {popularVerticals?.map((vertical) => (
                          <VerticalCard
                            key={vertical.id}
                            vertical={vertical}
                            isSelected={selectedVertical?.id === vertical.id}
                            onClick={() => setSelectedVertical(vertical as VerticalDetail)}
                            language={language}
                            showPopularity
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="categories" className="mt-0">
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-2">
                        {categoriesData?.map((category) => (
                          <Collapsible
                            key={category.id}
                            open={expandedCategories.has(category.id)}
                            onOpenChange={() => toggleCategory(category.id)}
                          >
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-accent/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <DynamicIcon name={category.icon} className="h-5 w-5 text-primary" />
                                <span className="font-medium">
                                  {language === "es" ? category.display_name : category.display_name_en || category.display_name}
                                </span>
                                <Badge variant="secondary" className="ml-2">
                                  {category.verticals?.length || 0}
                                </Badge>
                              </div>
                              {expandedCategories.has(category.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pl-6 space-y-2 mt-2">
                              {category.verticals?.map((vertical) => (
                                <VerticalCard
                                  key={vertical.id}
                                  vertical={vertical}
                                  isSelected={selectedVertical?.id === vertical.id}
                                  onClick={() => setSelectedVertical(vertical as VerticalDetail)}
                                  language={language}
                                  compact
                                />
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="modules" className="mt-0">
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-6">
                        {["core", "sales", "operations", "marketing", "ai", "integrations", "compliance"].map(
                          (category) => {
                            const categoryModules = modulesData?.filter((m) => m.category === category);
                            if (!categoryModules?.length) return null;
                            return (
                              <div key={category}>
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                  {t.moduleCategories[category as keyof typeof t.moduleCategories]}
                                  <Badge variant="outline">{categoryModules.length}</Badge>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {categoryModules.map((module) => (
                                    <div
                                      key={module.id}
                                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <DynamicIcon name={module.icon} className="h-4 w-4" />
                                          <span className="font-medium text-sm">
                                            {language === "es" ? module.name : module.name_en || module.name}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          {module.is_premium && (
                                            <Badge variant="secondary" className="text-xs">
                                              <Crown className="h-3 w-3 mr-1" />
                                              Premium
                                            </Badge>
                                          )}
                                          {module.is_ai_feature && (
                                            <Badge variant="secondary" className="text-xs">
                                              <Sparkles className="h-3 w-3 mr-1" />
                                              IA
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      {module.description && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                          {language === "es" ? module.description : module.description_en || module.description}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {selectedVertical
                  ? language === "es"
                    ? selectedVertical.display_name
                    : selectedVertical.display_name_en || selectedVertical.display_name
                  : language === "es"
                  ? "Selecciona un giro"
                  : "Select a vertical"}
              </CardTitle>
              {selectedVertical && (
                <CardDescription>{selectedVertical.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {selectedVertical ? (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6">
                    {selectedVertical.suggested_system_name && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t.suggestedName}</h4>
                        <Badge variant="outline" className="text-base">
                          {selectedVertical.suggested_system_name}
                        </Badge>
                      </div>
                    )}

                    {selectedVertical.suggested_domain_prefix && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">{t.suggestedDomain}</h4>
                        <code className="px-2 py-1 bg-muted rounded text-sm">
                          {selectedVertical.suggested_domain_prefix}.tupos.com
                        </code>
                      </div>
                    )}

                    {verticalDetail?.terminology && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">{t.terminology}</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <TermItem
                            label="Cliente"
                            value={verticalDetail.terminology.customer_singular}
                            plural={verticalDetail.terminology.customer_plural}
                          />
                          <TermItem
                            label="Producto"
                            value={verticalDetail.terminology.product_singular}
                            plural={verticalDetail.terminology.product_plural}
                          />
                          <TermItem
                            label="Orden"
                            value={verticalDetail.terminology.order_singular}
                            plural={verticalDetail.terminology.order_plural}
                          />
                          <TermItem
                            label="Personal"
                            value={verticalDetail.terminology.staff_singular}
                            plural={verticalDetail.terminology.staff_plural}
                          />
                        </div>
                      </div>
                    )}

                    {verticalDetail?.module_configs && verticalDetail.module_configs.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">{t.enabledModules}</h4>
                        <div className="space-y-2">
                          {verticalDetail.module_configs
                            .filter((mc) => mc.is_required)
                            .map((mc) => (
                              <ModuleItem
                                key={mc.id}
                                config={mc}
                                type="required"
                                t={t}
                                language={language}
                              />
                            ))}
                          {verticalDetail.module_configs
                            .filter((mc) => mc.is_recommended && !mc.is_required)
                            .map((mc) => (
                              <ModuleItem
                                key={mc.id}
                                config={mc}
                                type="recommended"
                                t={t}
                                language={language}
                              />
                            ))}
                          {verticalDetail.module_configs
                            .filter((mc) => !mc.is_required && !mc.is_recommended)
                            .slice(0, 5)
                            .map((mc) => (
                              <ModuleItem
                                key={mc.id}
                                config={mc}
                                type="optional"
                                t={t}
                                language={language}
                              />
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                  <Store className="h-12 w-12 mb-4 opacity-50" />
                  <p>
                    {language === "es"
                      ? "Selecciona un giro de negocio para ver sus detalles"
                      : "Select a business type to view details"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function VerticalCard({
  vertical,
  isSelected,
  onClick,
  language,
  compact = false,
  showPopularity = false,
}: {
  vertical: Vertical;
  isSelected: boolean;
  onClick: () => void;
  language: string;
  compact?: boolean;
  showPopularity?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "hover:border-primary/50 hover:bg-accent/50"
      } ${compact ? "py-2" : ""}`}
      onClick={onClick}
      data-testid={`vertical-card-${vertical.slug || vertical.name}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-primary/10 ${compact ? "p-1.5" : ""}`}>
          <DynamicIcon name={vertical.icon} className={`text-primary ${compact ? "h-4 w-4" : "h-5 w-5"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-medium truncate ${compact ? "text-sm" : ""}`}>
              {language === "es" ? vertical.display_name : vertical.display_name_en || vertical.display_name}
            </span>
            {showPopularity && (
              <Badge variant="secondary" className="text-xs shrink-0">
                <Star className="h-3 w-3 mr-1 fill-current" />
                {vertical.popularity_score}
              </Badge>
            )}
          </div>
          {!compact && vertical.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {vertical.description}
            </p>
          )}
        </div>
        {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
      </div>
    </div>
  );
}

function TermItem({ label, value, plural }: { label: string; value: string; plural: string }) {
  return (
    <div className="p-2 rounded bg-muted/50">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
      <div className="text-xs text-muted-foreground">({plural})</div>
    </div>
  );
}

function ModuleItem({
  config,
  type,
  t,
  language,
}: {
  config: VerticalModuleConfig;
  type: "required" | "recommended" | "optional";
  t: { required: string; recommended: string; optional: string; premium: string; ai: string };
  language: string;
}) {
  const typeColors = {
    required: "bg-green-500/10 text-green-600 border-green-500/30",
    recommended: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    optional: "bg-muted text-muted-foreground",
  };

  const typeLabels: Record<string, string> = {
    required: t.required,
    recommended: t.recommended,
    optional: t.optional,
  };

  return (
    <div className={`flex items-center justify-between p-2 rounded-lg border ${typeColors[type]}`}>
      <div className="flex items-center gap-2">
        <DynamicIcon name={config.module?.icon} className="h-4 w-4" />
        <span className="text-sm font-medium">
          {language === "es"
            ? config.module?.name
            : config.module?.name_en || config.module?.name}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {config.module?.is_premium && (
          <Crown className="h-3 w-3 text-amber-500" />
        )}
        {config.module?.is_ai_feature && (
          <Sparkles className="h-3 w-3 text-purple-500" />
        )}
        <Badge variant="outline" className="text-xs">
          {typeLabels[type] || type}
        </Badge>
      </div>
    </div>
  );
}
