/**
 * Seed dữ liệu mẫu chi tiết cho PawPrint (TiDB + Cloudinary).
 *   npm run db:seed
 *
 * - Idempotent: xoá sạch dữ liệu seed cũ (theo ID cố định) rồi tạo lại.
 * - Ngày tháng tính tương đối theo "hôm nay" (Asia/Ho_Chi_Minh) để mốc kỷ niệm luôn đúng.
 * - Ảnh mẫu trong scripts/seed-assets được upload thật lên Cloudinary (type=authenticated).
 * Mật khẩu chung mọi tài khoản: Pawprint@123
 */
import 'dotenv/config';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { CareRecordType, Prisma } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from '../src/lib/prisma';
import { addDays, dateOnlyToDb, startOfLocalDay, todayIn, type DateOnly } from '../src/common/utils/date';
import { syncTogetherMilestones } from '../src/modules/milestones/milestones.service';

const TZ = 'Asia/Ho_Chi_Minh';
const PASSWORD = 'Pawprint@123';
const FOLDER = process.env.CLOUDINARY_FOLDER ?? 'pawprint';
const ASSETS = path.resolve(__dirname, 'seed-assets');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ----------------------------------------------------------------------------- ID cố định (dễ test)
const U = {
  admin: '5eed0000-0000-4000-8000-0000000000a1',
  mod: '5eed0000-0000-4000-8000-0000000000a2',
  minh: '5eed0000-0000-4000-8000-0000000000b1',
  lan: '5eed0000-0000-4000-8000-0000000000b2',
  locked: '5eed0000-0000-4000-8000-0000000000b3',
  newbie: '5eed0000-0000-4000-8000-0000000000b4',
} as const;
const P = {
  mochi: '5eed0000-0000-4000-8000-0000000000c1',
  bo: '5eed0000-0000-4000-8000-0000000000c2',
  miu: '5eed0000-0000-4000-8000-0000000000c3',
} as const;
const PRODUCT_IDS = [1, 2, 3, 4].map((i) => `5eed0000-0000-4000-8000-0000000000d${i}`);

const today = todayIn(TZ);
const daysAgo = (n: number): DateOnly => addDays(today, -n);
/** Thời điểm UTC tương ứng `hour` giờ địa phương của ngày cách đây n ngày. */
const at = (n: number, hour = 9, minute = 0): Date =>
  new Date(startOfLocalDay(daysAgo(n), TZ).getTime() + (hour * 60 + minute) * 60_000);
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

// ----------------------------------------------------------------------------- helpers

async function cleanup() {
  const userIds = Object.values(U);
  console.log('🧹 Xoá dữ liệu seed cũ...');
  for (const id of userIds) {
    await cloudinary.api
      .delete_resources_by_prefix(`${FOLDER}/u_${id}/`, { type: 'authenticated' })
      .catch(() => undefined);
  }
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  // FK ON DELETE CASCADE dọn pets, moments, media, care_records, milestones, notifications, subscriptions...
  await prisma.user.deleteMany({
    where: { OR: [{ id: { in: userIds } }, { email: { endsWith: '@pawprint.dev' } }] },
  });
  await prisma.product.deleteMany({ where: { id: { in: PRODUCT_IDS } } });
}

interface Uploaded {
  storageKey: string;
  format: string;
  bytes: number;
  width: number;
  height: number;
}

async function upload(userId: string, kind: 'moments' | 'avatars', file: string): Promise<Uploaded> {
  const r = await cloudinary.uploader.upload(path.join(ASSETS, file), {
    public_id: `${FOLDER}/u_${userId}/${kind}/${randomUUID()}`,
    type: 'authenticated',
    resource_type: 'image',
    overwrite: false,
  });
  return { storageKey: r.public_id, format: r.format, bytes: r.bytes, width: r.width, height: r.height };
}

interface MomentSeed {
  daysAgo: number;
  hour: number;
  caption: string;
  images: string[];
}

