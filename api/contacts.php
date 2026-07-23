<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $stmt = $pdo->prepare('SELECT * FROM contacts WHERE id = ?');
            $stmt->execute([(int)$_GET['id']]);
            $row = $stmt->fetch();
            $row ? jsonResponse($row) : jsonResponse(['error' => 'Not found'], 404);
        }
        $page  = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(500, max(1, (int)($_GET['limit'] ?? 100)));
        $offset = ($page - 1) * $limit;
        $total  = $pdo->query('SELECT COUNT(*) FROM contacts')->fetchColumn();
        $stmt   = $pdo->prepare('SELECT * FROM contacts ORDER BY created_at DESC LIMIT ? OFFSET ?');
        $stmt->execute([$limit, $offset]);
        jsonResponse(['data' => $stmt->fetchAll(), 'total' => (int)$total, 'page' => $page, 'limit' => $limit]);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['email'])) {
            jsonResponse(['error' => 'email required'], 400);
        }

        // Generate unique unsubscribe token
        $token = bin2hex(random_bytes(16));

        $stmt = $pdo->prepare('INSERT INTO contacts (email, name, custom_fields, unsubscribe_token)
                               VALUES (?, ?, ?, ?)
                               ON DUPLICATE KEY UPDATE name=VALUES(name), custom_fields=VALUES(custom_fields)');
        $stmt->execute([
            $data['email'],
            $data['name'] ?? '',
            isset($data['custom_fields']) ? json_encode($data['custom_fields']) : null,
            $token,
        ]);
        jsonResponse(['id' => (int)$pdo->lastInsertId(), 'upserted' => true], 201);
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($_GET['id']) || empty($data['email'])) {
            jsonResponse(['error' => 'id and email required'], 400);
        }
        $stmt = $pdo->prepare('UPDATE contacts SET email=?, name=?, custom_fields=? WHERE id=?');
        $stmt->execute([
            $data['email'],
            $data['name'] ?? '',
            isset($data['custom_fields']) ? json_encode($data['custom_fields']) : null,
            (int)$_GET['id'],
        ]);
        jsonResponse(['success' => true]);
        break;

    case 'DELETE':
        if (empty($_GET['id'])) jsonResponse(['error' => 'id required'], 400);
        $stmt = $pdo->prepare('DELETE FROM contacts WHERE id = ?');
        $stmt->execute([(int)$_GET['id']]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
