'use server';

import { CreateVehicleInputSchema, type Vehicle } from '@stablebook/shared';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { apiFetch, ApiError, UnauthenticatedError } from '@/lib/api';

export interface CreateVehicleState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

/**
 * Server action wired to <form action={createVehicleAction}>. Validates the
 * FormData on the server with the same Zod schema the API uses, then forwards
 * the request to POST /v1/vehicles with the caller's access-token cookie.
 *
 * On success → revalidates the dashboard's vehicles cache and redirects to it.
 * On validation error → returns `fieldErrors` for the form to render inline.
 */
export async function createVehicleAction(
  _prev: CreateVehicleState,
  formData: FormData,
): Promise<CreateVehicleState> {
  const trim = (v: FormDataEntryValue | null) =>
    typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
  const num = (v: FormDataEntryValue | null) => {
    const t = trim(v);
    if (t === undefined) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  };

  const raw = {
    nickname: trim(formData.get('nickname')),
    year: num(formData.get('year')),
    make: trim(formData.get('make')),
    model: trim(formData.get('model')),
    trim: trim(formData.get('trim')),
    vin: trim(formData.get('vin')),
    licensePlate: trim(formData.get('licensePlate')),
    color: trim(formData.get('color')),
    purchaseOdometer: num(formData.get('purchaseOdometer')),
  };

  const parsed = CreateVehicleInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await apiFetch<Vehicle>('/v1/vehicles', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      redirect('/?signin=required');
    }
    const message =
      err instanceof ApiError
        ? `API ${err.status}: ${err.body || 'request failed'}`
        : err instanceof Error
          ? err.message
          : 'Unknown error';
    return { error: message };
  }

  revalidatePath('/dashboard');
  redirect('/dashboard');
}
