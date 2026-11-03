USE PawPrintDB;
GO
-- Replace the starter's generated role constraint without changing existing roles.
DECLARE @constraint sysname;
SELECT @constraint=cc.name FROM sys.check_constraints cc
WHERE cc.parent_object_id=OBJECT_ID('dbo.Users') AND cc.definition LIKE '%Role%';
IF @constraint IS NOT NULL
BEGIN
  DECLARE @ddl nvarchar(max)='ALTER TABLE dbo.Users DROP CONSTRAINT '+QUOTENAME(@constraint);
  EXEC sp_executesql @ddl;
END;
ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Role CHECK(Role IN ('owner','manage','admin'));
IF COL_LENGTH('dbo.Users','IsActive') IS NULL ALTER TABLE dbo.Users ADD IsActive BIT NOT NULL DEFAULT 1;
IF COL_LENGTH('dbo.Moments','RequestKey') IS NULL ALTER TABLE dbo.Moments ADD RequestKey UNIQUEIDENTIFIER NULL;
IF COL_LENGTH('dbo.MomentMedia','Format') IS NULL ALTER TABLE dbo.MomentMedia ADD Format NVARCHAR(20) NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE name='UX_Moments_RequestKey' AND object_id=OBJECT_ID('dbo.Moments'))
CREATE UNIQUE INDEX UX_Moments_RequestKey ON dbo.Moments(PetId,RequestKey) WHERE RequestKey IS NOT NULL;
GO
