-- Run after 08_product_images.sql. Pets already has AvatarUrl.
IF COL_LENGTH('dbo.Users','AvatarUrl') IS NULL
  ALTER TABLE dbo.Users ADD AvatarUrl NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.Users','Phone') IS NULL
  ALTER TABLE dbo.Users ADD Phone NVARCHAR(30) NULL;
IF COL_LENGTH('dbo.Users','Bio') IS NULL
  ALTER TABLE dbo.Users ADD Bio NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.Users','ProfileCreatedAt') IS NULL
  ALTER TABLE dbo.Users ADD ProfileCreatedAt DATETIME2(3) NULL;
