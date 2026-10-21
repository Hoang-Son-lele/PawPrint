import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authUser, requireAuth } from '../../common/middlewares/auth';
import { body, params, validate } from '../../common/middlewares/validate';
import { idParams } from '../../common/utils/schemas';
import * as mediaService from './media.service';

const uploadUrlSchema = z.object({
  purpose: z.enum(['MOMENT', 'AVATAR']).default('MOMENT'),
});

const confirmSchema = z.object({
  publicId: z.string().min(1).max(255),
});

export const mediaRouter = Router();
mediaRouter.use(requireAuth);

/**
 * POST /media/upload-url
 * Trả về chữ ký; client gửi multipart/form-data tới `uploadUrl` gồm:
 *   file, api_key, signature + toàn bộ field trong `params`.
 */
mediaRouter.post('/upload-url', validate({ body: uploadUrlSchema }), async (req: Request, res: Response) => {
  const { purpose } = body(req, uploadUrlSchema);
  res.status(201).json({ data: await mediaService.createUploadUrl(authUser(req).id, purpose) });
});

/** POST /media/confirm – xác nhận đã upload ảnh moment, trả về mediaId để gắn vào moment. */
mediaRouter.post('/confirm', validate({ body: confirmSchema }), async (req: Request, res: Response) => {
  const { publicId } = body(req, confirmSchema);
  res.status(201).json({ data: await mediaService.confirmUpload(authUser(req).id, publicId) });
});

/** DELETE /media/:id – huỷ ảnh chưa gắn vào moment. */
mediaRouter.delete('/:id', validate({ params: idParams }), async (req: Request, res: Response) => {
  await mediaService.deleteUnattached(authUser(req).id, params(req, idParams).id);
  res.status(204).end();
});
