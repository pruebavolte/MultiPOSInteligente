-- Migration: Complete All Business Verticals (250+)
-- Description: All business types with specific terminology, modules, and configurations
-- Includes: Health & Services (consultorios, farmacias), all specialty stores

-- ============================================
-- ENSURE temp_insert_vertical FUNCTION EXISTS
-- ============================================
CREATE OR REPLACE FUNCTION temp_insert_vertical(
  p_category_name TEXT,
  p_name TEXT,
  p_slug TEXT,
  p_display_name TEXT,
  p_display_name_en TEXT,
  p_description TEXT,
  p_icon TEXT,
  p_suggested_system_name TEXT,
  p_suggested_domain_prefix TEXT,
  p_popularity INTEGER,
  p_sort INTEGER,
  p_customer_singular TEXT DEFAULT 'Cliente',
  p_customer_plural TEXT DEFAULT 'Clientes',
  p_product_singular TEXT DEFAULT 'Producto',
  p_product_plural TEXT DEFAULT 'Productos',
  p_order_singular TEXT DEFAULT 'Orden',
  p_order_plural TEXT DEFAULT 'Órdenes',
  p_required_modules TEXT[] DEFAULT ARRAY['pos', 'inventory', 'customers', 'reports'],
  p_recommended_modules TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_optional_modules TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS UUID AS $$
DECLARE
  v_category_id UUID;
  v_vertical_id UUID;
  v_module_id UUID;
  v_module_key TEXT;
BEGIN
  SELECT id INTO v_category_id FROM vertical_categories WHERE name = p_category_name;
  
  INSERT INTO verticals (name, slug, display_name, display_name_en, description, icon, category_id, 
    suggested_system_name, suggested_domain_prefix, popularity_score, sort_order, active)
  VALUES (p_name, p_slug, p_display_name, p_display_name_en, p_description, p_icon, v_category_id,
    p_suggested_system_name, p_suggested_domain_prefix, p_popularity, p_sort, true)
  ON CONFLICT (name) DO UPDATE SET
    slug = EXCLUDED.slug,
    display_name = EXCLUDED.display_name,
    display_name_en = EXCLUDED.display_name_en,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    category_id = EXCLUDED.category_id,
    suggested_system_name = EXCLUDED.suggested_system_name,
    suggested_domain_prefix = EXCLUDED.suggested_domain_prefix,
    popularity_score = EXCLUDED.popularity_score,
    sort_order = EXCLUDED.sort_order
  RETURNING id INTO v_vertical_id;
  
  INSERT INTO vertical_terminology (vertical_id, customer_singular, customer_plural, 
    product_singular, product_plural, order_singular, order_plural)
  VALUES (v_vertical_id, p_customer_singular, p_customer_plural, 
    p_product_singular, p_product_plural, p_order_singular, p_order_plural)
  ON CONFLICT (vertical_id) DO UPDATE SET
    customer_singular = EXCLUDED.customer_singular,
    customer_plural = EXCLUDED.customer_plural,
    product_singular = EXCLUDED.product_singular,
    product_plural = EXCLUDED.product_plural,
    order_singular = EXCLUDED.order_singular,
    order_plural = EXCLUDED.order_plural;
  
  FOREACH v_module_key IN ARRAY p_required_modules
  LOOP
    SELECT id INTO v_module_id FROM system_modules WHERE key = v_module_key;
    IF v_module_id IS NOT NULL THEN
      INSERT INTO vertical_module_configs (vertical_id, module_id, enabled_by_default, is_required, is_recommended)
      VALUES (v_vertical_id, v_module_id, true, true, false)
      ON CONFLICT (vertical_id, module_id) DO UPDATE SET
        enabled_by_default = true, is_required = true;
    END IF;
  END LOOP;
  
  FOREACH v_module_key IN ARRAY p_recommended_modules
  LOOP
    SELECT id INTO v_module_id FROM system_modules WHERE key = v_module_key;
    IF v_module_id IS NOT NULL THEN
      INSERT INTO vertical_module_configs (vertical_id, module_id, enabled_by_default, is_required, is_recommended)
      VALUES (v_vertical_id, v_module_id, true, false, true)
      ON CONFLICT (vertical_id, module_id) DO UPDATE SET
        enabled_by_default = true, is_recommended = true;
    END IF;
  END LOOP;
  
  FOREACH v_module_key IN ARRAY p_optional_modules
  LOOP
    SELECT id INTO v_module_id FROM system_modules WHERE key = v_module_key;
    IF v_module_id IS NOT NULL THEN
      INSERT INTO vertical_module_configs (vertical_id, module_id, enabled_by_default, is_required, is_recommended)
      VALUES (v_vertical_id, v_module_id, false, false, false)
      ON CONFLICT (vertical_id, module_id) DO UPDATE SET
        enabled_by_default = false;
    END IF;
  END LOOP;
  
  RETURN v_vertical_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HEALTH & WELLNESS / SERVICES CATEGORY
-- Special terminology: Paciente, Consulta, Receta, Tratamiento
-- ============================================

-- Consultorio Médico General
SELECT temp_insert_vertical('health', 'consultorio_medico', 'consultorio-medico', 
  'Consultorio Médico', 'Medical Office', 
  'Consultorio de medicina general con expedientes digitales', 'Stethoscope', 
  'MedicoPos', 'consultoriomedico', 95, 1,
  'Paciente', 'Pacientes', 'Servicio', 'Servicios', 'Consulta', 'Consultas',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management'], 
  ARRAY['whatsapp_integration', 'email_marketing']);

-- Consultorio Dental
SELECT temp_insert_vertical('health', 'consultorio_dental', 'consultorio-dental', 
  'Consultorio Dental', 'Dental Office', 
  'Clínica dental con control de tratamientos', 'Smile', 
  'DentalPos', 'clinicadental', 90, 2,
  'Paciente', 'Pacientes', 'Tratamiento', 'Tratamientos', 'Cita', 'Citas',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management'], 
  ARRAY['whatsapp_integration']);

-- Farmacia
SELECT temp_insert_vertical('health', 'farmacia', 'farmacia', 
  'Farmacia', 'Pharmacy', 
  'Farmacia con control de medicamentos y recetas', 'Pill', 
  'FarmaciaPos', 'farmacia', 95, 3,
  'Cliente', 'Clientes', 'Medicamento', 'Medicamentos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['expiry_tracking', 'batch_tracking', 'suppliers'], 
  ARRAY['delivery', 'loyalty_program']);

-- Clínica de Especialidades
SELECT temp_insert_vertical('health', 'clinica_especialidades', 'clinica-especialidades', 
  'Clínica de Especialidades', 'Specialty Clinic', 
  'Clínica con múltiples especialidades médicas', 'Building2', 
  'ClinicaPos', 'clinica', 85, 4,
  'Paciente', 'Pacientes', 'Consulta', 'Consultas', 'Cita', 'Citas',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management', 'queue_management'], 
  ARRAY['whatsapp_integration', 'email_marketing']);

-- Laboratorio Clínico
SELECT temp_insert_vertical('health', 'laboratorio_clinico', 'laboratorio-clinico', 
  'Laboratorio Clínico', 'Clinical Laboratory', 
  'Laboratorio de análisis clínicos', 'TestTube', 
  'LabPos', 'laboratorio', 80, 5,
  'Paciente', 'Pacientes', 'Estudio', 'Estudios', 'Orden', 'Órdenes',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'queue_management'], 
  ARRAY['whatsapp_integration']);

