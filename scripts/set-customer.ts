/**
 * Script para establecer un usuario como CUSTOMER (cliente del menú digital)
 *
 * Uso:
 * npx tsx scripts/set-customer.ts <email>
 *
 * Ejemplo:
 * npx tsx scripts/set-customer.ts cliente@ejemplo.com
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setCustomer(email: string) {
  try {
    console.log(`Buscando usuario con email: ${email}...`);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ Error: No se encontró ningún usuario con el email: ${email}`);
      console.log("\nAsegúrate de que el usuario ya esté registrado en la aplicación.");
      process.exit(1);
    }

    if (user.role === "CUSTOMER") {
      console.log(`✓ El usuario ${email} ya es cliente del menú digital.`);
      process.exit(0);
    }

    console.log(`Actualizando rol del usuario a CUSTOMER...`);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: "CUSTOMER" },
    });

    console.log(`\n✓ ¡Éxito! El usuario ${email} ahora es cliente del menú digital.`);
    console.log(`\nDetalles del usuario:`);
    console.log(`- Nombre: ${updatedUser.firstName} ${updatedUser.lastName}`);
    console.log(`- Email: ${updatedUser.email}`);
    console.log(`- Rol: ${updatedUser.role}`);
    console.log(`\nEl usuario solo tendrá acceso a /menu para realizar pedidos.`);
  } catch (error) {
    console.error("❌ Error al actualizar el usuario:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Obtener el email del argumento de línea de comandos
const email = process.argv[2];

if (!email) {
  console.error("❌ Error: Debes proporcionar un email.");
  console.log("\nUso: npx tsx scripts/set-customer.ts <email>");
  console.log("Ejemplo: npx tsx scripts/set-customer.ts cliente@ejemplo.com");
  process.exit(1);
}

// Validar formato de email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error("❌ Error: El email proporcionado no es válido.");
  process.exit(1);
}

setCustomer(email);
