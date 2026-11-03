const { test } = require("node:test");
const assert = require("node:assert/strict");
test(
  "SQL integration: ownership, cart, checkout retries, stock and fulfillment",
  { skip: process.env.RUN_SQL_TESTS !== "1" },
  async () => {
    const { randomUUID } = require("node:crypto");
    const jwt = require("jsonwebtoken");
    const env = require("../src/config/env");
    const { getPool, sql } = require("../src/config/db");
    const app = require("../src/app");
    const pool = await getPool();
    const owner = randomUUID(),
      other = randomUUID(),
      admin = randomUUID(),
      product = randomUUID(),
      pet = randomUUID();
    const server = app.listen(0, "127.0.0.1");
    await new Promise((r) =>
      server.listening ? r() : server.once("listening", r),
    );
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function call(path, user = owner, method = "GET", body) {
      const r = await fetch(base + path, {
        method,
        headers: {
          Authorization: `Bearer ${jwt.sign({}, env.jwtSecret, { subject: user, expiresIn: "5m" })}`,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: r.status, body: await r.json() };
    }
    try {
      for (const id of [owner, other, admin])
        await pool
          .request()
          .input("id", sql.UniqueIdentifier, id)
          .input("email", sql.NVarChar(254), `${id}@integration.invalid`)
          .input("role", sql.NVarChar(20), id === admin ? "manager" : "owner")
          .query(
            "INSERT dbo.Users(Id,Email,PasswordHash,Role) VALUES(@id,@email,'unused',@role)",
          );
      const { createSession } = require("../src/utils/sessions");
      const refreshToken = await createSession(owner);
      const renewed = await call("/auth/refresh", owner, "POST", {
        refreshToken,
      });
      assert.equal(renewed.status, 200);
      assert.notEqual(renewed.body.refreshToken, refreshToken);
      assert.equal(
        (await call("/auth/refresh", owner, "POST", { refreshToken })).status,
        401,
      );
      assert.equal(
        (
          await call("/auth/logout", owner, "POST", {
            refreshToken: renewed.body.refreshToken,
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await call("/auth/refresh", owner, "POST", {
            refreshToken: renewed.body.refreshToken,
          })
        ).status,
        401,
      );
      await pool
        .request()
        .input("id", sql.UniqueIdentifier, pet)
        .input("user", sql.UniqueIdentifier, owner)
        .query(
          "INSERT dbo.Pets(Id,UserId,Name,Species) VALUES(@id,@user,N'Test pet','cat')",
        );
      const p = {
        name: "Integration product",
        category: product,
        description: "Test only",
        price: 25000,
        stock: 3,
        isActive: true,
      };
      assert.equal(
        (await call("/admin/products", owner, "POST", p)).status,
        403,
      );
      // Insert fixed ID so cleanup also works after a failed assertion.
      await pool
        .request()
        .input("id", sql.UniqueIdentifier, product)
        .input("category", sql.NVarChar(80), product)
        .query(
          "INSERT dbo.Categories(Id,Name) VALUES(@id,@category); INSERT dbo.Products(Id,Name,Category,Price,Stock) VALUES(@id,'Test',@category,25000,3)",
        );
      assert.equal(
        (await call(`/pets/${pet}/care-records`, other)).status,
        404,
      );
      assert.equal(
        (
          await call(`/pets/${pet}/care-records`, owner, "POST", {
            type: "weight",
            valueDecimal: -1,
            occurredAt: "2026-01-01",
          })
        ).status,
        400,
      );
      const record = await call(`/pets/${pet}/care-records`, owner, "POST", {
        type: "weight",
        valueDecimal: 4.2,
        note: "test",
        occurredAt: "2026-01-01",
      });
      assert.equal(record.status, 201);
      assert.equal(
        (await call(`/care-records/${record.body.id}`, other, "DELETE")).status,
        404,
      );
      assert.equal((await call(`/pets/${pet}/timeline`)).body.items.length, 1);
      assert.equal(
        (
          await call(`/care-records/${record.body.id}`, owner, "PATCH", {
            type: "weight",
            valueDecimal: 4.5,
            note: "edited",
            occurredAt: "2026-01-02",
          })
        ).status,
        200,
      );
      assert.equal(
        (await call(`/pets/${pet}/care-records`)).body.items[0].valueDecimal,
        4.5,
      );
      const moment = await call(`/pets/${pet}/moments`, owner, "POST", {
        caption: "A memory",
        occurredAt: "2026-01-01",
      });
      assert.equal(moment.status, 201);
      assert.equal(
        (
          await call(`/moments/${moment.body.id}`, other, "PATCH", {
            caption: "Not mine",
            occurredAt: "2026-01-01",
          })
        ).status,
        404,
      );
      assert.equal(
        (await call(`/moments/${moment.body.id}`, owner, "DELETE")).status,
        200,
      );
      assert.equal((await call(`/pets/${pet}/moments`)).body.items.length, 0);
      assert.equal(
        (await call(`/pets/${pet}/recaps?year=2026&month=1`)).body.careRecords,
        1,
      );
      assert.equal(
        (await call(`/pets/${pet}/recaps?year=2026&month=1`, other)).status,
        404,
      );
      assert.equal(
        (
          await call(`/pets/${pet}`, owner, "PATCH", {
            adoptedAt: "9998-01-01",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await call(`/pets/${pet}`, owner, "PATCH", {
            adoptedAt: "2020-01-01",
          })
        ).status,
        200,
      );
      await call(`/pets/${pet}/together-days`);
      await call(`/pets/${pet}/together-days`);
      assert.equal(
        (await call(`/pets/${pet}/timeline?type=milestone`)).body.items.length,
        3,
      );
      assert.equal(
        (await call(`/shop/cart/${product}`, owner, "PUT", { quantity: 4 }))
          .status,
        409,
      );
      assert.equal(
        (await call(`/shop/cart/${product}`, owner, "PUT", { quantity: 2 }))
          .status,
        200,
      );
      const checkout = {
        recipient: "Test User",
        phone: "0901234567",
        address: "Test address",
        requestKey: randomUUID(),
      };
      const first = await call("/shop/orders", owner, "POST", checkout);
      assert.equal(first.status, 201);
      const order = first.body.order.id;
      const retry = await call("/shop/orders", owner, "POST", checkout);
      assert.equal(retry.body.order.id, order);
      assert.equal((await call(`/shop/orders/${order}`, other)).status, 404);
      assert.equal(
        (await call(`/shop/orders/${order}`)).body.order.total,
        50000,
      );
      assert.equal(
        (await call(`/shop/products/${product}`)).body.product.stock,
        1,
      );
      assert.equal(
        (
          await call(`/admin/orders/${order}`, admin, "PATCH", {
            status: "shipping",
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await call(`/admin/orders/${order}`, admin, "PATCH", {
            status: "cancelled",
          })
        ).status,
        200,
      );
      assert.equal(
        (
          await call(`/admin/orders/${order}`, admin, "PATCH", {
            status: "cancelled",
          })
        ).status,
        409,
      );
      assert.equal(
        (await call(`/shop/products/${product}`)).body.product.stock,
        3,
      );
      // Two buyers race for the last stock; only one order may succeed.
      for (const user of [owner, other])
        assert.equal(
          (await call(`/shop/cart/${product}`, user, "PUT", { quantity: 2 }))
            .status,
          200,
        );
      const raced = await Promise.all([
        call("/shop/orders", owner, "POST", {
          ...checkout,
          requestKey: randomUUID(),
        }),
        call("/shop/orders", other, "POST", {
          ...checkout,
          requestKey: randomUUID(),
        }),
      ]);
      assert.deepEqual(raced.map((r) => r.status).sort(), [201, 409]);
    } finally {
      await new Promise((r) => server.close(r));
      await pool
        .request()
        .input("a", sql.UniqueIdentifier, owner)
        .input("b", sql.UniqueIdentifier, other)
        .input("c", sql.UniqueIdentifier, admin)
        .input("p", sql.UniqueIdentifier, product)
        .input("pet", sql.UniqueIdentifier, pet).query(`
    DELETE i FROM dbo.OrderItems i JOIN dbo.Orders o ON o.Id=i.OrderId WHERE o.UserId IN(@a,@b,@c);
    DELETE dbo.Orders WHERE UserId IN(@a,@b,@c); DELETE dbo.CartItems WHERE UserId IN(@a,@b,@c);
    DELETE dbo.CareRecords WHERE PetId=@pet; DELETE dbo.Moments WHERE PetId=@pet; DELETE dbo.Milestones WHERE PetId=@pet; DELETE dbo.Pets WHERE Id=@pet;
    DELETE dbo.AuditLogs WHERE ActorId IN(@a,@b,@c);
    DELETE dbo.RefreshSessions WHERE UserId IN(@a,@b,@c);
    DELETE dbo.Products WHERE Id=@p; DELETE dbo.Categories WHERE Id=@p; DELETE dbo.Users WHERE Id IN(@a,@b,@c);`);
      await pool.close();
    }
  },
);