-- Óptica
SELECT temp_insert_vertical('health', 'optica', 'optica', 
  'Óptica', 'Optical Shop', 
  'Óptica con exámenes de la vista y venta de lentes', 'Eye', 
  'OpticaPos', 'optica', 85, 6,
  'Paciente', 'Pacientes', 'Lente', 'Lentes', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'product_variants'], 
  ARRAY['loyalty_program']);

-- Veterinaria
SELECT temp_insert_vertical('health', 'veterinaria', 'veterinaria', 
  'Veterinaria', 'Veterinary Clinic', 
  'Clínica veterinaria con tienda de productos', 'PawPrint', 
  'VetPos', 'veterinaria', 85, 7,
  'Paciente', 'Pacientes', 'Servicio', 'Servicios', 'Consulta', 'Consultas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management'], 
  ARRAY['whatsapp_integration', 'delivery']);

-- Spa
SELECT temp_insert_vertical('health', 'spa', 'spa', 
  'Spa', 'Spa', 
  'Spa con tratamientos de belleza y relajación', 'Sparkle', 
  'SpaPos', 'spa', 80, 8,
  'Cliente', 'Clientes', 'Tratamiento', 'Tratamientos', 'Cita', 'Citas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management', 'loyalty_program'], 
  ARRAY['whatsapp_integration', 'online_ordering']);

-- Gimnasio
SELECT temp_insert_vertical('health', 'gimnasio', 'gimnasio', 
  'Gimnasio', 'Gym', 
  'Gimnasio con membresías y tienda de suplementos', 'Dumbbell', 
  'GymPos', 'gimnasio', 80, 9,
  'Miembro', 'Miembros', 'Membresía', 'Membresías', 'Inscripción', 'Inscripciones',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['staff_management', 'loyalty_program'], 
  ARRAY['whatsapp_integration']);

-- Consultorio Psicológico
SELECT temp_insert_vertical('health', 'consultorio_psicologico', 'consultorio-psicologico', 
  'Consultorio Psicológico', 'Psychology Office', 
  'Consultorio de psicología y terapia', 'Brain', 
  'PsicoPos', 'psicologia', 70, 10,
  'Paciente', 'Pacientes', 'Sesión', 'Sesiones', 'Cita', 'Citas',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments'], 
  ARRAY['whatsapp_integration']);

-- Consultorio Nutrición
SELECT temp_insert_vertical('health', 'nutricion', 'nutricion', 
  'Consultorio de Nutrición', 'Nutrition Office', 
  'Consultorio de nutrición y dietética', 'Apple', 
  'NutricionPos', 'nutricion', 70, 11,
  'Paciente', 'Pacientes', 'Plan', 'Planes', 'Consulta', 'Consultas',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments'], 
  ARRAY['whatsapp_integration']);

-- Fisioterapia
SELECT temp_insert_vertical('health', 'fisioterapia', 'fisioterapia', 
  'Fisioterapia', 'Physical Therapy', 
  'Centro de rehabilitación y fisioterapia', 'Activity', 
  'FisioPos', 'fisioterapia', 70, 12,
  'Paciente', 'Pacientes', 'Sesión', 'Sesiones', 'Cita', 'Citas',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management'], 
  ARRAY['whatsapp_integration']);

-- Droguería
SELECT temp_insert_vertical('health', 'drogueria', 'drogueria', 
  'Droguería', 'Drugstore', 
  'Droguería con medicamentos de patente y genéricos', 'Pill', 
  'DrogueriaPos', 'drogueria', 75, 13,
  'Cliente', 'Clientes', 'Medicamento', 'Medicamentos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['expiry_tracking'], 
  ARRAY['delivery']);

-- ============================================
-- SERVICES CATEGORY (Non-health services)
-- ============================================

-- Barbería
SELECT temp_insert_vertical('services', 'barberia', 'barberia', 
  'Barbería', 'Barber Shop', 
  'Barbería con servicios de corte y arreglo', 'Scissors', 
  'BarberiaPos', 'barberia', 90, 1,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Turno', 'Turnos',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'queue_management', 'staff_management'], 
  ARRAY['loyalty_program', 'whatsapp_integration']);

-- Estética / Salón de Belleza
SELECT temp_insert_vertical('services', 'estetica', 'estetica', 
  'Salón de Belleza', 'Beauty Salon', 
  'Estética con servicios de belleza integral', 'Sparkle', 
  'EsteticaPos', 'estetica', 90, 2,
  'Clienta', 'Clientas', 'Servicio', 'Servicios', 'Cita', 'Citas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management', 'loyalty_program'], 
  ARRAY['whatsapp_integration', 'online_ordering']);

-- Salón de Uñas
SELECT temp_insert_vertical('services', 'salon_unas', 'salon-unas', 
  'Salón de Uñas', 'Nail Salon', 
  'Especialistas en uñas y manicure', 'Hand', 
  'UnasPos', 'unas', 80, 3,
  'Clienta', 'Clientas', 'Servicio', 'Servicios', 'Cita', 'Citas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management'], 
  ARRAY['loyalty_program']);

-- Taller Mecánico
SELECT temp_insert_vertical('services', 'taller_mecanico', 'taller-mecanico', 
  'Taller Mecánico', 'Auto Repair Shop', 
  'Taller de reparación automotriz', 'Wrench', 
  'TallerPos', 'taller', 85, 4,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'staff_management'], 
  ARRAY['whatsapp_integration']);

-- Tintorería / Lavandería
SELECT temp_insert_vertical('services', 'tintoreria', 'tintoreria', 
  'Tintorería', 'Dry Cleaner', 
  'Servicio de limpieza de prendas', 'Shirt', 
  'TintoreriaPos', 'tintoreria', 75, 5,
  'Cliente', 'Clientes', 'Prenda', 'Prendas', 'Ticket', 'Tickets',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['queue_management'], 
  ARRAY['delivery', 'whatsapp_integration']);

-- Reparación de Celulares
SELECT temp_insert_vertical('services', 'reparacion_celulares', 'reparacion-celulares', 
  'Reparación de Celulares', 'Phone Repair', 
  'Servicio de reparación de dispositivos móviles', 'Smartphone', 
  'RepairPos', 'reparacion', 85, 6,
  'Cliente', 'Clientes', 'Reparación', 'Reparaciones', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['serial_numbers', 'quotes'], 
  ARRAY['whatsapp_integration']);

-- Fotografía
SELECT temp_insert_vertical('services', 'fotografia', 'fotografia', 
  'Estudio Fotográfico', 'Photo Studio', 
  'Estudio de fotografía y servicios', 'Camera', 
  'FotoPos', 'fotografia', 70, 7,
  'Cliente', 'Clientes', 'Sesión', 'Sesiones', 'Pedido', 'Pedidos',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'reservations'], 
  ARRAY['whatsapp_integration']);

-- Imprenta / Copy Center
SELECT temp_insert_vertical('services', 'imprenta', 'imprenta', 
  'Imprenta', 'Print Shop', 
  'Servicios de impresión y copias', 'Printer', 
  'ImprentaPos', 'imprenta', 75, 8,
  'Cliente', 'Clientes', 'Trabajo', 'Trabajos', 'Orden', 'Órdenes',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

-- Carpintería
SELECT temp_insert_vertical('services', 'carpinteria', 'carpinteria', 
  'Carpintería', 'Carpentry Shop', 
  'Taller de carpintería y muebles', 'Hammer', 
  'CarpinteriaPos', 'carpinteria', 65, 9,
  'Cliente', 'Clientes', 'Proyecto', 'Proyectos', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'suppliers'], 
  ARRAY['delivery']);

