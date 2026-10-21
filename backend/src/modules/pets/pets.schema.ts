import { z } from 'zod';
import { dateOnlySchema } from '../../common/utils/schemas';

const species = z.enum(['DOG', 'CAT', 'BIRD', 'RABBIT', 'HAMSTER', 'FISH', 'REPTILE', 'OTHER']);
const sex = z.enum(['MALE', 'FEMALE', 'UNKNOWN']);

const petFields = {
  name: z.string().trim().min(1, 'Tên không được để trống').max(100),
  species: species.default('OTHER'),
  breed: z.string().trim().max(100).nullish(),
  sex: sex.default('UNKNOWN'),
  birthDate: dateOnlySchema.nullish(),
  adoptedAt: dateOnlySchema.nullish(),
  weightKg: z.number().positive().max(999.99).nullish(),
  note: z.string().max(5000).nullish(),
  /** public_id trả về từ POST /media/upload-url (purpose=AVATAR) sau khi upload xong */
  avatarPublicId: z.string().max(255).nullish(),
};

export const createPetSchema = z.object(petFields);

export const updatePetSchema = z
  .object({
    name: petFields.name.optional(),
    species: species.optional(),
    breed: petFields.breed,
    sex: sex.optional(),
    birthDate: petFields.birthDate,
    adoptedAt: petFields.adoptedAt,
    weightKg: petFields.weightKg,
    note: petFields.note,
    avatarPublicId: petFields.avatarPublicId,
    /** Optimistic locking – gửi version hiện tại để tránh ghi đè */
    version: z.number().int().positive().optional(),
  })
  .refine((v) => Object.keys(v).some((k) => k !== 'version'), 'Không có dữ liệu cần cập nhật');

export const deletePetQuery = z.object({
  confirm: z.literal('true', { errorMap: () => ({ message: 'Cần xác nhận xoá (?confirm=true)' }) }),
});

export type CreatePetInput = z.infer<typeof createPetSchema>;
export type UpdatePetInput = z.infer<typeof updatePetSchema>;
