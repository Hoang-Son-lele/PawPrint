-- Run after 05_staff_roles.sql in the PawPrint database.
-- Each event is a screen view, not a unique visitor or a live online session.
IF OBJECT_ID('dbo.ShopTraffic','U') IS NULL
BEGIN
  CREATE TABLE dbo.ShopTraffic (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Users(Id),
    ProductId UNIQUEIDENTIFIER NULL REFERENCES dbo.Products(Id),
    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX IX_ShopTraffic_CreatedAt ON dbo.ShopTraffic(CreatedAt)
    INCLUDE (UserId,ProductId);
END;