-- Cerrajería
SELECT temp_insert_vertical('services', 'cerrajeria', 'cerrajeria', 
  'Cerrajería', 'Locksmith', 
  'Servicios de cerrajería', 'Key', 
  'CerrajeriaPos', 'cerrajeria', 70, 10,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['whatsapp_integration']);

-- Plomería
SELECT temp_insert_vertical('services', 'plomeria', 'plomeria', 
  'Plomería', 'Plumbing Services', 
  'Servicios de plomería', 'Droplets', 
  'PlomeriaPos', 'plomeria', 65, 11,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['whatsapp_integration']);

-- Electricista
SELECT temp_insert_vertical('services', 'electricista', 'electricista', 
  'Electricista', 'Electrical Services', 
  'Servicios eléctricos profesionales', 'Zap', 
  'ElectricoPos', 'electricista', 65, 12,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['whatsapp_integration']);

-- Car Wash
SELECT temp_insert_vertical('services', 'car_wash', 'car-wash', 
  'Car Wash', 'Car Wash', 
  'Lavado de autos', 'Car', 
  'CarWashPos', 'carwash', 75, 13,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Ticket', 'Tickets',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['queue_management', 'loyalty_program'], 
  ARRAY['whatsapp_integration']);

-- Academia / Escuela
SELECT temp_insert_vertical('services', 'academia', 'academia', 
  'Academia', 'Academy', 
  'Academia o escuela de cursos', 'GraduationCap', 
  'AcademiaPos', 'academia', 70, 14,
  'Alumno', 'Alumnos', 'Curso', 'Cursos', 'Inscripción', 'Inscripciones',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['appointments', 'staff_management'], 
  ARRAY['whatsapp_integration', 'email_marketing']);

-- Guardería
SELECT temp_insert_vertical('services', 'guarderia', 'guarderia', 
  'Guardería', 'Daycare', 
  'Guardería y cuidado infantil', 'Baby', 
  'GuarderiaPos', 'guarderia', 65, 15,
  'Niño', 'Niños', 'Servicio', 'Servicios', 'Inscripción', 'Inscripciones',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['staff_management'], 
  ARRAY['whatsapp_integration']);

-- Hotel / Hospedaje
SELECT temp_insert_vertical('services', 'hotel', 'hotel', 
  'Hotel', 'Hotel', 
  'Hotel y servicio de hospedaje', 'Hotel', 
  'HotelPos', 'hotel', 75, 16,
  'Huésped', 'Huéspedes', 'Habitación', 'Habitaciones', 'Reservación', 'Reservaciones',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['reservations', 'staff_management'], 
  ARRAY['online_ordering', 'whatsapp_integration']);

-- ============================================
-- REMAINING FASHION & ACCESSORIES
-- ============================================

