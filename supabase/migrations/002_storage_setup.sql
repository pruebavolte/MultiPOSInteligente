-- =================================================================
-- Configuración de Storage para Imágenes de Productos
-- =================================================================

-- Crear bucket para imágenes de productos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true, -- Público para que las imágenes se puedan ver sin autenticación
  5242880, -- 5MB límite por archivo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- =================================================================
-- Políticas de Storage
-- =================================================================

-- Política para permitir subir imágenes (todos pueden subir)
CREATE POLICY "Permitir subir imágenes de productos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
);

-- Política para permitir ver imágenes (público)
CREATE POLICY "Permitir ver imágenes públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Política para permitir actualizar imágenes
CREATE POLICY "Permitir actualizar imágenes de productos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

-- Política para permitir eliminar imágenes
CREATE POLICY "Permitir eliminar imágenes de productos"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');

-- =================================================================
-- Comentarios
-- =================================================================

COMMENT ON SCHEMA storage IS 'Storage para archivos y imágenes';
