import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno del archivo .env
config({ path: resolve(process.cwd(), '.env') });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Error: Faltan variables de entorno de Supabase");
  console.log("\nVerifica que tu archivo .env contenga:");
  console.log("- NEXT_PUBLIC_SUPABASE_URL");
  console.log("- SUPABASE_SERVICE_ROLE_KEY");
  console.log(`\nValores actuales:`);
  console.log(`- NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? 'definida' : 'NO DEFINIDA'}`);
  console.log(`- SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'definida' : 'NO DEFINIDA'}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setCustomer(email: string) {
  try {
    console.log(`Buscando usuario con email: ${email}...`);

    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (fetchError || !user) {
      console.error(`❌ Error: No se encontró ningún usuario con el email: ${email}`);
      console.log("\nAsegúrate de que el usuario ya esté registrado en la aplicación.");
      if (fetchError) console.log("Error de Supabase:", fetchError.message);
      process.exit(1);
    }

    if (user.role === "CUSTOMER") {
      console.log(`✓ El usuario ${email} ya es cliente del menú digital.`);
      process.exit(0);
    }

    console.log(`Actualizando rol del usuario a CUSTOMER...`);

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ role: "CUSTOMER" })
      .eq("email", email)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error al actualizar:", updateError.message);
      process.exit(1);
    }

    console.log(`\n✓ ¡Éxito! El usuario ${email} ahora es cliente del menú digital.`);
    console.log(`\nDetalles del usuario:`);
    console.log(`- Nombre: ${updatedUser.first_name} ${updatedUser.last_name}`);
    console.log(`- Email: ${updatedUser.email}`);
    console.log(`- Rol: ${updatedUser.role}`);
    console.log(`\nEl usuario solo tendrá acceso a /menu para realizar pedidos.`);
  } catch (error) {
    console.error("❌ Error al actualizar el usuario:", error);
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.error("❌ Error: Debes proporcionar un email.");
  console.log("\nUso: npx tsx scripts/set-customer-supabase.ts <email>");
  console.log("Ejemplo: npx tsx scripts/set-customer-supabase.ts cliente@ejemplo.com");
  process.exit(1);
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error("❌ Error: El email proporcionado no es válido.");
  process.exit(1);
}

setCustomer(email);
