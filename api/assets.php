<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

switch ($method) {
    case 'GET':
        $stmt = $pdo->query('SELECT * FROM assets ORDER BY created_at DESC');
        jsonResponse($stmt->fetchAll());
        break;

    case 'DELETE':
        if (empty($_GET['id'])) jsonResponse(['error' => 'id required'], 400);
        $stmt = $pdo->prepare('SELECT * FROM assets WHERE id = ?');
        $stmt->execute([(int)$_GET['id']]);
        $asset = $stmt->fetch();
        if (!$asset) jsonResponse(['error' => 'Not found'], 404);

        // Delete file from disk (Security: validate canonical path to prevent path traversal / arbitrary file deletion)
        $parsed = parse_url($asset['url']);
        $filename = basename($parsed['path'] ?? '');
        $allowedDir = realpath(__DIR__ . '/../uploads/assets');
        if ($filename !== '' && $allowedDir !== false) {
            $filePath = realpath($allowedDir . DIRECTORY_SEPARATOR . $filename);
            if ($filePath !== false && is_file($filePath) && str_starts_with($filePath, $allowedDir . DIRECTORY_SEPARATOR)) {
                @unlink($filePath);
            }
        }

        $pdo->prepare('DELETE FROM assets WHERE id = ?')->execute([(int)$_GET['id']]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
