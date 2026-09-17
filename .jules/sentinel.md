## 2025-09-17 - Path Traversal Prevention in Attachment File Handlers
**Vulnerability:** File paths stored in `campaign_attachments.file_path` were directly passed to `unlink()` and `$mail->addAttachment()` without validating whether they remained within the intended `uploads/attachments/` directory.
**Learning:** Even if uploaded filenames are randomized, database file path references could be manipulated or crafted if database integrity is compromised or if inputs bypass standard upload controllers.
**Prevention:** Always sanitize and validate file paths using `realpath()` and check that the target canonical path starts with `$baseDir . DIRECTORY_SEPARATOR` before performing file system operations.
