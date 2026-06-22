import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import { genderToEvo } from "@/lib/gender";

const MEXICAN_STATE_TO_ID: Record<string, number> = {
  Aguascalientes: 52,
  "Baja California": 53,
  "Baja California Sur": 54,
  Campeche: 55,
  Chiapas: 56,
  Chihuahua: 57,
  Coahuila: 58,
  Colima: 59,
  "Ciudad de México": 60,
  Durango: 61,
  Guanajuato: 62,
  Guerrero: 63,
  Hidalgo: 64,
  Jalisco: 65,
  "Estado de México": 66,
  Michoacán: 67,
  Morelos: 68,
  Nayarit: 69,
  "Nuevo León": 70,
  Oaxaca: 71,
  Puebla: 72,
  Querétaro: 73,
  "Quintana Roo": 74,
  "San Luis Potosí": 75,
  Sinaloa: 76,
  Sonora: 77,
  Tabasco: 78,
  Tamaulipas: 79,
  Tlaxcala: 80,
  Veracruz: 81,
  Yucatán: 82,
  Zacatecas: 83,
};

function stateToId(state: string | null): number | undefined {
  if (!state) return undefined;
  return MEXICAN_STATE_TO_ID[state] ?? undefined;
}

function removeUndefined<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

async function main() {
  // Load env from .env.development
  process.loadEnvFile(".env.development");

  const prospectId = process.argv[2];
  if (!prospectId) {
    console.error("Uso: npm run preview:prospect <UUID-del-prospecto>");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const prospect = await prisma.prospects.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      console.error(`Prospecto no encontrado: ${prospectId}`);
      process.exit(1);
    }

    const evoGender = genderToEvo(prospect.gender);

    const createPayload = {
      name: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      idBranch: prospect.idBranch,
      cellphone: prospect.phone,
      cpf: prospect.curp,
      ddi: prospect.areaCode ?? undefined,
      birthday: prospect.birthDate?.toISOString(),
      gender: evoGender,
      address: prospect.address ?? undefined,
      number: prospect.number ?? undefined,
      city: prospect.city ?? undefined,
      idState: stateToId(prospect.state),
      zipCode: prospect.zipCode ?? undefined,
    };

    const updatePayload = {
      idProspect: "<idProspect en Evo>",
      name: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      cellphone: prospect.phone,
      ddi: prospect.areaCode ?? undefined,
      birthday: prospect.birthDate?.toISOString(),
      gender: evoGender,
      idBranch: prospect.idBranch,
      address: prospect.address ?? undefined,
      number: prospect.number ?? undefined,
      city: prospect.city ?? undefined,
      idState: stateToId(prospect.state),
      zipCode: prospect.zipCode ?? undefined,
    };

    console.log(JSON.stringify({
      prospectId,
      dbData: {
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        email: prospect.email,
        phone: prospect.phone,
        areaCode: prospect.areaCode,
        birthDate: prospect.birthDate?.toISOString(),
        gender: prospect.gender,
        curp: prospect.curp,
        idBranch: prospect.idBranch,
        address: prospect.address,
        number: prospect.number,
        city: prospect.city,
        state: prospect.state,
        zipCode: prospect.zipCode,
      },
      evoPayloads: {
        create: {
          endpoint: "POST /api/v1/prospects",
          body: removeUndefined(createPayload),
        },
        update: {
          endpoint: "PUT /api/v1/prospects",
          body: removeUndefined(updatePayload),
        },
      },
    }, null, 2));

    await pool.end();
  } catch (error: any) {
    if (error?.code === "P2023" || error?.meta?.message?.includes("uuid")) {
      console.error(`Error: "${prospectId}" no es un UUID válido.`);
    } else if (error?.code === "P2025") {
      console.error(`Prospecto no encontrado: ${prospectId}`);
    } else {
      console.error("Error:", error?.message ?? error);
    }
    await pool.end();
    process.exit(1);
  }
}

main();
