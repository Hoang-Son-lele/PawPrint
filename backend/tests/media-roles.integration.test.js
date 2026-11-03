const { test } = require("node:test");
const assert = require("node:assert/strict");
test(
  "accounts, manage permissions and photo moment retry/ownership",
  { skip: process.env.RUN_SQL_TESTS !== "1" },
  async () => {
    const { randomUUID } = require("node:crypto");
    const jwt = require("jsonwebtoken");
    const env = require("../src/config/env");
    const { sql, getPool } = require("../src/config/db");
    const media = require("../src/services/media.service");
    let uploads = 0;
    const originalUpload = media.uploadPhoto,
      originalUrl = media.photoUrl;
    media.uploadPhoto = async (buffer, id) => {
      media.imageFormat(buffer);
      uploads++;
      return {
        public_id: id,
        format: "png",
        bytes: buffer.length,
        secure_url: "https://example.invalid/product.png",
      };
    };
    media.photoUrl = () => "https://example.invalid/signed-test-photo";
    const app = require("../src/app"),
      pool = await getPool();
    const admin = randomUUID(),
      manager = randomUUID(),
      staff = randomUUID(),
      owner = randomUUID(),
      pet = randomUUID();
    let product;
    const categoryId = randomUUID(), emptyCategoryId = randomUUID();
    const categoryName = `Category ${categoryId}`;
    const server = app.listen(0, "127.0.0.1");
    await new Promise((r) =>
      server.listening ? r() : server.once("listening", r),
    );
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function call(path, user, method = "GET", body) {
      const form = body instanceof FormData;
      const r = await fetch(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${jwt.sign({}, env.jwtSecret, { subject: user, expiresIn: "5m" })}`,
          ...(!form ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: form ? body : JSON.stringify(body) } : {}),
      });
      return { status: r.status, body: await r.json() };
    }
    function photo(key) {
      const f = new FormData();
      f.append(
        "file",
        new Blob([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])], {
          type: "image/png",
        }),
        "test.png",
      );
      f.append("caption", "Photo memory");
      f.append("occurredAt", "2026-11-02");
      f.append("requestKey", key);
      return f;
    }
    try {
      for (const [id, role] of [
        [admin, "admin"],
        [manager, "manager"],
        [staff, "staff"],
        [owner, "owner"],
      ])
        await pool
          .request()
          .input("id", sql.UniqueIdentifier, id)
          .input("role", sql.NVarChar(20), role)
          .input("email", sql.NVarChar(254), `${id}@media-test.invalid`)
          .query(
            "INSERT dbo.Users(Id,Email,PasswordHash,Role) VALUES(@id,@email,'test-only',@role)",
          );
      await pool
        .request()
        .input("pet", sql.UniqueIdentifier, pet)
        .input("owner", sql.UniqueIdentifier, owner)
        .query(
          "INSERT dbo.Pets(Id,UserId,Name,Species) VALUES(@pet,@owner,'Test cat','cat')",
        );
      assert.equal((await call("/admin/accounts", manager)).status, 403);
      for (const actor of [admin, owner]) {
        assert.equal((await call("/admin/categories", actor)).status, 403);
        assert.equal((await call("/admin/categories", actor, "POST", {name: categoryName})).status, 403);
        assert.equal((await call(`/admin/categories/${categoryId}`, actor, "PUT", {name: categoryName})).status, 403);
        assert.equal((await call(`/admin/categories/${categoryId}`, actor, "DELETE")).status, 403);
      }
      await pool.request().input('id', sql.UniqueIdentifier, categoryId)
        .input('name', sql.NVarChar(80), categoryName)
        .query('INSERT dbo.Categories(Id,Name) VALUES(@id,@name)');
      const added = await call('/admin/categories', staff, 'POST', {name: emptyCategoryId});
      assert.equal(added.status, 201);
      const addedId = added.body.id;
      assert.equal((await call('/admin/categories', manager, 'POST', {name: categoryName})).status, 409);
      assert.equal((await call('/admin/categories', staff, 'POST', {name: ' '})).status, 400);
      assert.equal((await call(`/admin/categories/${addedId}`, manager, 'PUT', {name: categoryName})).status, 409);
      assert.equal((await call(`/admin/categories/${addedId}`, staff, 'DELETE')).status, 200);
      assert.equal((await call(`/admin/categories/${addedId}`, staff, 'DELETE')).status, 404);
      assert.equal((await call('/admin/categories', manager)).status, 200);
      assert.equal((await call("/admin/accounts", staff)).status, 403);
      for (const path of ["/admin/products", "/admin/orders"]) {
        assert.equal((await call(path, admin)).status, 403);
        assert.equal((await call(path, staff)).status, 200);
      }
      for (const [path, method] of [
        ["/admin/products", "POST"],
        [`/admin/products/${randomUUID()}`, "PUT"],
        [`/admin/products/${randomUUID()}`, "DELETE"],
        [`/admin/orders/${randomUUID()}`, "PATCH"],
        ["/admin/product-image", "POST"],
      ]) assert.equal((await call(path, admin, method, {})).status, 403);
      assert.equal((await call("/admin/accounts", admin)).status, 200);
      assert.equal(
        (
          await call(`/admin/accounts/${admin}`, admin, "PATCH", {
            role: "owner",
            isActive: true,
          })
        ).status,
        400,
      );
      const created = await call("/admin/products", manager, "POST", {
        name: "Manager test",
        category: categoryName,
        price: 12000,
        stock: 2,
        isActive: true,
        imageUrls: ["https://example.invalid/one.jpg", "https://example.invalid/two.jpg"],
      });
      assert.equal(created.status, 201);
      product = created.body.id;
      const gallery = await call(`/shop/products/${product}`, owner);
      assert.deepEqual(gallery.body.product.imageUrls, ["https://example.invalid/one.jpg", "https://example.invalid/two.jpg"]);
      assert.equal(gallery.body.product.imageUrl, "https://example.invalid/one.jpg");
      const productBody = {name:'Gallery test', category:categoryName, price:12000, stock:2, isActive:true};
      for (const category of [undefined, '', ' ', randomUUID()]) {
        assert.equal((await call('/admin/products', staff, 'POST', {...productBody,category})).status, 400);
      }
      assert.equal((await call('/admin/products', staff, 'POST', {...productBody,imageUrls:['http://invalid.example/a.jpg']})).status, 400);
      assert.equal((await call(`/admin/products/${product}`, staff, 'PUT', {
        ...productBody, imageUrls:['https://example.invalid/two.jpg','https://example.invalid/three.jpg'],
      })).status, 200);
      const replaced = await call(`/shop/products/${product}`, owner);
      assert.deepEqual(replaced.body.product.imageUrls,['https://example.invalid/two.jpg','https://example.invalid/three.jpg']);
      assert.equal(replaced.body.product.imageUrl,'https://example.invalid/two.jpg');
      const listing = await call('/admin/products?limit=100', staff);
      // The gallery must also round trip through the editor's listing endpoint.
      const listedProduct = listing.body.items.find(p => p.id.toLowerCase() === product.toLowerCase());
      if (listedProduct) assert.deepEqual(listedProduct.imageUrls,replaced.body.product.imageUrls);
      const trafficBefore = await call("/admin/traffic?days=7", staff);
      assert.equal(trafficBefore.status, 200);
      const view = { eventId: randomUUID(), productId: product };
      assert.equal((await call("/shop/traffic", owner, "POST", view)).status, 202);
      assert.equal((await call("/shop/traffic", owner, "POST", view)).status, 202);
      assert.equal((await call("/shop/traffic", staff, "POST", {eventId: randomUUID()})).status, 202);
      const traffic = await call("/admin/traffic?days=7", staff);
      assert.equal(traffic.body.views, Number(trafficBefore.body.views) + 1);
      assert.equal(traffic.body.productViews, Number(trafficBefore.body.productViews) + 1);
      assert.equal((await call("/admin/traffic", manager)).status, 200);
      assert.equal((await call("/admin/traffic", owner)).status, 403);
      assert.equal((await call("/admin/traffic", admin)).status, 403);
      assert.equal((await call("/admin/traffic?days=999", staff)).status, 400);
      assert.equal((await call("/shop/traffic", owner, "POST", {eventId: "bad"})).status, 400);
      assert.equal((await call(`/admin/products/${product}`, staff, "PUT", {
        name: "Staff updated product", category: categoryName, price: 15000,
        stock: 3, isActive: true,
      })).status, 200);
      assert.deepEqual((await call(`/shop/products/${product}`, owner)).body.product.imageUrls,
        ['https://example.invalid/two.jpg','https://example.invalid/three.jpg']);
      assert.equal((await call(`/admin/categories/${categoryId}`, manager, 'DELETE')).status, 409);
      assert.equal((await call(`/admin/categories/${categoryId}`, manager, 'PUT', {name: categoryName+' renamed'})).status, 200);
      const renamed = await call(`/shop/products/${product}`, owner);
      assert.equal(renamed.body.product.category, categoryName+' renamed');
      assert.ok((await call('/shop/categories', owner)).body.items.some(c => c.name === categoryName+' renamed'));
      assert.equal((await call(`/admin/accounts/${manager}`, staff, "PATCH", {
        role: "admin", isActive: true,
      })).status, 403);
      assert.equal((await call("/admin/orders", manager)).status, 200);
      assert.equal(
        (await call("/admin/product-image", owner, "POST", photo(randomUUID())))
          .status,
        403,
      );
      const image = await call(
        "/admin/product-image",
        manager,
        "POST",
        photo(randomUUID()),
      );
      assert.equal(image.status, 200);
      assert.equal(image.body.imageUrl, "https://example.invalid/product.png");
      uploads = 0;
      assert.equal(
        (await call(`/admin/products/${product}`, staff, "DELETE")).status,
        200,
      );
      assert.equal(
        (await call(`/shop/products/${product}`, owner)).status,
        404,
      );
      const key = randomUUID();
      assert.equal(
        (await call(`/pets/${pet}/moments/photo`, manager, "POST", photo(key)))
          .status,
        404,
      );
      const first = await call(
        `/pets/${pet}/moments/photo`,
        owner,
        "POST",
        photo(key),
      );
      assert.equal(first.status, 201);
      const retry = await call(
        `/pets/${pet}/moments/photo`,
        owner,
        "POST",
        photo(key),
      );
      assert.equal(retry.body.id, first.body.id);
      assert.equal(uploads, 1);
      const list = await call(`/pets/${pet}/moments`, owner);
      assert.equal(list.body.items.length, 1);
      assert.equal(list.body.items[0].photos.length, 1);
      assert.equal((await call(`/pets/${pet}/moments`, manager)).status, 404);
      assert.equal(
        (
          await call(`/admin/accounts/${manager}`, admin, "PATCH", {
            role: "owner",
            isActive: true,
          })
        ).status,
        200,
      );
      assert.equal((await call("/admin/products", manager)).status, 403);
      assert.equal(
        (
          await call(`/admin/accounts/${manager}`, admin, "PATCH", {
            role: "manager",
            isActive: false,
          })
        ).status,
        200,
      );
      assert.equal((await call("/shop/products", manager)).status, 401);
      assert.equal(
        (
          await call(`/admin/accounts/${manager}`, admin, "PATCH", {
            role: "manager",
            isActive: true,
          })
        ).status,
        200,
      );
      assert.equal((await call("/admin/products", manager)).status, 200);
    } finally {
      media.uploadPhoto = originalUpload;
      media.photoUrl = originalUrl;
      await new Promise((r) => server.close(r));
      await pool
        .request()
        .input("a", sql.UniqueIdentifier, admin)
        .input("b", sql.UniqueIdentifier, manager)
        .input("c", sql.UniqueIdentifier, owner)
        .input("d", sql.UniqueIdentifier, staff)
        .input("pet", sql.UniqueIdentifier, pet)
        .input("p", sql.UniqueIdentifier, product || null)
        .input("category", sql.UniqueIdentifier, categoryId)
        .input("emptyCategory", sql.NVarChar(80), emptyCategoryId)
        .query(`DELETE mm FROM dbo.MomentMedia mm JOIN dbo.Moments m ON m.Id=mm.MomentId WHERE m.PetId=@pet;
        DELETE dbo.Moments WHERE PetId=@pet; DELETE dbo.Pets WHERE Id=@pet;
        DELETE dbo.ShopTraffic WHERE UserId IN(@a,@b,@c,@d);
        DELETE dbo.Products WHERE Id=@p; DELETE dbo.AuditLogs WHERE ActorId IN(@a,@b,@c,@d);
        DELETE dbo.Categories WHERE Id=@category OR Name=@emptyCategory;
        DELETE dbo.RefreshSessions WHERE UserId IN(@a,@b,@c,@d); DELETE dbo.Users WHERE Id IN(@a,@b,@c,@d);`);
      await pool.close();
    }
  },
);
