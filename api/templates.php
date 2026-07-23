<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $stmt = $pdo->prepare('SELECT * FROM templates WHERE id = ?');
            $stmt->execute([(int)$_GET['id']]);
            $row = $stmt->fetch();
            $row ? jsonResponse($row) : jsonResponse(['error' => 'Not found'], 404);
        }
        $stmt = $pdo->query('SELECT * FROM templates ORDER BY created_at DESC');
        jsonResponse($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['name']) || empty($data['subject']) || !isset($data['body_html'])) {
            jsonResponse(['error' => 'name, subject, body_html required'], 400);
        }
        $stmt = $pdo->prepare('INSERT INTO templates (name, subject, body_html) VALUES (?, ?, ?)');
        $stmt->execute([$data['name'], $data['subject'], $data['body_html']]);
        jsonResponse(['id' => (int)$pdo->lastInsertId()], 201);
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($_GET['id']) || empty($data['name']) || empty($data['subject']) || !isset($data['body_html'])) {
            jsonResponse(['error' => 'id, name, subject, body_html required'], 400);
        }
        $stmt = $pdo->prepare('UPDATE templates SET name=?, subject=?, body_html=? WHERE id=?');
        $stmt->execute([$data['name'], $data['subject'], $data['body_html'], (int)$_GET['id']]);
        jsonResponse(['success' => true]);
        break;

    case 'DELETE':
        if (empty($_GET['id'])) jsonResponse(['error' => 'id required'], 400);
        $stmt = $pdo->prepare('DELETE FROM templates WHERE id = ?');
        $stmt->execute([(int)$_GET['id']]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
