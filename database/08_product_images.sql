-- Run after 07_categories.sql. Existing product cover images are preserved.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID('dbo.ProductImages','U') IS NULL
  CREATE TABLE dbo.ProductImages (
    ProductId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Products(Id) ON DELETE CASCADE,
    Position INT NOT NULL CHECK(Position BETWEEN 0 AND 9),
    Url NVARCHAR(500) NOT NULL,
    CONSTRAINT PK_ProductImages PRIMARY KEY(ProductId,Position)
  );
INSERT dbo.ProductImages(ProductId,Position,Url)
SELECT p.Id,0,p.ImageUrl FROM dbo.Products p
WHERE NULLIF(p.ImageUrl,'') IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM dbo.ProductImages i WHERE i.ProductId=p.Id);
COMMIT TRANSACTION;