SELECT temp_insert_vertical('fashion', 'bolsos_carteras', 'bolsos-carteras', 
  'Bolsos y Carteras', 'Bags & Purses', 
  'Bolsos, carteras y accesorios de piel', 'Briefcase', 
  'BolsosPos', 'bolsos', 75, 19,
  'Cliente', 'Clientes', 'Bolso', 'Bolsos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('fashion', 'accesorios_moda', 'accesorios-moda', 
  'Accesorios de Moda', 'Fashion Accessories', 
  'Joyería, bisutería y accesorios', 'Gem', 
  'AccesoriosPos', 'accesorios', 80, 20,
  'Cliente', 'Clientes', 'Accesorio', 'Accesorios', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('fashion', 'gorras_sombreros', 'gorras-sombreros', 
  'Bufandas, Gorras y Sombreros', 'Scarves & Hats', 
  'Accesorios para la cabeza y cuello', 'Crown', 
  'SombrerosPos', 'sombreros', 55, 21,
  'Cliente', 'Clientes', 'Prenda', 'Prendas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('fashion', 'lentes_sol', 'lentes-sol', 
  'Lentes de Sol', 'Sunglasses Shop', 
  'Tienda de lentes de sol y armazones', 'Eye', 
  'LentesPos', 'lentes', 65, 22,
  'Cliente', 'Clientes', 'Lente', 'Lentes', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

-- ============================================
-- TECHNOLOGY & ELECTRONICS
-- ============================================

SELECT temp_insert_vertical('technology', 'tienda_celulares', 'tienda-celulares', 
  'Tienda de Celulares', 'Cell Phone Store', 
  'Venta de celulares y smartphones', 'Smartphone', 
  'CelularesPos', 'celulares', 95, 1,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'accesorios_celular', 'accesorios-celular', 
  'Accesorios para Celular', 'Phone Accessories', 
  'Fundas, cargadores y accesorios móviles', 'Cable', 
  'AccesoriosCelPos', 'accesorioscel', 85, 2,
  'Cliente', 'Clientes', 'Accesorio', 'Accesorios', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'electronica', 'electronica', 
  'Tienda de Electrónica', 'Electronics Store', 
  'Electrónica general y gadgets', 'Cpu', 
  'ElectronicaPos', 'electronica', 85, 3,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['barcode_scanning', 'product_variants'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('technology', 'electrodomesticos', 'electrodomesticos', 
  'Electrodomésticos', 'Appliance Store', 
  'Línea blanca y electrodomésticos', 'Refrigerator', 
  'ElectrodomesticosPos', 'electrodomesticos', 80, 4,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['delivery', 'quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'computadoras', 'computadoras', 
  'Computadoras y Laptops', 'Computer Store', 
  'Computadoras, laptops y componentes', 'Laptop', 
  'ComputadorasPos', 'computadoras', 85, 5,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['product_variants', 'quotes'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('technology', 'gamer', 'gamer', 
  'Tienda Gamer', 'Gaming Store', 
  'Accesorios gamer y periféricos', 'Gamepad2', 
  'GamerPos', 'gamer', 80, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program', 'online_ordering'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('technology', 'videojuegos', 'videojuegos', 
  'Tienda de Videojuegos', 'Video Game Store', 
  'Videojuegos nuevos y usados', 'Gamepad', 
  'VideoJuegosPos', 'videojuegos', 75, 7,
  'Cliente', 'Clientes', 'Juego', 'Juegos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program', 'barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'consolas', 'consolas', 
  'Consolas y Controles', 'Console Store', 
  'Consolas de videojuegos y accesorios', 'Joystick', 
  'ConsolasPos', 'consolas', 70, 8,
  'Cliente', 'Clientes', 'Consola', 'Consolas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'realidad_virtual', 'realidad-virtual', 
  'Realidad Virtual', 'VR Store', 
  'Equipos de realidad virtual y aumentada', 'Glasses', 
  'VRPos', 'vr', 55, 9,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'drones', 'drones', 
  'Tienda de Drones', 'Drone Store', 
  'Drones y accesorios de vuelo', 'Plane', 
  'DronesPos', 'drones', 60, 10,
  'Cliente', 'Clientes', 'Drone', 'Drones', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'camaras', 'camaras', 
  'Cámaras Fotográficas', 'Camera Store', 
  'Cámaras, lentes y equipo fotográfico', 'Camera', 
  'CamarasPos', 'camaras', 65, 11,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('technology', 'iluminacion_profesional', 'iluminacion-profesional', 
  'Iluminación Profesional', 'Pro Lighting', 
  'Iluminación para foto, video y eventos', 'Lightbulb', 
  'IluminacionPos', 'iluminacion', 50, 12,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('technology', 'audio_profesional', 'audio-profesional', 
  'Audio Profesional', 'Pro Audio', 
  'Equipo de sonido profesional', 'Speaker', 
  'AudioPos', 'audio', 55, 13,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('technology', 'seguridad_cctv', 'seguridad-cctv', 
  'Seguridad y CCTV', 'Security & CCTV', 
  'Sistemas de seguridad y videovigilancia', 'Shield', 
  'SeguridadPos', 'seguridad', 70, 14,
  'Cliente', 'Clientes', 'Sistema', 'Sistemas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes', 'delivery'], 
  ARRAY['whatsapp_integration']);

-- ============================================
-- HOME & DECORATION
-- ============================================

SELECT temp_insert_vertical('home', 'muebleria', 'muebleria', 
  'Mueblería', 'Furniture Store', 
  'Muebles para hogar y oficina', 'Armchair', 
  'MuebleriaPos', 'muebleria', 85, 1,
  'Cliente', 'Clientes', 'Mueble', 'Muebles', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['delivery', 'quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('home', 'decoracion', 'decoracion', 
  'Decoración', 'Home Decor', 
  'Artículos decorativos para el hogar', 'Flower', 
  'DecoPos', 'decoracion', 75, 2,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('home', 'blancos', 'blancos', 
  'Blancos', 'Linens', 
  'Sábanas, toallas y ropa de cama', 'Bed', 
  'BlancosPos', 'blancos', 70, 3,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('home', 'colchoneria', 'colchoneria', 
  'Colchonería', 'Mattress Store', 
  'Colchones y bases de cama', 'Bed', 
  'ColchoneriaPos', 'colchoneria', 70, 4,
  'Cliente', 'Clientes', 'Colchón', 'Colchones', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['delivery', 'quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('home', 'cocinas_integrales', 'cocinas-integrales', 
  'Cocinas Integrales', 'Kitchen Store', 
  'Cocinas integrales y closets', 'ChefHat', 
  'CocinasPos', 'cocinas', 60, 5,
  'Cliente', 'Clientes', 'Cocina', 'Cocinas', 'Proyecto', 'Proyectos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'delivery'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('home', 'utensilios_cocina', 'utensilios-cocina', 
  'Utensilios de Cocina', 'Kitchenware', 
  'Ollas, sartenes y utensilios', 'Utensils', 
  'UtensiliosPos', 'utensilios', 65, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('home', 'decoracion_vintage', 'decoracion-vintage', 
  'Decoración Vintage', 'Vintage Decor', 
  'Artículos decorativos vintage y retro', 'Clock', 
  'VintageDecoPos', 'decovintagee', 50, 7,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('home', 'cuadros_arte', 'cuadros-arte', 
  'Cuadros y Arte', 'Art & Frames', 
  'Cuadros, marcos y arte decorativo', 'Frame', 
  'ArtePos', 'arte', 55, 8,
  'Cliente', 'Clientes', 'Obra', 'Obras', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('home', 'espejos_cristales', 'espejos-cristales', 
  'Espejos y Cristales', 'Mirrors & Glass', 
  'Espejos decorativos y cristalería', 'Square', 
  'EspejosPos', 'espejos', 50, 9,
  'Cliente', 'Clientes', 'Espejo', 'Espejos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('home', 'persianas_cortinas', 'persianas-cortinas', 
  'Persianas y Cortinas', 'Blinds & Curtains', 
  'Persianas, cortinas y toldos', 'Blinds', 
  'PersianasPos', 'persianas', 55, 10,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Pedido', 'Pedidos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'delivery'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('home', 'iluminacion_decorativa', 'iluminacion-decorativa', 
  'Iluminación Decorativa', 'Decorative Lighting', 
  'Lámparas y candiles decorativos', 'Lamp', 
  'LamparasPos', 'lamparas', 55, 11,
  'Cliente', 'Clientes', 'Lámpara', 'Lámparas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

-- ============================================
-- CONSTRUCTION & HARDWARE
-- ============================================

SELECT temp_insert_vertical('hardware', 'ferreteria', 'ferreteria', 
  'Ferretería', 'Hardware Store', 
  'Ferretería y materiales de construcción', 'Hammer', 
  'FerreteriaPos', 'ferreteria', 90, 1,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['suppliers', 'quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('hardware', 'tlapaleria', 'tlapaleria', 
  'Tlapalería', 'Small Hardware', 
  'Artículos de ferretería y hogar', 'Wrench', 
  'TlapaleriaPos', 'tlapaleria', 85, 2,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('hardware', 'materiales_construccion', 'materiales-construccion', 
  'Materiales de Construcción', 'Building Materials', 
  'Cemento, varilla y materiales', 'Building', 
  'MaterialesPos', 'materiales', 80, 3,
  'Cliente', 'Clientes', 'Material', 'Materiales', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['suppliers', 'delivery', 'quotes'], 
  ARRAY['whatsapp_integration']);

SELECT temp_insert_vertical('hardware', 'cemento_agregados', 'cemento-agregados', 
  'Cemento y Agregados', 'Cement & Aggregates', 
  'Cemento, arena, grava y agregados', 'Boxes', 
  'CementoPos', 'cemento', 65, 4,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['delivery', 'quotes'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('hardware', 'pinturas', 'pinturas', 
  'Pinturas y Recubrimientos', 'Paint Store', 
  'Pinturas, barnices y recubrimientos', 'Paintbrush', 
  'PinturasPos', 'pinturas', 75, 5,
  'Cliente', 'Clientes', 'Pintura', 'Pinturas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning', 'product_variants'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('hardware', 'carpinteria_retail', 'carpinteria-retail', 
  'Carpintería Retail', 'Woodworking Store', 
  'Maderas, tableros y herramientas', 'TreePine', 
  'MaderasPos', 'maderas', 60, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'delivery'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('hardware', 'herramientas_electricas', 'herramientas-electricas', 
  'Herramientas Eléctricas', 'Power Tools', 
  'Herramientas eléctricas y accesorios', 'Wrench', 
  'HerramientasPos', 'herramientas', 70, 7,
  'Cliente', 'Clientes', 'Herramienta', 'Herramientas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('hardware', 'plomeria_retail', 'plomeria-retail', 
  'Plomería Retail', 'Plumbing Supplies', 
  'Materiales y accesorios de plomería', 'Droplets', 
  'PlomeriaRetailPos', 'plomeriaretail', 65, 8,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('hardware', 'electricidad_retail', 'electricidad-retail', 
  'Electricidad Retail', 'Electrical Supplies', 
  'Material eléctrico y cables', 'Plug', 
  'ElectricidadPos', 'electricidadretail', 65, 9,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('hardware', 'cerrajeria_retail', 'cerrajeria-retail', 
  'Cerrajería Retail', 'Locksmith Supplies', 
  'Cerraduras, llaves y seguridad', 'Lock', 
  'CerrajeriaRetailPos', 'cerrajeriaretail', 55, 10,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['quotes']);

SELECT temp_insert_vertical('hardware', 'pisos_azulejos', 'pisos-azulejos', 
  'Pisos y Azulejos', 'Tile Store', 
  'Pisos, azulejos y losetas', 'Grid3x3', 
  'PisosPos', 'pisos', 70, 11,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'delivery'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('hardware', 'vidrieria', 'vidrieria', 
  'Vidriería', 'Glass Shop', 
  'Vidrios, cristales y espejos', 'Square', 
  'VidrieriaPos', 'vidrieria', 60, 12,
  'Cliente', 'Clientes', 'Vidrio', 'Vidrios', 'Pedido', 'Pedidos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'delivery'], 
  ARRAY[]::TEXT[]);

-- ============================================
-- PETS
-- ============================================

SELECT temp_insert_vertical('pets', 'pet_shop', 'pet-shop', 
  'Pet Shop', 'Pet Shop', 
  'Tienda de mascotas y accesorios', 'PawPrint', 
  'PetShopPos', 'petshop', 90, 1,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program', 'expiry_tracking'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('pets', 'alimento_mascotas', 'alimento-mascotas', 
  'Alimento para Mascotas', 'Pet Food Store', 
  'Especialidad en alimento para mascotas', 'Dog', 
  'AlimentoMascotasPos', 'alimentomascotas', 80, 2,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program', 'expiry_tracking', 'barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('pets', 'accesorios_mascotas', 'accesorios-mascotas', 
  'Accesorios de Mascotas', 'Pet Accessories', 
  'Juguetes, camas y accesorios', 'Dog', 
  'AccesoriosMascotasPos', 'accesoriosmascotas', 70, 3,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('pets', 'acuario', 'acuario', 
  'Acuario', 'Aquarium Store', 
  'Peces, acuarios y accesorios', 'Fish', 
  'AcuarioPos', 'acuario', 60, 4,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('pets', 'reptiles_exoticos', 'reptiles-exoticos', 
  'Reptiles y Exóticos', 'Exotic Pets', 
  'Mascotas exóticas y reptiles', 'Bug', 
  'ExoticosPos', 'exoticos', 45, 5,
  'Cliente', 'Clientes', 'Mascota', 'Mascotas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('pets', 'boutique_mascotas', 'boutique-mascotas', 
  'Boutique de Mascotas', 'Pet Boutique', 
  'Ropa y accesorios premium para mascotas', 'Heart', 
  'BoutiqueMascotasPos', 'boutiquemascotas', 55, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('pets', 'peluqueria_mascotas', 'peluqueria-mascotas', 
  'Peluquería de Mascotas', 'Pet Grooming', 
  'Estética canina y felina con tienda', 'Scissors', 
  'GroomingPos', 'petgrooming', 70, 7,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Cita', 'Citas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'queue_management'], 
  ARRAY['whatsapp_integration']);

-- ============================================
-- AUTOMOTIVE
-- ============================================

SELECT temp_insert_vertical('automotive', 'refaccionaria', 'refaccionaria', 
  'Refaccionaria', 'Auto Parts Store', 
  'Refacciones automotrices', 'Car', 
  'RefaccionariaPos', 'refaccionaria', 90, 1,
  'Cliente', 'Clientes', 'Refacción', 'Refacciones', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['suppliers', 'quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('automotive', 'autopartes', 'autopartes', 
  'Autopartes', 'Auto Parts', 
  'Partes y accesorios automotrices', 'Cog', 
  'AutopartesPos', 'autopartes', 85, 2,
  'Cliente', 'Clientes', 'Parte', 'Partes', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['suppliers'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('automotive', 'llantas', 'llantas', 
  'Tienda de Llantas', 'Tire Shop', 
  'Llantas y servicios de alineación', 'Circle', 
  'LlantasPos', 'llantas', 80, 3,
  'Cliente', 'Clientes', 'Llanta', 'Llantas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'quotes'], 
  ARRAY['whatsapp_integration']);

SELECT temp_insert_vertical('automotive', 'accesorios_auto', 'accesorios-auto', 
  'Accesorios Automotrices', 'Auto Accessories', 
  'Accesorios y tuning automotriz', 'Car', 
  'AccesoriosAutoPos', 'accesoriosauto', 70, 4,
  'Cliente', 'Clientes', 'Accesorio', 'Accesorios', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('automotive', 'car_audio', 'car-audio', 
  'Car Audio', 'Car Audio', 
  'Audio y electrónica automotriz', 'Speaker', 
  'CarAudioPos', 'caraudio', 65, 5,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('automotive', 'detailing', 'detailing', 
  'Detailing Profesional', 'Auto Detailing', 
  'Productos de detallado automotriz', 'Sparkle', 
  'DetailingPos', 'detailing', 55, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('automotive', 'limpieza_auto', 'limpieza-auto', 
  'Productos de Limpieza Automotriz', 'Car Cleaning Products', 
  'Productos para limpieza de autos', 'Sparkle', 
  'LimpiezaAutoPos', 'limpiezaauto', 50, 7,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('automotive', 'boutique_4x4', 'boutique-4x4', 
  'Boutique 4x4', '4x4 Boutique', 
  'Accesorios para vehículos todo terreno', 'Mountain', 
  'Boutique4x4Pos', '4x4', 45, 8,
  'Cliente', 'Clientes', 'Accesorio', 'Accesorios', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('automotive', 'lubricantes', 'lubricantes', 
  'Venta de Lubricantes', 'Lubricant Store', 
  'Aceites, grasas y lubricantes', 'Droplet', 
  'LubricantesPos', 'lubricantes', 55, 9,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

-- ============================================
-- OFFICE & STATIONERY
-- ============================================

SELECT temp_insert_vertical('office', 'papeleria', 'papeleria', 
  'Papelería', 'Stationery Store', 
  'Artículos de papelería y oficina', 'Pencil', 
  'PapeleriaPos', 'papeleria', 90, 1,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['suppliers'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'libreria', 'libreria', 
  'Librería', 'Bookstore', 
  'Libros, revistas y publicaciones', 'Book', 
  'LibreriaPos', 'libreria', 85, 2,
  'Cliente', 'Clientes', 'Libro', 'Libros', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'copias_impresiones', 'copias-impresiones', 
  'Copias e Impresiones', 'Copy Center', 
  'Centro de copiado e impresión', 'Printer', 
  'CopiasPos', 'copias', 75, 3,
  'Cliente', 'Clientes', 'Servicio', 'Servicios', 'Orden', 'Órdenes',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('office', 'utiles_escolares', 'utiles-escolares', 
  'Útiles Escolares', 'School Supplies', 
  'Material escolar y mochilas', 'GraduationCap', 
  'UtilesPos', 'utiles', 80, 4,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['promotions'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'arte_dibujo', 'arte-dibujo', 
  'Arte y Dibujo', 'Art Supplies', 
  'Materiales para artistas y dibujantes', 'Palette', 
  'ArtePos', 'artedibujo', 65, 5,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'material_didactico', 'material-didactico', 
  'Material Didáctico', 'Educational Materials', 
  'Material educativo y didáctico', 'Blocks', 
  'DidacticoPos', 'didactico', 60, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'jugueteria_educativa', 'jugueteria-educativa', 
  'Juguetería Educativa', 'Educational Toys', 
  'Juguetes didácticos y educativos', 'Blocks', 
  'JugueteriaEduPos', 'jugueteriaedu', 55, 7,
  'Cliente', 'Clientes', 'Juguete', 'Juguetes', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'regalos_detalles', 'regalos-detalles', 
  'Regalos y Detalles', 'Gift Shop', 
  'Artículos para regalo y detalles', 'Gift', 
  'RegalosPos', 'regalos', 70, 8,
  'Cliente', 'Clientes', 'Regalo', 'Regalos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'souvenirs', 'souvenirs', 
  'Souvenirs', 'Souvenir Shop', 
  'Recuerdos y artículos turísticos', 'MapPin', 
  'SouvenirsPos', 'souvenirs', 60, 9,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('office', 'calendarios_agendas', 'calendarios-agendas', 
  'Calendarios y Agendas', 'Calendars & Planners', 
  'Calendarios, agendas y organizadores', 'Calendar', 
  'CalendariosPos', 'calendarios', 50, 10,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

-- ============================================
-- BEAUTY & GROOMING
-- ============================================

SELECT temp_insert_vertical('beauty', 'cosmeticos', 'cosmeticos', 
  'Tienda de Cosméticos', 'Cosmetics Store', 
  'Maquillaje y productos de belleza', 'Sparkle', 
  'CosmeticosPos', 'cosmeticos', 90, 1,
  'Clienta', 'Clientas', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program', 'product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'perfumeria', 'perfumeria', 
  'Perfumería', 'Perfume Store', 
  'Perfumes y fragancias', 'Flower', 
  'PerfumeriaPos', 'perfumeria', 85, 2,
  'Cliente', 'Clientes', 'Perfume', 'Perfumes', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program', 'product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'barberia_productos', 'barberia-productos', 
  'Barbería con Productos', 'Barber Shop with Products', 
  'Barbería con venta de productos masculinos', 'Scissors', 
  'BarberiaProdsPos', 'barberiaprods', 75, 3,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'estetica_productos', 'estetica-productos', 
  'Estética con Productos', 'Beauty Salon with Products', 
  'Salón de belleza con venta de productos', 'Sparkle', 
  'EsteticaProdsPos', 'esteticaprods', 80, 4,
  'Clienta', 'Clientas', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['appointments', 'loyalty_program', 'staff_management'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'esmaltes', 'esmaltes', 
  'Venta de Esmaltes', 'Nail Polish Store', 
  'Esmaltes y productos para uñas', 'Palette', 
  'EsmaltesPos', 'esmaltes', 55, 5,
  'Clienta', 'Clientas', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'maquillaje_profesional', 'maquillaje-profesional', 
  'Maquillaje Profesional', 'Pro Makeup Store', 
  'Maquillaje profesional y herramientas', 'Paintbrush', 
  'MakeupProPos', 'makeuppro', 65, 6,
  'Clienta', 'Clientas', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'extensiones_pelucas', 'extensiones-pelucas', 
  'Extensiones y Pelucas', 'Hair Extensions & Wigs', 
  'Cabello, extensiones y pelucas', 'User', 
  'ExtensionesPos', 'extensiones', 55, 7,
  'Clienta', 'Clientas', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'suministros_unas', 'suministros-unas', 
  'Suministros para Uñas', 'Nail Supplies', 
  'Productos profesionales para uñas', 'Hand', 
  'NailSuppliesPos', 'nailsupplies', 60, 8,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'spa_retail', 'spa-retail', 
  'Spa Retail', 'Spa Products', 
  'Productos de spa y relajación', 'Flower', 
  'SpaRetailPos', 'sparetail', 50, 9,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('beauty', 'aceites_esenciales', 'aceites-esenciales', 
  'Aceites Esenciales', 'Essential Oils', 
  'Aromaterapia y aceites esenciales', 'Droplet', 
  'AceitesPos', 'aceites', 50, 10,
  'Cliente', 'Clientes', 'Aceite', 'Aceites', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

-- ============================================
-- SPORTS & OUTDOORS
-- ============================================

SELECT temp_insert_vertical('sports', 'deportes', 'deportes', 
  'Tienda de Deportes', 'Sports Store', 
  'Artículos y ropa deportiva', 'Dumbbell', 
  'DeportesPos', 'deportes', 85, 1,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('sports', 'bicicletas', 'bicicletas', 
  'Bicicletería', 'Bike Shop', 
  'Bicicletas, partes y accesorios', 'Bike', 
  'BicicletasPos', 'bicicletas', 80, 2,
  'Cliente', 'Clientes', 'Bicicleta', 'Bicicletas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('sports', 'pesca', 'pesca', 
  'Pesca Deportiva', 'Fishing Store', 
  'Artículos de pesca deportiva', 'Fish', 
  'PescaPos', 'pesca', 55, 3,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('sports', 'campismo', 'campismo', 
  'Tienda de Campismo', 'Camping Store', 
  'Artículos para acampar y senderismo', 'Tent', 
  'CampismoPos', 'campismo', 60, 4,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('sports', 'airsoft_paintball', 'airsoft-paintball', 
  'Airsoft y Paintball', 'Airsoft & Paintball', 
  'Equipos y accesorios tácticos', 'Target', 
  'AirsoftPos', 'airsoft', 50, 5,
  'Cliente', 'Clientes', 'Equipo', 'Equipos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['age_verification'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('sports', 'deportes_extremos', 'deportes-extremos', 
  'Deportes Extremos', 'Extreme Sports', 
  'Skate, snowboard y deportes extremos', 'Snowflake', 
  'ExtremoPos', 'extremo', 55, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('sports', 'artes_marciales', 'artes-marciales', 
  'Artes Marciales', 'Martial Arts Store', 
  'Equipo y uniformes de artes marciales', 'Sword', 
  'ArtesMarciales', 'artesmarciales', 50, 7,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('sports', 'yoga', 'yoga', 
  'Tienda de Yoga', 'Yoga Store', 
  'Productos y accesorios de yoga', 'User', 
  'YogaPos', 'yoga', 50, 8,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program'], 
  ARRAY['online_ordering']);

-- ============================================
-- KIDS & BABY
-- ============================================

SELECT temp_insert_vertical('kids', 'jugueteria', 'jugueteria', 
  'Juguetería', 'Toy Store', 
  'Juguetes para todas las edades', 'Gamepad2', 
  'JugueteriaPos', 'jugueteria', 90, 1,
  'Cliente', 'Clientes', 'Juguete', 'Juguetes', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['loyalty_program', 'product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('kids', 'tienda_bebes', 'tienda-bebes', 
  'Tienda de Bebés', 'Baby Store', 
  'Todo para el bebé y mamá', 'Baby', 
  'BebesPos', 'bebes', 85, 2,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'loyalty_program'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('kids', 'ropa_bebe', 'ropa-bebe', 
  'Ropa de Bebé', 'Baby Clothing', 
  'Moda infantil para bebés', 'Shirt', 
  'RopaBebePos', 'ropabebe', 75, 3,
  'Cliente', 'Clientes', 'Prenda', 'Prendas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('kids', 'carriolas', 'carriolas', 
  'Carriolas y Accesorios', 'Strollers & Accessories', 
  'Carriolas, sillas y accesorios para bebé', 'Baby', 
  'CarriolasPos', 'carriolas', 65, 4,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('kids', 'montessori', 'montessori', 
  'Tienda Montessori', 'Montessori Store', 
  'Material y juguetes Montessori', 'Blocks', 
  'MontessoriPos', 'montessori', 50, 5,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('kids', 'aprendizaje', 'aprendizaje', 
  'Tienda de Aprendizaje', 'Learning Store', 
  'Material didáctico y de aprendizaje', 'GraduationCap', 
  'AprendizajePos', 'aprendizaje', 45, 6,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

-- ============================================
-- SPECIALTY STORES
-- ============================================

SELECT temp_insert_vertical('specialty', 'floreria', 'floreria', 
  'Florería', 'Flower Shop', 
  'Flores, arreglos y plantas', 'Flower2', 
  'FloreriaPos', 'floreria', 85, 1,
  'Cliente', 'Clientes', 'Arreglo', 'Arreglos', 'Pedido', 'Pedidos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['delivery', 'online_ordering', 'expiry_tracking'], 
  ARRAY['whatsapp_integration']);

SELECT temp_insert_vertical('specialty', 'floreria_premium', 'floreria-premium', 
  'Florería Premium', 'Premium Flower Shop', 
  'Arreglos florales de lujo y eventos', 'Flower2', 
  'FloresPremiumPos', 'florespremi', 65, 2,
  'Cliente', 'Clientes', 'Arreglo', 'Arreglos', 'Pedido', 'Pedidos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['delivery', 'reservations', 'quotes'], 
  ARRAY['whatsapp_integration']);

SELECT temp_insert_vertical('specialty', 'tienda_regalos', 'tienda-regalos', 
  'Tienda de Regalos', 'Gift Shop', 
  'Artículos de regalo y detalles', 'Gift', 
  'RegalosPos', 'regalos', 75, 3,
  'Cliente', 'Clientes', 'Regalo', 'Regalos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'velas', 'velas', 
  'Tienda de Velas', 'Candle Shop', 
  'Velas artesanales y aromáticas', 'Flame', 
  'VelasPos', 'velas', 55, 4,
  'Cliente', 'Clientes', 'Vela', 'Velas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'aromaterapia', 'aromaterapia', 
  'Tienda de Aromaterapia', 'Aromatherapy Shop', 
  'Difusores, esencias y aromaterapia', 'Leaf', 
  'AromaPos', 'aromaterapia', 50, 5,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'articulos_religiosos', 'articulos-religiosos', 
  'Artículos Religiosos', 'Religious Items', 
  'Artículos religiosos y de fe', 'Church', 
  'ReligiososPos', 'religiosos', 55, 6,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'antiguedades', 'antiguedades', 
  'Tienda de Antigüedades', 'Antique Shop', 
  'Antigüedades y coleccionables', 'Clock', 
  'AntiguedadesPos', 'antiguedades', 45, 7,
  'Cliente', 'Clientes', 'Pieza', 'Piezas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'coleccionables', 'coleccionables', 
  'Coleccionables', 'Collectibles', 
  'Artículos de colección y memorabilia', 'Star', 
  'ColeccionablesPos', 'coleccionables', 50, 8,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'comics', 'comics', 
  'Comics Shop', 'Comic Shop', 
  'Comics, manga y novelas gráficas', 'Book', 
  'ComicsPos', 'comics', 55, 9,
  'Cliente', 'Clientes', 'Comic', 'Comics', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'barcode_scanning'], 
  ARRAY['loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'sex_shop', 'sex-shop', 
  'Sex Shop', 'Adult Store', 
  'Productos para adultos', 'Heart', 
  'AdultPos', 'adultos', 50, 10,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['age_verification', 'product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'casa_empeno', 'casa-empeno', 
  'Casa de Empeño', 'Pawn Shop', 
  'Préstamos prendarios y venta', 'DollarSign', 
  'EmpenaPos', 'empeno', 65, 11,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Empeño', 'Empeños',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['serial_numbers', 'quotes'], 
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('specialty', 'instrumentos_musicales', 'instrumentos-musicales', 
  'Instrumentos Musicales', 'Music Store', 
  'Instrumentos y accesorios musicales', 'Music', 
  'MusicaPos', 'musica', 70, 12,
  'Cliente', 'Clientes', 'Instrumento', 'Instrumentos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'uniformes', 'uniformes', 
  'Tienda de Uniformes', 'Uniform Store', 
  'Uniformes escolares e industriales', 'Shirt', 
  'UniformesPos', 'uniformes', 65, 13,
  'Cliente', 'Clientes', 'Uniforme', 'Uniformes', 'Pedido', 'Pedidos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'merceria', 'merceria', 
  'Mercería', 'Haberdashery', 
  'Hilos, botones y accesorios de costura', 'Scissors', 
  'MerceriaPos', 'merceria', 60, 14,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'pinateria', 'pinateria', 
  'Piñatería', 'Pinata Shop', 
  'Piñatas y artículos para fiestas', 'Party', 
  'PinateriaPos', 'pinateria', 55, 15,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Pedido', 'Pedidos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['reservations'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'manualidades', 'manualidades', 
  'Manualidades', 'Craft Store', 
  'Materiales para manualidades', 'Palette', 
  'ManualidadesPos', 'manualidades', 65, 16,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'globos', 'globos', 
  'Tienda de Globos', 'Balloon Shop', 
  'Globos y decoración con globos', 'Circle', 
  'GlobosPos', 'globos', 50, 17,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Pedido', 'Pedidos',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['delivery'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'fiestas', 'fiestas', 
  'Artículos para Fiestas', 'Party Supplies', 
  'Decoración y artículos de fiesta', 'Party', 
  'FiestasPos', 'fiestas', 70, 18,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('specialty', 'energia_solar', 'energia-solar', 
  'Energía Solar', 'Solar Energy', 
  'Paneles solares y energía renovable', 'Sun', 
  'SolarPos', 'solar', 50, 19,
  'Cliente', 'Clientes', 'Sistema', 'Sistemas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes', 'delivery'], 
  ARRAY['whatsapp_integration']);

SELECT temp_insert_vertical('specialty', 'baterias_energia', 'baterias-energia', 
  'Baterías y Energía', 'Battery Store', 
  'Baterías, pilas y energía portátil', 'Battery', 
  'BateriasPos', 'baterias', 55, 20,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'regalos_personalizados', 'regalos-personalizados', 
  'Regalos Personalizados', 'Custom Gifts', 
  'Regalos personalizados y grabados', 'Gift', 
  'RegalosPersonalizadosPos', 'personalizado', 60, 21,
  'Cliente', 'Clientes', 'Pedido', 'Pedidos', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'impresion_3d', 'impresion-3d', 
  'Impresión 3D', '3D Printing', 
  'Servicio de impresión 3D y productos', '3dCubeSphere', 
  'Impresion3DPos', '3dprint', 45, 22,
  'Cliente', 'Clientes', 'Impresión', 'Impresiones', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'scooters_electricos', 'scooters-electricos', 
  'Scooters Eléctricos', 'Electric Scooters', 
  'Patinetas y scooters eléctricos', 'Zap', 
  'ScootersPos', 'scooters', 55, 23,
  'Cliente', 'Clientes', 'Scooter', 'Scooters', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'serial_numbers'], 
  ARRAY['quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'herbalismo', 'herbalismo', 
  'Herbalismo', 'Herbal Shop', 
  'Hierbas y remedios tradicionales', 'Leaf', 
  'HerbalismoPos', 'herbalismo', 50, 24,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'recargas', 'recargas', 
  'Recargas Telefónicas', 'Phone Recharges', 
  'Recargas y servicios telefónicos', 'Phone', 
  'RecargasPos', 'recargas', 70, 25,
  'Cliente', 'Clientes', 'Recarga', 'Recargas', 'Venta', 'Ventas',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('specialty', 'limpieza', 'limpieza', 
  'Productos de Limpieza', 'Cleaning Products', 
  'Productos de limpieza y aseo', 'Sparkle', 
  'LimpiezaPos', 'limpieza', 65, 26,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'aromatizantes', 'aromatizantes', 
  'Tienda de Aromatizantes', 'Air Freshener Store', 
  'Aromatizantes y ambientadores', 'Wind', 
  'AromatizantesPos', 'aromatizantes', 45, 27,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'plasticos', 'plasticos', 
  'Tienda de Plásticos', 'Plastic Store', 
  'Contenedores y artículos de plástico', 'Box', 
  'PlasticosPos', 'plasticos', 50, 28,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'outlet', 'outlet', 
  'Outlet de Productos', 'Outlet Store', 
  'Productos de marca a precios reducidos', 'Tag', 
  'OutletPos', 'outlet', 70, 29,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['promotions', 'barcode_scanning'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'bazar_segunda_mano', 'bazar-segunda-mano', 
  'Bazar de Segunda Mano', 'Second Hand Bazaar', 
  'Artículos de segunda mano', 'Recycle', 
  'BazarPos', 'bazar', 55, 30,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[]);

SELECT temp_insert_vertical('specialty', 'tienda_japonesa', 'tienda-japonesa', 
  'Tienda Japonesa', 'Japanese Store', 
  'Productos japoneses estilo Miniso', 'Star', 
  'JaponesaPos', 'japonesa', 60, 31,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'tienda_coreana', 'tienda-coreana', 
  'Tienda Coreana', 'Korean Store', 
  'K-pop, K-beauty y productos coreanos', 'Music', 
  'CoreanaPos', 'coreana', 55, 32,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants', 'loyalty_program'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'plantas', 'plantas', 
  'Tienda de Plantas', 'Plant Shop', 
  'Plantas de interior y exterior', 'Flower2', 
  'PlantasPos', 'plantas', 65, 33,
  'Cliente', 'Clientes', 'Planta', 'Plantas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['expiry_tracking'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'vivero', 'vivero', 
  'Vivero', 'Nursery', 
  'Plantas, árboles y jardinería', 'TreeDeciduous', 
  'ViveroPos', 'vivero', 70, 34,
  'Cliente', 'Clientes', 'Planta', 'Plantas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['delivery'], 
  ARRAY['whatsapp_integration']);

SELECT temp_insert_vertical('specialty', 'bonsais', 'bonsais', 
  'Bonsáis', 'Bonsai Shop', 
  'Bonsáis y arte de cultivo', 'TreePine', 
  'BonsaiPos', 'bonsai', 40, 35,
  'Cliente', 'Clientes', 'Bonsái', 'Bonsáis', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'suculentas', 'suculentas', 
  'Suculentas y Macetas', 'Succulent Shop', 
  'Suculentas, cactus y macetas', 'Flower', 
  'SuculentasPos', 'suculentas', 55, 36,
  'Cliente', 'Clientes', 'Planta', 'Plantas', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('specialty', 'hidroponia', 'hidroponia', 
  'Tienda de Hidroponía', 'Hydroponics Shop', 
  'Sistemas y suministros hidropónicos', 'Droplets', 
  'HidroponiaPos', 'hidroponia', 40, 37,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'souvenirs_turisticos', 'souvenirs-turisticos', 
  'Souvenirs Turísticos', 'Tourist Souvenirs', 
  'Recuerdos y artesanías turísticas', 'MapPin', 
  'SouvenirsTuristicosPos', 'souvenirsturisticos', 55, 38,
  'Cliente', 'Clientes', 'Souvenir', 'Souvenirs', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'artesanias', 'artesanias', 
  'Artesanías Regionales', 'Regional Crafts', 
  'Artesanías locales y regionales', 'Palette', 
  'ArtesaniasPos', 'artesanias', 60, 39,
  'Cliente', 'Clientes', 'Artesanía', 'Artesanías', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY[]::TEXT[],
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'alimentos_llevar', 'alimentos-llevar', 
  'Alimentos para Llevar', 'Take-Away Food', 
  'Comida preparada para llevar', 'Package', 
  'AlimentosLlevarPos', 'alimentosllevar', 70, 40,
  'Cliente', 'Clientes', 'Platillo', 'Platillos', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['kitchen_display', 'queue_management'], 
  ARRAY['delivery', 'online_ordering']);

SELECT temp_insert_vertical('specialty', 'dulces_tipicos', 'dulces-tipicos', 
  'Dulces Típicos', 'Traditional Sweets', 
  'Dulces tradicionales y regionales', 'Candy', 
  'DulcesTipicosPos', 'dulcestipicos', 55, 41,
  'Cliente', 'Clientes', 'Dulce', 'Dulces', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['expiry_tracking'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'boutique_lujo', 'boutique-lujo', 
  'Boutique de Lujo', 'Luxury Boutique', 
  'Artículos de lujo y alta gama', 'Crown', 
  'LujoPos', 'lujo', 50, 42,
  'Cliente', 'Clientes', 'Artículo', 'Artículos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['loyalty_program', 'quotes'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'maletas', 'maletas', 
  'Maletería', 'Luggage Store', 
  'Maletas, paraguas y artículos de viaje', 'Luggage', 
  'MaletasPos', 'maletas', 55, 43,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['online_ordering']);

SELECT temp_insert_vertical('specialty', 'tapiceria', 'tapiceria', 
  'Tienda de Tapicería', 'Upholstery Store', 
  'Telas y materiales para tapicería', 'Scissors', 
  'TapiceriaPos', 'tapiceria', 45, 44,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'lonas_impresion', 'lonas-impresion', 
  'Lonas e Impresión', 'Banner Printing', 
  'Lonas, vinil y gran formato', 'Printer', 
  'LonasPos', 'lonas', 50, 45,
  'Cliente', 'Clientes', 'Trabajo', 'Trabajos', 'Orden', 'Órdenes',
  ARRAY['pos', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'empaques', 'empaques', 
  'Tienda de Empaques', 'Packaging Store', 
  'Cajas, bolsas y materiales de empaque', 'Package', 
  'EmpaquesPos', 'empaques', 55, 46,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'articulos_barberias', 'articulos-barberias', 
  'Artículos para Barberías', 'Barber Supplies', 
  'Equipo profesional para barbería', 'Scissors', 
  'BarberSuppliesPos', 'barbersupplies', 45, 47,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('specialty', 'productos_spas', 'productos-spas', 
  'Productos para Spas', 'Spa Supplies', 
  'Equipo y productos profesionales de spa', 'Flower', 
  'SpaSuppliesPos', 'spasupplies', 45, 48,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['barcode_scanning'], 
  ARRAY['online_ordering', 'delivery']);

SELECT temp_insert_vertical('specialty', 'cristaleria', 'cristaleria', 
  'Cristalería', 'Glassware Store', 
  'Cristalería fina y decorativa', 'Glass', 
  'CristaleriaPos', 'cristaleria', 50, 49,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'material_electrico_industrial', 'material-electrico-industrial', 
  'Material Eléctrico Industrial', 'Industrial Electrical', 
  'Material eléctrico para industria', 'Zap', 
  'ElectricoIndustrialPos', 'electricoindustrial', 55, 50,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes', 'suppliers'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'extintores', 'extintores', 
  'Extintores y Seguridad', 'Fire Safety', 
  'Extintores y equipo contra incendios', 'Flame', 
  'ExtintoresPos', 'extintores', 50, 51,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports', 'expiry_tracking'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'senalizacion', 'senalizacion', 
  'Tienda de Señalización', 'Signage Store', 
  'Señales, letreros y rotulación', 'Sign', 
  'SenalizacionPos', 'senalizacion', 45, 52,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Orden', 'Órdenes',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'impermeabilizantes', 'impermeabilizantes', 
  'Impermeabilizantes', 'Waterproofing Store', 
  'Impermeabilizantes y selladores', 'Droplets', 
  'ImpermeabilizantesPos', 'impermeabilizantes', 50, 53,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['quotes'], 
  ARRAY['delivery']);

SELECT temp_insert_vertical('specialty', 'pinturas_automotrices', 'pinturas-automotrices', 
  'Pinturas Automotrices', 'Auto Paint Store', 
  'Pinturas y acabados automotrices', 'Paintbrush', 
  'PinturasAutoPos', 'pinturasauto', 50, 54,
  'Cliente', 'Clientes', 'Producto', 'Productos', 'Venta', 'Ventas',
  ARRAY['pos', 'inventory', 'customers', 'reports'], 
  ARRAY['product_variants'], 
  ARRAY['delivery']);

-- ============================================
-- DROP TEMPORARY FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS temp_insert_vertical;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'All 250+ business verticals inserted successfully!';
  RAISE NOTICE 'Categories: grocery, beverages, restaurants, fashion, technology, home, hardware, pets, automotive, office, beauty, sports, kids, specialty, services, health';
  RAISE NOTICE 'Special terminology configured for medical (Paciente), restaurants (Comensal), etc.';
END $$;
