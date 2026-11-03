-- Run after 06_shop_traffic.sql in the PawPrint database.
-- Existing category names and products are preserved.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.Categories','U') IS NULL
  CREATE TABLE dbo.Categories (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(80) NOT NULL CONSTRAINT UQ_Categories_Name UNIQUE,
    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Categories_Name CHECK(LEN(LTRIM(RTRIM(Name))) > 0)
  );
INSERT dbo.Categories(Name)
SELECT DISTINCT p.Category FROM dbo.Products p
WHERE NOT EXISTS(SELECT 1 FROM dbo.Categories c WHERE c.Name=p.Category);
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_Products_Category')
  ALTER TABLE dbo.Products WITH CHECK ADD CONSTRAINT FK_Products_Category
    FOREIGN KEY(Category) REFERENCES dbo.Categories(Name) ON UPDATE CASCADE;
COMMIT TRANSACTION;
