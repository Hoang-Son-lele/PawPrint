-- Run after 04_media_roles.sql. Preserve existing users and migrate the legacy role.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @ddl nvarchar(max) = N'';
SELECT @ddl = @ddl + N'ALTER TABLE dbo.Users DROP CONSTRAINT ' + QUOTENAME(name) + N';'
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.Users') AND definition LIKE '%Role%';
EXEC sp_executesql @ddl;
UPDATE dbo.Users SET Role='manager', UpdatedAt=SYSUTCDATETIME() WHERE Role='manage';
ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_Role CHECK(Role IN ('owner','admin','manager','staff'));
COMMIT TRANSACTION;
