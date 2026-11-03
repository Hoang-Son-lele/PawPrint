-- ===================================================
-- PawPrint Complete Database Setup Script
-- Compatible with Microsoft SQL Server 2019 / 2022
-- ===================================================

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'PawPrintDB')
BEGIN
    CREATE DATABASE PawPrintDB;
END
GO

USE PawPrintDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Bảng Users (Người dùng / Tài khoản)
IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Email NVARCHAR(254) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        DisplayName NVARCHAR(100) NULL,
        TimeZone NVARCHAR(80) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
        Role NVARCHAR(20) NOT NULL DEFAULT 'owner' CHECK(Role IN ('owner','admin','manager','staff')),
        IsActive BIT NOT NULL DEFAULT 1,
        AvatarUrl NVARCHAR(500) NULL,
        Phone NVARCHAR(30) NULL,
        Bio NVARCHAR(1000) NULL,
        ProfileCreatedAt DATETIME2(3) NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 2. Bảng Pets (Hồ sơ thú cưng)
IF OBJECT_ID('dbo.Pets', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Pets (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        UserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Users(Id),
        Name NVARCHAR(100) NOT NULL,
        Species NVARCHAR(50) NOT NULL,
        Breed NVARCHAR(100) NULL,
        Sex NVARCHAR(10) NULL,
        BirthDate DATE NULL,
        AdoptedAt DATE NULL,
        WeightKg DECIMAL(5,2) NULL,
        Notes NVARCHAR(1000) NULL,
        AvatarUrl NVARCHAR(500) NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        DeletedAt DATETIME2(3) NULL
    );
END
GO

-- 3. Bảng Moments (Khoảnh khắc) & MomentMedia
IF OBJECT_ID('dbo.Moments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Moments (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PetId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Pets(Id),
        Caption NVARCHAR(1000) NULL,
        OccurredAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        RequestKey UNIQUEIDENTIFIER NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        DeletedAt DATETIME2(3) NULL
    );
END
GO

IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Moments_RequestKey' AND object_id=OBJECT_ID('dbo.Moments'))
BEGIN
    CREATE UNIQUE INDEX UX_Moments_RequestKey ON dbo.Moments(PetId,RequestKey) WHERE RequestKey IS NOT NULL;
END
GO

IF OBJECT_ID('dbo.MomentMedia', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.MomentMedia (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        MomentId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Moments(Id),
        StorageKey NVARCHAR(255) NOT NULL,
        MimeType NVARCHAR(100) NOT NULL,
        SizeBytes INT NOT NULL,
        Format NVARCHAR(20) NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 4. Bảng CareRecords (Nhật ký chăm sóc: cân nặng, tiêm chủng...)
IF OBJECT_ID('dbo.CareRecords', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CareRecords (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PetId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Pets(Id),
        Type NVARCHAR(50) NOT NULL,
        ValueDecimal DECIMAL(8,2) NULL,
        Unit NVARCHAR(20) NULL,
        Note NVARCHAR(1000) NULL,
        OccurredAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        DeletedAt DATETIME2(3) NULL
    );
END
GO

-- 5. Bảng Milestones (Cột mốc đồng hành)
IF OBJECT_ID('dbo.Milestones', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Milestones (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        PetId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Pets(Id),
        Type NVARCHAR(50) NOT NULL,
        MilestoneDate DATE NOT NULL,
        Title NVARCHAR(200) NOT NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 6. Bảng RefreshSessions
IF OBJECT_ID('dbo.RefreshSessions', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.RefreshSessions (
        TokenHash CHAR(64) PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Users(Id),
        ExpiresAt DATETIME2(3) NOT NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- 7. Bảng Categories (Danh mục sản phẩm shop)
IF OBJECT_ID('dbo.Categories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Categories (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Name NVARCHAR(80) NOT NULL CONSTRAINT UQ_Categories_Name UNIQUE
    );
END
GO

-- 8. Bảng Products (Sản phẩm shop)
IF OBJECT_ID('dbo.Products', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Products (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        Name NVARCHAR(160) NOT NULL,
        Category NVARCHAR(80) NOT NULL,
        Description NVARCHAR(2000) NULL,
        Price DECIMAL(12,0) NOT NULL CHECK(Price >= 0),
        Currency CHAR(3) NOT NULL DEFAULT 'VND',
        Stock INT NOT NULL CHECK(Stock >= 0),
        ImageUrl NVARCHAR(500) NULL,
        IsActive BIT NOT NULL DEFAULT 1
    );
END
GO

IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_Products_Category')
BEGIN
    ALTER TABLE dbo.Products WITH CHECK ADD CONSTRAINT FK_Products_Category
        FOREIGN KEY(Category) REFERENCES dbo.Categories(Name) ON UPDATE CASCADE;
END
GO
-- 9. Bảng ProductImages (Ảnh sản phẩm)
IF OBJECT_ID('dbo.ProductImages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductImages (
        Id BIGINT IDENTITY PRIMARY KEY,
        ProductId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Products(Id) ON DELETE CASCADE,
        Position INT NOT NULL,
        Url NVARCHAR(500) NOT NULL,
        CONSTRAINT UQ_ProductImages_Pos UNIQUE(ProductId, Position)
    );
END
GO

-- 10. Bảng CartItems & Orders & OrderItems (Giỏ hàng & Đơn hàng)
IF OBJECT_ID('dbo.CartItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.CartItems (
        UserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Users(Id),
        ProductId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Products(Id),
        Quantity INT NOT NULL CHECK(Quantity BETWEEN 1 AND 99),
        PRIMARY KEY(UserId, ProductId)
    );
END
GO

IF OBJECT_ID('dbo.Orders', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orders (
        Id UNIQUEIDENTIFIER PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Users(Id),
        RequestKey UNIQUEIDENTIFIER NOT NULL,
        Recipient NVARCHAR(100) NOT NULL,
        Phone NVARCHAR(30) NOT NULL,
        Address NVARCHAR(500) NOT NULL,
        Total DECIMAL(14,0) NOT NULL,
        Status NVARCHAR(30) NOT NULL DEFAULT 'pending',
        PaymentMethod NVARCHAR(20) NOT NULL DEFAULT 'cod',
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Orders_Request UNIQUE(UserId, RequestKey)
    );
END
GO

IF OBJECT_ID('dbo.OrderItems', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderItems (
        OrderId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Orders(Id),
        ProductId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Products(Id),
        ProductName NVARCHAR(160) NOT NULL,
        UnitPrice DECIMAL(12,0) NOT NULL,
        Quantity INT NOT NULL CHECK(Quantity > 0),
        PRIMARY KEY(OrderId, ProductId)
    );
END
GO

-- 11. Bảng AuditLogs & ShopTraffic
IF OBJECT_ID('dbo.AuditLogs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLogs (
        Id BIGINT IDENTITY PRIMARY KEY,
        ActorId UNIQUEIDENTIFIER NOT NULL,
        Action NVARCHAR(80) NOT NULL,
        EntityId UNIQUEIDENTIFIER NOT NULL,
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

IF OBJECT_ID('dbo.ShopTraffic', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShopTraffic (
        Id UNIQUEIDENTIFIER PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL REFERENCES dbo.Users(Id),
        ProductId UNIQUEIDENTIFIER NULL REFERENCES dbo.Products(Id),
        CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO

-- Chèn danh mục mặc định nếu chưa có
IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = N'Thức ăn')
    INSERT INTO dbo.Categories(Id, Name) VALUES (NEWID(), N'Thức ăn');
IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = N'Phụ kiện')
    INSERT INTO dbo.Categories(Id, Name) VALUES (NEWID(), N'Phụ kiện');
IF NOT EXISTS (SELECT 1 FROM dbo.Categories WHERE Name = N'Vệ sinh & Chăm sóc')
    INSERT INTO dbo.Categories(Id, Name) VALUES (NEWID(), N'Vệ sinh & Chăm sóc');
GO

