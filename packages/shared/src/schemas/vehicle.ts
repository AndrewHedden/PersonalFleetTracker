import { z } from 'zod';

/**
 * Vehicle schemas shared between the API, the web app, and (eventually) iOS.
 *
 * These are the wire format — what the JSON API actually sends and accepts.
 * They're intentionally distinct from the Drizzle row types in `@stablebook/db`
 * so the DB schema and the public API can evolve independently.
 */

const isoDateTime = z.string().datetime();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Per-axle tire reference. All fields optional; front & rear may differ. */
const TireSpecSchema = z
  .object({
    size: z.string().max(50),
    pressure: z.string().max(50),
    brand: z.string().max(100),
    model: z.string().max(100),
  })
  .partial();

/**
 * Free-reference "quick details" for a vehicle — service specs the owner keeps
 * handy. Stored as a JSONB blob so the field set can grow without migrations.
 * All fields optional; values are free text (units live in the value, e.g.
 * "6.5 qt", "80 ft-lb", "35 psi").
 */
export const VehicleSpecsSchema = z
  .object({
    engineOilType: z.string().max(100),
    engineOilBrand: z.string().max(100),
    engineOilCapacity: z.string().max(50),
    oilFilterPartNumber: z.string().max(100),
    oilDrainPlugSocket: z.string().max(50),
    oilDrainPlugTorque: z.string().max(50),
    lugNutTorque: z.string().max(50),
    tireFront: TireSpecSchema,
    tireRear: TireSpecSchema,
    notes: z.string().max(2000),
  })
  .partial();

export type VehicleSpecs = z.infer<typeof VehicleSpecsSchema>;

export const VehicleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  nickname: z.string(),
  year: z.number().int().nullable(),
  make: z.string(),
  model: z.string(),
  trim: z.string().nullable(),
  vin: z.string().nullable(),
  licensePlate: z.string().nullable(),
  color: z.string().nullable(),
  purchaseOdometer: z.number().int().nullable(),
  purchaseDate: isoDate.nullable(),
  specs: VehicleSpecsSchema.nullable(),
  retiredAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export type Vehicle = z.infer<typeof VehicleSchema>;

export const CreateVehicleInputSchema = z.object({
  nickname: z.string().min(1).max(100),
  year: z.number().int().min(1900).max(2100).optional(),
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  trim: z.string().max(100).optional(),
  vin: z.string().max(17).optional(),
  licensePlate: z.string().max(20).optional(),
  color: z.string().max(50).optional(),
  purchaseOdometer: z.number().int().min(0).optional(),
  purchaseDate: isoDate.optional(),
  specs: VehicleSpecsSchema.optional(),
});

export type CreateVehicleInput = z.infer<typeof CreateVehicleInputSchema>;

export const UpdateVehicleInputSchema = CreateVehicleInputSchema.partial().extend({
  retiredAt: isoDateTime.nullable().optional(),
});

export type UpdateVehicleInput = z.infer<typeof UpdateVehicleInputSchema>;

export const ListVehiclesResponseSchema = z.object({
  vehicles: z.array(VehicleSchema),
});

export type ListVehiclesResponse = z.infer<typeof ListVehiclesResponseSchema>;
