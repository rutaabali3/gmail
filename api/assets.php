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

        // Delete file from disk safely
        $allowedDir = realpath(__DIR__ . '/../uploads/assets');
        $parsed     = parse_url($asset['url']);
        $targetFile = __DIR__ . '/../uploads/assets/' . basename($parsed['path'] ?? '');
        $realPath   = realpath($targetFile);
        if ($realPath !== false && $allowedDir !== false && str_starts_with($realPath, $allowedDir . DIRECTORY_SEPARATOR) && is_file($realPath)) {
            @unlink($realPath);
        }

        $pdo->prepare('DELETE FROM assets WHERE id = ?')->execute([(int)$_GET['id']]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