async function seedMoments(userId: string, petId: string, moments: MomentSeed[]) {
  for (const m of moments) {
    const media = await Promise.all(m.images.map((img) => upload(userId, 'moments', img)));
    const momentId = randomUUID();
    await prisma.moment.create({
      data: { id: momentId, petId, userId, caption: m.caption, occurredAt: at(m.daysAgo, m.hour), createdAt: at(m.daysAgo, m.hour, 5) },
    });
    await prisma.momentMedia.createMany({
      data: media.map((x, i) => ({
        id: randomUUID(),
        userId,
        momentId,
        status: 'ATTACHED' as const,
        storageKey: x.storageKey,
        mimeType: `image/${x.format === 'jpg' ? 'jpeg' : x.format}`,
        format: x.format,
        sizeBytes: x.bytes,
        width: x.width,
        height: x.height,
        sortOrder: i,
      })),
    });
    process.stdout.write('.');
  }
}

type CareSeed = { type: CareRecordType; daysAgo: number; hour?: number; value?: number; title?: string; note?: string };

async function seedCare(userId: string, petId: string, records: CareSeed[]) {
  await prisma.careRecord.createMany({
    data: records.map((r) => ({
      id: randomUUID(),
      petId,
      userId,
      type: r.type,
      valueDecimal: r.value ?? null,
      unit: r.type === 'WEIGHT' ? 'kg' : null,
      title: r.title ?? null,
      note: r.note ?? null,
      occurredAt: at(r.daysAgo, r.hour ?? 19),
      createdAt: at(r.daysAgo, (r.hour ?? 19) + 1 > 23 ? 23 : (r.hour ?? 19) + 1),
    })),
  });
  const weights = records.filter((r) => r.type === 'WEIGHT').sort((a, b) => a.daysAgo - b.daysAgo);
  if (weights[0]) await prisma.pet.update({ where: { id: petId }, data: { weightKg: weights[0].value } });
  return records.length;
}

/** Sinh lịch định kỳ: mỗi `every` ngày, từ `from` ngày trước tới `to` ngày trước. */
const periodic = (from: number, to: number, every: number) => {
  const out: number[] = [];
  for (let d = from; d >= to; d -= every) out.push(d);
  return out;
};

// ----------------------------------------------------------------------------- main

