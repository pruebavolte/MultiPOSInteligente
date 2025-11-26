import { NextRequest } from "next/server";
import { createProduct, getCategories, createCategory, createProductWithVariants, getOrCreateVariantType } from "@/lib/services/supabase";
import { Product, Category } from "@/types/database";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/supabase/users";
import { supabaseAdmin } from "@/lib/supabase/server";

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
const IMAGE_GENERATION_MODEL = process.env.IMAGE_GENERATION_MODEL || "google/gemini-2.5-flash-image-preview";

// Supabase Storage configuration
const BUCKET_NAME = "product-images";

// Helper function to send SSE events
function sendEvent(controller: ReadableStreamDefaultController, type: string, data: any) {
  const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}

// Helper function to convert base64 data URL to Buffer
function base64ToBuffer(dataUrl: string): Buffer {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// Helper function to generate product image using OpenRouter (Gemini)
async function generateProductImage(
  productName: string,
  description?: string,
  controller?: ReadableStreamDefaultController
): Promise<string | null> {
  if (!OPENROUTER_API_KEY) {
    console.log(`No OpenRouter API key configured, skipping image generation for "${productName}"`);
    return null;
  }

  try {
    console.log(`🎨 Generating image for: ${productName}`);

    const prompt = description
      ? `Create a professional, appetizing photo of ${productName}, ${description}. The image should show restaurant quality presentation, well-plated food, natural lighting, high resolution, professional food photography style. Make it look delicious and appealing.`
      : `Create a professional, appetizing photo of ${productName} dish. The image should show restaurant quality presentation, well-plated food, natural lighting, high resolution, professional food photography style. Make it look delicious and appealing.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "MultiPOS - Menu Digital",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_GENERATION_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error(`OpenRouter image generation error for "${productName}":`, response.status);
      return null;
    }

    const data = await response.json();

    if (data.choices && data.choices.length > 0) {
      const message = data.choices[0].message;

      if (message.images && message.images.length > 0) {
        const imageData = message.images[0];

        console.log(`Image data type: ${typeof imageData}`);

        let imageDataUrl: string;
        if (typeof imageData === 'string') {
          imageDataUrl = imageData;
        } else if (imageData && typeof imageData === 'object') {
          // Handle Gemini's response format: {type: "image_url", image_url: {url: "..."}}
          if ('image_url' in imageData && imageData.image_url && typeof imageData.image_url === 'object' && 'url' in imageData.image_url) {
            imageDataUrl = imageData.image_url.url as string;
          } else if ('url' in imageData) {
            imageDataUrl = imageData.url as string;
          } else if ('data' in imageData) {
            imageDataUrl = imageData.data as string;
          } else {
            console.error(`Unexpected image format for "${productName}":`, JSON.stringify(imageData).substring(0, 200));
            return null;
          }
        } else {
          console.error(`Unexpected image format for "${productName}":`, JSON.stringify(imageData).substring(0, 200));
          return null;
        }

        console.log(`✓ Generated image for "${productName}"`);
        return imageDataUrl;
      }
    }

    console.log(`No image generated for "${productName}"`);
    return null;
  } catch (error) {
    console.error(`Error generating image for "${productName}":`, error);
    return null;
  }
}

// Helper function to upload image to Supabase
async function uploadImageToSupabase(
  imageUrl: string,
  productName: string
): Promise<string | null> {
  try {
    console.log(`📥 Processing image for "${productName}"...`);

    if (typeof imageUrl !== 'string') {
      console.error(`Invalid imageUrl type for "${productName}". Expected string, got ${typeof imageUrl}`);
      return null;
    }

    let buffer: Buffer;

    if (imageUrl.startsWith('data:image/')) {
      buffer = base64ToBuffer(imageUrl);
      console.log(`✓ Converted base64 image for "${productName}"`);
    } else {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.error(`Failed to download image for "${productName}"`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      console.log(`✓ Downloaded image for "${productName}"`);
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sanitizedName = productName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `product-${sanitizedName}-${timestamp}-${randomString}.jpg`;
    const filePath = `products/${fileName}`;

    console.log(`📤 Uploading image for "${productName}"...`);
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error(`Error uploading image for "${productName}":`, error.message);
      return null;
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log(`✓ Image uploaded for "${productName}"`);
    return publicData.publicUrl;
  } catch (error) {
    console.error(`Error processing/uploading image for "${productName}":`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        sendEvent(controller, 'start', { message: 'Iniciando procesamiento...' });

        // Get authenticated user
        const { userId } = await auth();
        if (!userId) {
          sendEvent(controller, 'error', { message: 'No autenticado' });
          controller.close();
          return;
        }

        const userData = await getUserByClerkId(userId);
        if (!userData) {
          sendEvent(controller, 'error', { message: 'Usuario no encontrado' });
          controller.close();
          return;
        }

        const formData = await request.formData();
        const files = formData.getAll("files") as File[];
        const generateAIImages = formData.get("generateAIImages") === "true";

        console.log(`Generate AI Images: ${generateAIImages}`);

        if (!files || files.length === 0) {
          sendEvent(controller, 'error', { message: 'No se proporcionaron imágenes' });
          controller.close();
          return;
        }

        sendEvent(controller, 'analyzing', { message: 'Analizando menú con IA...' });

        // Process images with AI Vision
        const allProducts: any[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          try {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const base64 = buffer.toString("base64");

            const prompt = `Analiza esta imagen de un menú de restaurante y extrae TODOS los productos que veas, incluyendo sus variantes (tamaños, extras, toppings).

Para cada producto, proporciona la siguiente información en formato JSON:
- name: nombre del producto (string)
- description: descripción breve del producto (string, puede ser vacío)
- price: precio BASE del producto (número, el precio más bajo si hay variantes, si no está visible usa 0)
- category: categoría del producto como "Entradas", "Platos Principales", "Bebidas", "Postres", etc. (string)
- variants: array de variantes del producto (puede estar vacío)

Cada variante debe tener:
- type: tipo de variante ("Tamaño", "Topping", "Extra", "Porción", etc.)
- name: nombre de la variante ("1 litro", "1/2 litro", "Granola", "Nuez", etc.)
- price_modifier: diferencia de precio respecto al precio base (número, puede ser 0)
- is_absolute_price: true si el precio es el total, false si es un modificador adicional

EJEMPLOS DE VARIANTES:
1. "Licuado de plátano: 1/2 litro $60, 1 litro $100" →
   price: 60, variants: [
     {"type": "Tamaño", "name": "1/2 litro", "price_modifier": 0, "is_absolute_price": false},
     {"type": "Tamaño", "name": "1 litro", "price_modifier": 40, "is_absolute_price": false}
   ]

2. "Pizza Margarita $150. Extras: Queso +$20, Pepperoni +$25" →
   price: 150, variants: [
     {"type": "Extra", "name": "Queso", "price_modifier": 20, "is_absolute_price": false},
     {"type": "Extra", "name": "Pepperoni", "price_modifier": 25, "is_absolute_price": false}
   ]

3. "Café Americano: Chico $35, Mediano $45, Grande $55" →
   price: 35, variants: [
     {"type": "Tamaño", "name": "Chico", "price_modifier": 0, "is_absolute_price": false},
     {"type": "Tamaño", "name": "Mediano", "price_modifier": 10, "is_absolute_price": false},
     {"type": "Tamaño", "name": "Grande", "price_modifier": 20, "is_absolute_price": false}
   ]

IMPORTANTE:
- Extrae TODOS los productos que veas en la imagen
- Detecta variantes como tamaños, extras, toppings, porciones
- Si hay precios en la imagen, úsalos exactamente como aparecen
- Si NO hay precio visible, usa 0
- Si NO hay variantes, deja el array vacío: []
- Devuelve SOLO un array JSON válido, sin texto adicional

Responde ÚNICAMENTE con el array JSON, sin markdown, sin explicaciones adicionales.`;

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
                "X-Title": "MultiPOS - Menu Digital",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: prompt },
                      {
                        type: "image_url",
                        image_url: { url: `data:${file.type};base64,${base64}` },
                      },
                    ],
                  },
                ],
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error("OpenRouter API error:", errorData);
              continue;
            }

            const data = await response.json();
            let text = data.choices[0]?.message?.content || "";
            text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

            let products = [];
            try {
              products = JSON.parse(text);
            } catch (parseError) {
              const jsonMatch = text.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                products = JSON.parse(jsonMatch[0]);
              }
            }

            if (Array.isArray(products)) {
              allProducts.push(...products);
            }
          } catch (error) {
            console.error("Error processing image:", error);
          }
        }

        sendEvent(controller, 'extracted', { count: allProducts.length });

        if (allProducts.length === 0) {
          sendEvent(controller, 'error', { message: 'No se pudieron extraer productos de las imágenes' });
          controller.close();
          return;
        }

        // Get categories
        const categoriesResponse = await getCategories();
        const existingCategories: Category[] = categoriesResponse.success
          ? (categoriesResponse.data || []).filter(cat => cat.user_id === userData.id)
          : [];

        const { data: existingProducts } = await supabaseAdmin
          .from("products")
          .select("*")
          .eq("user_id", userData.id);

        const userProducts = (existingProducts as Product[] | null) || [];

        const categoryMap = new Map<string, string>();
        const userIdForCategories = userData.id;

        async function getOrCreateCategory(categoryName: string): Promise<string | null> {
          if (categoryMap.has(categoryName)) {
            return categoryMap.get(categoryName)!;
          }

          const existingCategory = existingCategories.find(
            (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
          );

          if (existingCategory) {
            categoryMap.set(categoryName, existingCategory.id);
            return existingCategory.id;
          }

          try {
            const newCategoryResult = await createCategory({
              name: categoryName,
              active: true,
              user_id: userIdForCategories,
              available_in_pos: false,
              available_in_digital_menu: true,
            });

            if (newCategoryResult.success && newCategoryResult.data) {
              const newCategoryId = newCategoryResult.data.id;
              categoryMap.set(categoryName, newCategoryId);
              existingCategories.push(newCategoryResult.data);
              return newCategoryId;
            }
          } catch (error) {
            console.error(`Error creating category "${categoryName}":`, error);
          }

          if (existingCategories.length > 0) {
            const fallbackId = existingCategories[0].id;
            categoryMap.set(categoryName, fallbackId);
            return fallbackId;
          }

          return null;
        }

        function findExistingProduct(productName: string) {
          const normalizedName = productName.toLowerCase().trim();
          return userProducts.find((p) => {
            const existingName = p.name.toLowerCase().trim();
            return existingName === normalizedName ||
                   existingName.includes(normalizedName) ||
                   normalizedName.includes(existingName);
          });
        }

        // Save products
        let productsAdded = 0;
        let productsUpdated = 0;
        const errors: string[] = [];

        for (let i = 0; i < allProducts.length; i++) {
          const productData = allProducts[i];

          try {
            const categoryId = await getOrCreateCategory(
              productData.category || "Sin Categoría"
            );

            if (!categoryId) {
              errors.push(`No se pudo asignar categoría para "${productData.name}"`);
              continue;
            }

            const existingProduct = findExistingProduct(productData.name);

            if (existingProduct) {
              sendEvent(controller, 'product_saved', {
                productName: productData.name,
                current: i + 1,
                total: allProducts.length,
                type: 'updated'
              });

              const { error } = await supabaseAdmin
                .from("products")
                // @ts-expect-error - Type mismatch
                .update({
                  available_in_digital_menu: true,
                  price: parseFloat(productData.price) || existingProduct.price,
                  description: productData.description || existingProduct.description,
                  category_id: categoryId,
                  active: true,
                })
                .eq("id", existingProduct.id);

              if (error) {
                errors.push(`Error al actualizar "${productData.name}": ${error.message}`);
              } else {
                productsUpdated++;
              }
            } else {
              // Generate image only if enabled
              let imageUrl: string | undefined = undefined;

              if (generateAIImages) {
                sendEvent(controller, 'generating_image', {
                  productName: productData.name,
                  current: i + 1,
                  total: allProducts.length
                });

                try {
                  const generatedImageUrl = await generateProductImage(
                    productData.name,
                    productData.description,
                    controller
                  );

                  if (generatedImageUrl) {
                    sendEvent(controller, 'image_generated', {
                      productName: productData.name
                    });

                    const uploadedImageUrl = await uploadImageToSupabase(generatedImageUrl, productData.name);
                    if (uploadedImageUrl) {
                      imageUrl = uploadedImageUrl;
                    }
                  }
                } catch (imageError) {
                  console.error(`Error generating/uploading image for "${productData.name}":`, imageError);
                }
              }

              sendEvent(controller, 'product_saved', {
                productName: productData.name,
                current: i + 1,
                total: allProducts.length,
                type: 'created'
              });

              const sku = `MENU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

              const newProduct: Omit<Product, "id" | "created_at" | "updated_at"> = {
                sku,
                name: productData.name || "Producto sin nombre",
                description: productData.description || "",
                category_id: categoryId,
                price: parseFloat(productData.price) || 0,
                cost: 0,
                stock: 100,
                min_stock: 10,
                max_stock: 1000,
                image_url: imageUrl,
                active: true,
                barcode: undefined,
                product_type: "menu_digital",
                currency: "MXN",
                user_id: userData.id,
                available_in_pos: false,
                available_in_digital_menu: true,
                track_inventory: false,
              };

              // Check if product has variants
              const productVariants = productData.variants || [];

              if (productVariants.length > 0) {
                // Create product with variants
                const variantsFormatted = productVariants.map((v: any) => ({
                  variant_type_name: v.type || "Tamaño",
                  name: v.name,
                  price_modifier: parseFloat(v.price_modifier) || 0,
                  is_absolute_price: v.is_absolute_price || false,
                  is_default: false,
                }));

                const result = await createProductWithVariants(
                  newProduct,
                  variantsFormatted,
                  userData.id
                );

                if (result.success) {
                  productsAdded++;
                  sendEvent(controller, 'variants_created', {
                    productName: productData.name,
                    variantCount: productVariants.length
                  });
                } else {
                  errors.push(`Error al crear "${productData.name}" con variantes: ${result.error}`);
                }
              } else {
                // Create product without variants
                const result = await createProduct(newProduct);

                if (result.success) {
                  productsAdded++;
                } else {
                  errors.push(`Error al crear "${productData.name}": ${result.error}`);
                }
              }
            }
          } catch (error) {
            errors.push(`Error al guardar producto: ${error}`);
          }
        }

        sendEvent(controller, 'complete', {
          result: {
            success: true,
            productsAdded,
            productsUpdated,
            totalExtracted: allProducts.length,
            errors: errors.length > 0 ? errors : undefined,
          }
        });

        controller.close();
      } catch (error) {
        console.error("Error in menu digitalization:", error);
        sendEvent(controller, 'error', {
          message: "Error al procesar el menú",
          details: error instanceof Error ? error.message : String(error),
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
