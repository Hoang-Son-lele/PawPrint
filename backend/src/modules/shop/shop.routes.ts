import { Router, type Request, type Response } from 'express';
import { prisma } from '../../lib/prisma';

/** FR-10 Pet Shop (V2) – mô hình affiliate: chỉ danh mục, chuyển hướng ra ngoài app. */
export const shopRouter = Router();

shopRouter.get('/products', async (_req: Request, res: Response) => {
  const rows = await prisma.product.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
  res.json({
    data: rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
      price: Number(p.price),
      currency: p.currency,
      affiliateUrl: p.affiliateUrl,
    })),
  });
});