async function main() {
  console.log(`🌱 Seed PawPrint – hôm nay (${TZ}): ${today}\n`);
  await cleanup();
  const hash = await bcrypt.hash(PASSWORD, 12);

  // ============================================================ USERS
  console.log('👤 Tạo người dùng...');
  const baseUser = { passwordHash: hash, timeZone: TZ, locale: 'vi' };
  await prisma.user.createMany({
    data: [
      { ...baseUser, id: U.admin, email: 'admin@pawprint.dev', displayName: 'Quản trị viên', role: 'ADMIN', emailVerifiedAt: at(500), createdAt: at(500), lastLoginAt: at(0, 8) },
      { ...baseUser, id: U.mod, email: 'mod@pawprint.dev', displayName: 'Kiểm duyệt viên', role: 'ADMIN', emailVerifiedAt: at(300), createdAt: at(300), lastLoginAt: at(2, 14) },
      { ...baseUser, id: U.minh, email: 'minh@pawprint.dev', displayName: 'Trần Minh', emailVerifiedAt: at(1190), createdAt: at(1190), lastLoginAt: at(0, 7) },
      { ...baseUser, id: U.lan, email: 'lan@pawprint.dev', displayName: 'Nguyễn Lan', emailVerifiedAt: at(100), createdAt: at(100), lastLoginAt: at(1, 21) },
      { ...baseUser, id: U.locked, email: 'locked@pawprint.dev', displayName: 'Tài khoản bị khoá', status: 'LOCKED', emailVerifiedAt: at(60), createdAt: at(60) },
      { ...baseUser, id: U.newbie, email: 'newbie@pawprint.dev', displayName: 'Người mới', createdAt: at(0, 6), notifyEnabled: false },
    ],
  });
  await prisma.deviceToken.create({
    data: { id: randomUUID(), userId: U.minh, platform: 'IOS', token: 'seed-device-token-minh-iphone-0000000001' },
  });

  // ============================================================ PETS
  console.log('🐾 Tạo thú cưng + upload avatar...');
  const [avMochi, avBo, avMiu] = await Promise.all([
    upload(U.minh, 'avatars', 'cat_sofa.jpg'),
    upload(U.minh, 'avatars', 'corgi_beach.jpg'),
    upload(U.lan, 'avatars', 'kitten_play.jpg'),
  ]);
  await prisma.pet.createMany({
    data: [
      {
        id: P.mochi, userId: U.minh, name: 'Mochi', species: 'CAT', breed: 'British Shorthair (lông vàng)', sex: 'FEMALE',
        birthDate: dateOnlyToDb(daysAgo(560)), adoptedAt: dateOnlyToDb(daysAgo(400)), avatarStorageKey: avMochi.storageKey,
        note: 'Thích ngủ trên bàn phím. Dị ứng nhẹ với hạt có gà. Đã triệt sản.', createdAt: at(400, 11),
      },
      {
        id: P.bo, userId: U.minh, name: 'Bơ', species: 'DOG', breed: 'Corgi Pembroke', sex: 'MALE',
        birthDate: dateOnlyToDb(daysAgo(1500)), adoptedAt: dateOnlyToDb(daysAgo(1180)), avatarStorageKey: avBo.storageKey,
        note: 'Mê biển, sợ tiếng sấm. Đi dạo 2 lần/ngày.', createdAt: at(1180, 15),
      },
      {
        // ngày sinh chưa biết; còn 4 ngày nữa tới mốc 100 ngày
        id: P.miu, userId: U.lan, name: 'Miu', species: 'CAT', breed: 'Mèo mướp ta', sex: 'FEMALE',
        birthDate: null, adoptedAt: dateOnlyToDb(daysAgo(95)), avatarStorageKey: avMiu.storageKey,
        note: 'Nhặt được ở góc hẻm, khoảng 2 tháng tuổi lúc về nhà.', createdAt: at(95, 18),
      },
    ],
  });
  await prisma.user.update({ where: { id: U.minh }, data: { currentPetId: P.mochi } });
  await prisma.user.update({ where: { id: U.lan }, data: { currentPetId: P.miu } });

  // ============================================================ MOMENTS
  process.stdout.write('📸 Tạo moments + upload ảnh lên Cloudinary ');
  await seedMoments(U.minh, P.mochi, [
    { daysAgo: 400, hour: 10, caption: 'Ngày đầu tiên Mochi về nhà 🏡 Còn rụt rè trốn dưới gầm sofa cả buổi.', images: ['cat_sofa.jpg'] },
    { daysAgo: 330, hour: 21, caption: 'Phát hiện ra bàn phím laptop là chỗ ngủ ấm nhất nhà 😴', images: ['cat_sleep.jpg'] },
    { daysAgo: 301, hour: 20, caption: '100 ngày bên nhau! Mochi đã dạn hơn rất nhiều, sáng nào cũng gọi dậy đúng 6h 🎉', images: ['cat_sofa.jpg', 'cat_sleep.jpg'] },
    { daysAgo: 180, hour: 16, caption: 'Tắm xong giận dỗi cả buổi chiều, không thèm nhìn mặt sen 😾', images: ['cat_sofa.jpg'] },
    { daysAgo: 36, hour: 19, caption: 'Tròn 1 năm Mochi về nhà ❤️ Cảm ơn bé đã chọn nhà mình.', images: ['cat_sofa.jpg', 'cat_sleep.jpg'] },
    { daysAgo: 3, hour: 22, caption: 'Lại chiếm laptop đúng lúc mình đang deploy. Ai cho phép? 🙃', images: ['cat_sleep.jpg'] },
  ]);
  await seedMoments(U.minh, P.bo, [
    { daysAgo: 1180, hour: 15, caption: 'Bơ về nhà lúc hơn 2 tháng tuổi, bé xíu như cục bông 🐶', images: ['corgi_birthday.jpg'] },
    { daysAgo: 1135, hour: 18, caption: 'Sinh nhật 1 tuổi của Bơ 🎂 Bánh làm từ bí đỏ và ức gà.', images: ['corgi_birthday.jpg'] },
    { daysAgo: 400, hour: 17, caption: 'Chuyến đi biển Vũng Tàu đầu tiên 🌊 Chạy không biết mệt.', images: ['corgi_beach.jpg'] },
    { daysAgo: 181, hour: 18, caption: '1000 ngày có Bơ 🐾 Từ cục bông thành chú chó chân ngắn mập ú.', images: ['corgi_beach.jpg', 'corgi_birthday.jpg'] },
    { daysAgo: 10, hour: 17, caption: 'Chạy bộ hoàng hôn ở bãi biển, về nhà ngủ say như chết.', images: ['corgi_beach.jpg'] },
  ]);
  await seedMoments(U.lan, P.miu, [
    { daysAgo: 95, hour: 18, caption: 'Nhặt được Miu ở góc hẻm, giờ là thành viên mới của nhà 💕', images: ['kitten_play.jpg'] },
    { daysAgo: 60, hour: 9, caption: 'Miu mê cuộn len hồng hơn mọi đồ chơi đắt tiền 🧶', images: ['kitten_play.jpg'] },
    { daysAgo: 2, hour: 8, caption: 'Miu lớn nhanh quá, sắp được 100 ngày rồi!', images: ['kitten_play.jpg'] },
  ]);
  console.log(' xong');

  // ============================================================ CARE DIARY
  console.log('🩺 Tạo nhật ký chăm sóc...');
  // Mochi: mèo con 1.9kg -> 4.2kg theo đường cong tăng trưởng
  const mochiWeights = periodic(398, 10, 30).map((d, i) => ({
    type: 'WEIGHT' as const, daysAgo: d, hour: 8, value: round(1.9 + 2.3 * (1 - Math.exp(-i / 4))),
  }));
  let careCount = await seedCare(U.minh, P.mochi, [
    ...mochiWeights,
    ...periodic(385, 5, 30).map((d) => ({ type: 'BATH' as const, daysAgo: d, title: 'Tắm', note: 'Dùng sữa tắm cho mèo da nhạy cảm' })),
    ...periodic(395, 7, 21).map((d) => ({ type: 'NAIL_TRIM' as const, daysAgo: d, title: 'Cắt móng' })),
    { type: 'VET_VISIT', daysAgo: 392, hour: 10, title: 'Khám tổng quát + tẩy giun', note: 'Thú y Pet Health Q.3. Sức khoẻ tốt.' },
    { type: 'VET_VISIT', daysAgo: 371, hour: 10, title: 'Tiêm vaccine 4 bệnh – mũi 1' },
    { type: 'VET_VISIT', daysAgo: 343, hour: 10, title: 'Tiêm vaccine 4 bệnh – mũi 2' },
    { type: 'VET_VISIT', daysAgo: 200, hour: 9, title: 'Triệt sản', note: 'Hồi phục tốt sau 7 ngày, đã cắt chỉ.' },
    { type: 'VET_VISIT', daysAgo: 40, hour: 10, title: 'Tiêm phòng dại nhắc lại', note: 'Hẹn mũi tiếp theo sau 12 tháng.' },
    { type: 'NOTE', daysAgo: 250, title: 'Đổi thức ăn', note: 'Chuyển sang hạt Royal Canin Indoor, trộn dần trong 7 ngày.' },
    { type: 'NOTE', daysAgo: 15, title: 'Theo dõi', note: 'Bỏ ăn nửa ngày, tối ăn lại bình thường.' },
  ]);
  // Bơ: trưởng thành, dao động 11.2–12.6kg
  const boWeights = periodic(720, 25, 45).map((d, i) => ({
    type: 'WEIGHT' as const, daysAgo: d, hour: 7, value: round(11.4 + 0.6 * Math.sin(i / 2) + i * 0.04),
  }));
  careCount += await seedCare(U.minh, P.bo, [
    ...boWeights,
    ...periodic(120, 4, 14).map((d) => ({ type: 'BATH' as const, daysAgo: d, title: 'Tắm + sấy', note: 'Rụng lông nhiều mùa này' })),
    ...periodic(180, 20, 30).map((d) => ({ type: 'NAIL_TRIM' as const, daysAgo: d, title: 'Cắt móng + vệ sinh tai' })),
    { type: 'VET_VISIT', daysAgo: 395, hour: 9, title: 'Tiêm vaccine 7 bệnh định kỳ' },
    { type: 'VET_VISIT', daysAgo: 398, hour: 20, title: 'Nhổ ve sau chuyến đi biển', note: 'Đã nhỏ gáy phòng ve.' },
    { type: 'VET_VISIT', daysAgo: 30, hour: 9, title: 'Tiêm vaccine 7 bệnh định kỳ', note: 'Bác sĩ dặn giảm tinh bột, Bơ hơi thừa cân.' },
    { type: 'NOTE', daysAgo: 60, title: 'Chế độ ăn', note: 'Giảm 10% khẩu phần, thêm rau củ luộc.' },
  ]);
  // Miu: cân gần nhất cách đây 45 ngày -> kích hoạt nhắc cân nặng
  careCount += await seedCare(U.lan, P.miu, [
    { type: 'WEIGHT', daysAgo: 92, hour: 18, value: 0.8 },
    { type: 'WEIGHT', daysAgo: 75, hour: 18, value: 1.1 },
    { type: 'WEIGHT', daysAgo: 45, hour: 18, value: 1.5 },
    { type: 'VET_VISIT', daysAgo: 92, hour: 10, title: 'Khám lần đầu + tẩy giun + nhỏ gáy', note: 'Bé hơi suy dinh dưỡng, bổ sung pate.' },
    { type: 'VET_VISIT', daysAgo: 70, hour: 10, title: 'Tiêm vaccine 4 bệnh – mũi 1' },
    { type: 'BATH', daysAgo: 50, title: 'Tắm lần đầu' },
    { type: 'NOTE', daysAgo: 20, title: 'Thói quen', note: 'Đã biết đi vệ sinh đúng khay cát.' },
  ]);

  // ============================================================ MILESTONES
  console.log('🎉 Tạo mốc kỷ niệm...');
  for (const id of Object.values(P)) {
    const pet = await prisma.pet.findUniqueOrThrow({ where: { id } });
    await syncTogetherMilestones(prisma, pet, today);
  }
  await prisma.milestone.createMany({
    data: [
      { id: randomUUID(), petId: P.bo, userId: U.minh, type: 'BIRTHDAY', milestoneDate: dateOnlyToDb(daysAgo(1135)), title: 'Sinh nhật 1 tuổi của Bơ 🎂' },
      { id: randomUUID(), petId: P.bo, userId: U.minh, type: 'CUSTOM', milestoneDate: dateOnlyToDb(daysAgo(400)), title: 'Lần đầu đi biển 🌊', note: 'Vũng Tàu' },
      { id: randomUUID(), petId: P.mochi, userId: U.minh, type: 'CUSTOM', milestoneDate: dateOnlyToDb(daysAgo(200)), title: 'Triệt sản thành công', note: 'Bé rất ngoan' },
      { id: randomUUID(), petId: P.miu, userId: U.lan, type: 'CUSTOM', milestoneDate: dateOnlyToDb(daysAgo(20)), title: 'Biết đi vệ sinh đúng chỗ 🏅' },
    ],
  });

  // ============================================================ SUBSCRIPTIONS
  console.log('💳 Tạo gói thuê bao...');
  await prisma.subscription.createMany({
    data: [
      // Minh: Cloud+ đang hoạt động
      { id: randomUUID(), userId: U.minh, planId: 'CLOUD_PLUS_MONTHLY', provider: 'MANUAL', externalSubscriptionId: 'SEED-MINH-CLOUDPLUS', status: 'ACTIVE', startedAt: at(20), expiresAt: at(-10), autoRenew: true },
      // Lan: Cloud+ đã hết hạn -> về FREE nhưng KHÔNG mất dữ liệu
      { id: randomUUID(), userId: U.lan, planId: 'CLOUD_PLUS_MONTHLY', provider: 'MANUAL', externalSubscriptionId: 'SEED-LAN-CLOUDPLUS-OLD', status: 'EXPIRED', startedAt: at(70), expiresAt: at(40), autoRenew: false },
    ],
  });

  // ============================================================ NOTIFICATIONS
  console.log('🔔 Tạo thông báo...');
  const lastMiuWeight = at(45, 18);
  await prisma.notification.createMany({
    data: [
      { id: randomUUID(), userId: U.minh, type: 'SYSTEM', title: 'Chào mừng đến PawPrint 🐾', body: 'Mỗi dấu chân đều kể một câu chuyện. Hãy tạo hồ sơ cho bé đầu tiên nhé!', dedupeKey: 'SEED:WELCOME', status: 'SENT', scheduledAt: at(1190), sentAt: at(1190), readAt: at(1190) },
      { id: randomUUID(), userId: U.minh, petId: P.bo, type: 'MILESTONE', title: '🎉 Một cột mốc đáng nhớ!', body: 'Hôm nay là 1000 ngày bên Bơ 🐾. Lưu lại một khoảnh khắc nhé!', dedupeKey: 'SEED:MILESTONE:BO:1000', status: 'SENT', scheduledAt: at(181), sentAt: at(181), readAt: at(181, 12) },
      { id: randomUUID(), userId: U.minh, petId: P.mochi, type: 'MILESTONE', title: '🎉 Một cột mốc đáng nhớ!', body: 'Hôm nay là 365 ngày bên Mochi 🐾. Lưu lại một khoảnh khắc nhé!', dedupeKey: 'SEED:MILESTONE:MOCHI:365', status: 'SENT', scheduledAt: at(36), sentAt: at(36), readAt: at(36, 19) },
      { id: randomUUID(), userId: U.minh, type: 'SYSTEM', title: 'Cloud+ đã được kích hoạt ✨', body: 'Bạn có thể lưu không giới hạn khoảnh khắc và tối đa 10 ảnh mỗi moment.', dedupeKey: 'SEED:CLOUDPLUS', status: 'SENT', scheduledAt: at(20), sentAt: at(20) },
      { id: randomUUID(), userId: U.lan, type: 'SYSTEM', title: 'Chào mừng đến PawPrint 🐾', body: 'Mỗi dấu chân đều kể một câu chuyện.', dedupeKey: 'SEED:WELCOME', status: 'SENT', scheduledAt: at(100), sentAt: at(100), readAt: at(100) },
      { id: randomUUID(), userId: U.lan, type: 'SYSTEM', title: 'Gói Cloud+ đã hết hạn', body: 'Kỷ niệm của bạn vẫn được giữ nguyên. Gia hạn để tiếp tục lưu không giới hạn.', dedupeKey: 'SEED:CLOUDPLUS-EXPIRED', status: 'SENT', scheduledAt: at(40), sentAt: at(40) },
      // cùng định dạng dedupe với job -> job sẽ không tạo trùng
      { id: randomUUID(), userId: U.lan, petId: P.miu, type: 'WEIGHT_REMINDER', title: '⚖️ Cập nhật cân nặng cho Miu', body: 'Đã 45 ngày bạn chưa ghi cân nặng của Miu. Theo dõi đều đặn giúp phát hiện thay đổi sớm hơn.', dataJson: { daysSinceLastWeight: 45 }, dedupeKey: `WEIGHT:${P.miu}:${lastMiuWeight.toISOString().slice(0, 10)}:1`, status: 'SENT', scheduledAt: at(0, 9), sentAt: at(0, 9) },
    ] as Prisma.NotificationCreateManyInput[],
  });

  // ============================================================ RECAP (V1.1 – mẫu)
  const prevMonthStart = (() => {
    const [y, m] = today.split('-').map(Number) as [number, number];
    const d = new Date(Date.UTC(y, m - 2, 1));
    return d.toISOString().slice(0, 10);
  })();
  const nextMonthStart = (() => {
    const [y, m] = prevMonthStart.split('-').map(Number) as [number, number];
    return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  })();
  const range = { gte: startOfLocalDay(prevMonthStart, TZ), lt: startOfLocalDay(nextMonthStart, TZ) };
  const [rMoments, rCare, rWeights] = await Promise.all([
    prisma.moment.count({ where: { petId: P.mochi, occurredAt: range } }),
    prisma.careRecord.groupBy({ by: ['type'], where: { petId: P.mochi, occurredAt: range }, _count: { _all: true } }),
    prisma.careRecord.findMany({ where: { petId: P.mochi, type: 'WEIGHT', occurredAt: range }, orderBy: { occurredAt: 'asc' } }),
  ]);
  await prisma.recap.create({
    data: {
      id: randomUUID(),
      petId: P.mochi,
      periodType: 'MONTH',
      periodStart: dateOnlyToDb(prevMonthStart),
      payloadJson: {
        moments: rMoments,
        care: Object.fromEntries(rCare.map((c) => [c.type, c._count._all])),
        weightKg: rWeights.length ? { start: Number(rWeights[0]!.valueDecimal), end: Number(rWeights[rWeights.length - 1]!.valueDecimal) } : null,
        note: 'Recap mẫu (V1.1) – tổng hợp từ dữ liệu thực tế của tháng',
      },
    },
  });

  // ============================================================ PRODUCTS (V2 – mẫu)
  await prisma.product.createMany({
    data: [
      { id: PRODUCT_IDS[0]!, name: 'Hạt Royal Canin Indoor 2kg', description: 'Thức ăn khô cho mèo trưởng thành sống trong nhà.', price: 459000, affiliateUrl: 'https://example.com/affiliate/royal-canin-indoor' },
      { id: PRODUCT_IDS[1]!, name: 'Cát vệ sinh đậu nành 6L', description: 'Vón nhanh, khử mùi, xả được bồn cầu.', price: 115000, affiliateUrl: 'https://example.com/affiliate/cat-tofu-litter' },
      { id: PRODUCT_IDS[2]!, name: 'Dây dắt phản quang cho chó nhỏ', description: 'Dài 1.5m, có đèn LED đi dạo tối.', price: 189000, affiliateUrl: 'https://example.com/affiliate/leash-led' },
      { id: PRODUCT_IDS[3]!, name: 'Sữa tắm da nhạy cảm 500ml', description: 'Chiết xuất yến mạch, không mùi.', price: 165000, affiliateUrl: 'https://example.com/affiliate/oatmeal-shampoo', isActive: false },
    ],
  });

  // ============================================================ AUDIT LOGS
  await prisma.auditLog.createMany({
    data: [
      { id: randomUUID(), actorUserId: U.minh, action: 'auth.register', createdAt: at(1190) },
      { id: randomUUID(), actorUserId: U.lan, action: 'auth.register', createdAt: at(100) },
      { id: randomUUID(), actorUserId: U.admin, action: 'admin.user.update', entityType: 'user', entityId: U.locked, metadataJson: { before: { status: 'ACTIVE' }, after: { status: 'LOCKED' }, reason: 'Spam nội dung (dữ liệu mẫu)' }, createdAt: at(5, 10) },
      { id: randomUUID(), actorUserId: U.minh, action: 'auth.login', ipAddress: '113.161.0.1', userAgent: 'PawPrint/1.0 (iPhone; iOS 18)', createdAt: at(0, 7) },
    ],
  });

  // ============================================================ SUMMARY
  const [users, pets, moments, media, care, milestones, notifs] = await Promise.all([
    prisma.user.count({ where: { id: { in: Object.values(U) } } }),
    prisma.pet.count({ where: { id: { in: Object.values(P) } } }),
    prisma.moment.count({ where: { petId: { in: Object.values(P) } } }),
    prisma.momentMedia.count({ where: { userId: { in: Object.values(U) } } }),
    prisma.careRecord.count({ where: { petId: { in: Object.values(P) } } }),
    prisma.milestone.count({ where: { petId: { in: Object.values(P) } } }),
    prisma.notification.count({ where: { userId: { in: Object.values(U) } } }),
  ]);
  console.log(`\n✅ Seed xong: ${users} users · ${pets} pets · ${moments} moments · ${media} ảnh · ${care}/${careCount} care records · ${milestones} milestones · ${notifs} notifications · 1 recap · 4 products\n`);
  console.table([
    { email: 'admin@pawprint.dev', role: 'ADMIN', 'tình huống test': 'Quản trị: stats, users, khoá/mở khoá, audit log' },
    { email: 'mod@pawprint.dev', role: 'ADMIN', 'tình huống test': 'Admin thứ 2 (test admin sửa admin)' },
    { email: 'minh@pawprint.dev', role: 'USER', 'tình huống test': 'Cloud+ · 2 pet (Mochi, Bơ) · đủ 3 mốc · dữ liệu dày' },
    { email: 'lan@pawprint.dev', role: 'USER', 'tình huống test': 'FREE (Cloud+ hết hạn) · Miu còn 4 ngày tới mốc 100 · quá hạn cân' },
    { email: 'locked@pawprint.dev', role: 'USER', 'tình huống test': 'LOCKED – đăng nhập bị chặn 403' },
    { email: 'newbie@pawprint.dev', role: 'USER', 'tình huống test': 'Chưa xác minh email · chưa có pet (empty state)' },
  ]);
  console.log(`🔑 Mật khẩu chung: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('\n❌ Seed thất bại:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
