## 2025-02-16 - Path Traversal Prevention in Email Attachments
**Vulnerability:** `api/send.php` appended database-stored attachment file paths directly to the base directory without canonical path verification (`realpath`), allowing potential path traversal / arbitrary file attachments.
**Learning:** Even when uploaded filenames are sanitized at upload time, DB entries or relative paths in file attachments can lead to Local File Inclusion if the resolved path is not constrained to the intended uploads directory.
**Prevention:** Use `realpath()` and verify that the canonical path starts with `$allowedDir . DIRECTORY_SEPARATOR` before including or reading files from disk.

## 2025-02-18 - Path Traversal Prevention in Attachment Deletion
**Vulnerability:** Attachment deletion endpoints (`api/campaign_attachments.php` and `api/campaigns.php`) attempted to `unlink()` file paths stored in database without canonical path verification (`realpath`), allowing arbitrary file deletion if relative path traversal strings were stored in `file_path`.
**Learning:** Fixing path traversal on read/include endpoints (like `api/send.php`) without updating deletion endpoints leaves the application vulnerable to arbitrary file deletion.
**Prevention:** Always apply `realpath()` and boundary verification (`str_starts_with($fullPath, $allowedDir . DIRECTORY_SEPARATOR)`) consistently across ALL operations (read, send, delete) on user/DB file paths.
