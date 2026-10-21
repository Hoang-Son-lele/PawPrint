/**
 * E2E smoke test trên môi trường thật (TiDB + Cloudinary) – theo tiêu chí nghiệm thu MVP (SRS mục 9).
 *   1. npm run dev        (terminal khác)
 *   2. npm run test:e2e
 * Script tự tạo user test và XOÁ toàn bộ dữ liệu test (DB + Cloudinary) khi kết thúc.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}/api/v1`;
const prisma = new PrismaClient();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// PNG 8x8 hợp lệ
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAIAQMAAAD+wSzIAAAABlBMVEX/AAD///9BHTQRAAAAEUlEQVQI12P4z8DAwMDAAAAJ/gH/v3B0AAAAAElFTkSuQmCC';

let passed = 0;
let failed = 0;
let token = '';

function check(name: string, cond: unknown, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : '');
  }
}

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any = text ? JSON.parse(text) : null;
  return { status: res.status, json };
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

async function main() {
  const email = `e2e+${Date.now()}@pawprint.test`;
  let userId = '';
  console.log(`🧪 E2E trên ${BASE}\n`);

  try {
    console.log('1) Health & Plans');
    check('GET /health', (await api('GET', '/health')).status === 200);
    const plans = await api('GET', '/plans');
    check('GET /plans có FREE', plans.json?.data?.some((p: { id: string }) => p.id === 'FREE'), plans.json);

    console.log('\n2) Auth (FR-01)');
    const reg = await api('POST', '/auth/register', {
      email,
      password: 'Paw12345',
      displayName: 'E2E Tester',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    check('Đăng ký 201', reg.status === 201, reg.json);
    userId = reg.json?.data?.user?.id;
    check('Đăng ký trùng email -> 409', (await api('POST', '/auth/register', { email, password: 'Paw12345' })).status === 409);
    check('Sai mật khẩu -> 401', (await api('POST', '/auth/login', { email, password: 'Wrong1234' })).status === 401);
    const login = await api('POST', '/auth/login', { email, password: 'Paw12345' });
    check('Đăng nhập 200', login.status === 200, login.json);
    token = login.json.data.tokens.accessToken;
    const rt1 = login.json.data.tokens.refreshToken;
    const ref = await api('POST', '/auth/refresh', { refreshToken: rt1 });
    check('Refresh token xoay vòng', ref.status === 200 && ref.json.data.tokens.refreshToken !== rt1, ref.json);
    check('Dùng lại refresh token cũ -> 401', (await api('POST', '/auth/refresh', { refreshToken: rt1 })).status === 401);
    check('Sau reuse, token mới cũng bị thu hồi', (await api('POST', '/auth/refresh', { refreshToken: ref.json.data.tokens.refreshToken })).status === 401);
    const me = await api('GET', '/users/me');
    check('GET /users/me', me.status === 200 && me.json.data.email === email, me.json);

    console.log('\n3) Pet Profile (FR-02) & Together Days (FR-03)');
    const p1 = await api('POST', '/pets', {
      name: 'Mochi', species: 'CAT', sex: 'FEMALE', birthDate: daysAgo(500), adoptedAt: daysAgo(120), weightKg: 3.2,
    });
    check('Tạo pet 1', p1.status === 201, p1.json);
    const pet1 = p1.json.data;
    check('Together days = 121 (ngày đón về = ngày 1)', pet1.togetherDays === 121, pet1);
    const p2 = await api('POST', '/pets', { name: 'Bơ', species: 'DOG' });
    check('Tạo pet 2 (không có ngày)', p2.status === 201 && p2.json.data.togetherDays === null, p2.json);
    const pet2 = p2.json.data;
    check('Ngày đón về ở tương lai -> 400', (await api('POST', '/pets', { name: 'X', adoptedAt: daysAgo(-2) })).status === 400);
    check('Pet đầu tiên tự là current', (await api('GET', '/users/me')).json.data.currentPetId === pet1.id);
    const sw = await api('PATCH', '/users/me', { currentPetId: pet2.id });
    check('Chuyển pet hiện hành', sw.json?.data?.currentPetId === pet2.id, sw.json);
    check('Danh sách 2 pet', (await api('GET', '/pets')).json.data.length === 2);
    const td = await api('GET', `/pets/${pet1.id}/together-days`);
    check('Together days: mốc 100 đã đạt, next = 365',
      td.json.data.milestones[0].reached === true && td.json.data.nextMilestone.days === 365, td.json);
    const ms = await api('GET', `/pets/${pet1.id}/milestones`);
    check('Milestone TOGETHER_100 được tạo đúng 1 lần',
      ms.json.data.filter((m: { type: string }) => m.type === 'TOGETHER_100').length === 1, ms.json);
    const upd = await api('PATCH', `/pets/${pet1.id}`, { note: 'Thích ngủ', version: pet1.version });
    check('Sửa pet với version đúng', upd.status === 200 && upd.json.data.version === pet1.version + 1, upd.json);
    check('Sửa pet với version cũ -> 409', (await api('PATCH', `/pets/${pet1.id}`, { note: 'x', version: pet1.version })).status === 409);

    console.log('\n4) Care Diary (FR-06)');
    const w = await api('POST', `/pets/${pet1.id}/care-records`, { type: 'WEIGHT', valueDecimal: 3.6 });
    check('Ghi cân nặng', w.status === 201 && w.json.data.unit === 'kg', w.json);
    check('Cân nặng thiếu giá trị -> 400', (await api('POST', `/pets/${pet1.id}/care-records`, { type: 'WEIGHT' })).status === 400);
    const vet = await api('POST', `/pets/${pet1.id}/care-records`, { type: 'VET_VISIT', title: 'Tiêm phòng dại' });
    check('Ghi khám thú y', vet.status === 201, vet.json);
    const wEdit = await api('PATCH', `/care-records/${w.json.data.id}`, { valueDecimal: 3.7 });
    check('Sửa cân nặng', wEdit.status === 200 && wEdit.json.data.valueDecimal === 3.7, wEdit.json);
    check('pets.weight_kg đồng bộ = 3.7', (await api('GET', `/pets/${pet1.id}`)).json.data.weightKg === 3.7);
    const ws = await api('GET', `/pets/${pet1.id}/weights`);
    check('Biểu đồ cân nặng 2 điểm, change = +0.5', ws.json.data.points.length === 2 && ws.json.data.summary.changeKg === 0.5, ws.json);

    console.log('\n5) Paw Moments + Cloudinary (FR-04)');
    const sig = await api('POST', '/media/upload-url', { purpose: 'MOMENT' });
    check('Xin chữ ký upload', sig.status === 201 && sig.json.data.signature, sig.json);
    const form = new FormData();
    form.append('file', new Blob([Buffer.from(PNG_BASE64, 'base64')], { type: 'image/png' }), 'test.png');
    form.append('api_key', sig.json.data.apiKey);
    form.append('signature', sig.json.data.signature);
    for (const [k, v] of Object.entries(sig.json.data.params)) form.append(k, String(v));
    const up = await fetch(sig.json.data.uploadUrl, { method: 'POST', body: form });
    const upJson = (await up.json()) as { type?: string };
    check('Upload thẳng lên Cloudinary bằng chữ ký', up.status === 200 && upJson.type === 'authenticated', upJson);
    const conf = await api('POST', '/media/confirm', { publicId: sig.json.data.publicId });
    check('Confirm media', conf.status === 201 && conf.json.data.id, conf.json);
    const fakeConf = await api('POST', '/media/confirm', { publicId: 'pawprint/u_someone-else/moments/x' });
    check('Confirm ảnh của người khác -> 403', fakeConf.status === 403, fakeConf.json);
    const mom = await api('POST', `/pets/${pet1.id}/moments`, { caption: 'Ngày đầu về nhà 🏡', mediaIds: [conf.json.data.id] });
    check('Tạo moment kèm ảnh', mom.status === 201 && mom.json.data.media.length === 1, mom.json);
    const signedUrl = mom.json.data?.media?.[0]?.thumbnailUrl;
    const img = signedUrl ? await fetch(signedUrl) : null;
    check('URL ảnh có chữ ký xem được (200)', img?.status === 200, { status: img?.status, signedUrl });
    const unsigned = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/authenticated/${sig.json.data.publicId}`;
    check('URL không chữ ký bị chặn (ảnh riêng tư)', (await fetch(unsigned)).status !== 200);
    check('Moment không ảnh -> 400', (await api('POST', `/pets/${pet1.id}/moments`, { caption: 'x', mediaIds: [] })).status === 400);
    check('Tải lại vẫn thấy moment', (await api('GET', `/pets/${pet1.id}/moments`)).json.data.length === 1);

    console.log('\n6) Timeline (FR-05)');
    const tl = await api('GET', `/pets/${pet1.id}/timeline?limit=2`);
    check('Timeline trang 1 có 2 item + nextCursor', tl.json.data.length === 2 && tl.json.meta.nextCursor, tl.json);
    const tl2 = await api('GET', `/pets/${pet1.id}/timeline?limit=50&cursor=${tl.json.meta.nextCursor}`);
    const all = [...tl.json.data, ...tl2.json.data];
    const kinds = new Set(all.map((i: { kind: string }) => i.kind));
    check('Timeline gộp MOMENT + CARE + MILESTONE', kinds.has('MOMENT') && kinds.has('CARE') && kinds.has('MILESTONE'), [...kinds]);
    const sorted = all.every((it: { occurredAt: string }, i: number) => i === 0 || all[i - 1].occurredAt >= it.occurredAt);
    check('Sắp xếp giảm dần theo ngày sự kiện, không trùng', sorted && new Set(all.map((i: { id: string }) => i.id)).size === all.length);
    const tlF = await api('GET', `/timeline?kinds=CARE&careTypes=WEIGHT`);
    check('Lọc timeline theo loại', tlF.json.data.every((i: { kind: string }) => i.kind === 'CARE'), tlF.json);

    console.log('\n7) Ownership & Quota');
    const subMe = await api('GET', '/subscriptions/me');
    check('GET /subscriptions/me: gói FREE, usage đúng', subMe.json.data.plan.id === 'FREE' && subMe.json.data.usage.pets === 2, subMe.json);
    const myToken = token;
    const other = await api('POST', '/auth/register', { email: `e2e-other+${Date.now()}@pawprint.test`, password: 'Paw12345' });
    token = other.json.data.tokens.accessToken;
    const otherId = other.json.data.user.id;
    check('User khác không xem được pet -> 404', (await api('GET', `/pets/${pet1.id}`)).status === 404);
    check('User khác không sửa được moment -> 404', (await api('PATCH', `/moments/${mom.json.data.id}`, { caption: 'hack' })).status === 404);
    await prisma.user.delete({ where: { id: otherId } });
    token = myToken;

    console.log('\n8) Xoá pet (cần xác nhận)');
    check('Xoá không confirm -> 400', (await api('DELETE', `/pets/${pet2.id}`)).status === 400);
    check('Xoá có confirm -> 204', (await api('DELETE', `/pets/${pet2.id}?confirm=true`)).status === 204);
    check('Current pet chuyển về pet còn lại', (await api('GET', '/users/me')).json.data.currentPetId === pet1.id);

    console.log('\n9) Notifications');
    const nf = await api('GET', '/notifications');
    check('GET /notifications', nf.status === 200, nf.json);
  } finally {
    console.log('\n🧹 Dọn dữ liệu test...');
    if (userId) {
      await cloudinary.api
        .delete_resources_by_prefix(`${process.env.CLOUDINARY_FOLDER ?? 'pawprint'}/u_${userId}/`, { type: 'authenticated' })
        .catch((e) => console.warn('  Cloudinary cleanup:', e?.error?.message ?? e));
      await prisma.auditLog.deleteMany({ where: { actorUserId: userId } });
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
    console.log(`\n${failed === 0 ? '🎉' : '⚠️'} Kết quả: ${passed} passed, ${failed} failed`);
    process.exitCode = failed ? 1 : 0;
  }
}

main().catch((e) => {
  console.error('💥', e);
  process.exit(1);
});
