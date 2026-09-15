## 2025-02-16 - Path Traversal Prevention in Email Attachments
**Vulnerability:** `api/send.php` appended database-stored attachment file paths directly to the base directory without canonical path verification (`realpath`), allowing potential path traversal / arbitrary file attachments.
**Learning:** Even when uploaded filenames are sanitized at upload time, DB entries or relative paths in file attachments can lead to Local File Inclusion if the resolved path is not constrained to the intended uploads directory.
**Prevention:** Use `realpath()` and verify that the canonical path starts with `$allowedDir . DIRECTORY_SEPARATOR` before including or reading files from disk.
