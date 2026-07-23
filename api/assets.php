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

        // Delete file from disk
        $parsed = parse_url($asset['url']);
        $filePath = __DIR__ . '/../uploads/assets/' . basename($parsed['path']);
        if (file_exists($filePath)) @unlink($filePath);

        $pdo->prepare('DELETE FROM assets WHERE id = ?')->execute([(int)$_GET['id']]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
