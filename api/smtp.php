<?php
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo    = getDB();

switch ($method) {
    case 'GET':
        if (isset($_GET['id'])) {
            $stmt = $pdo->prepare('SELECT id, label, email, daily_limit, created_at FROM smtp_accounts WHERE id = ?');
            $stmt->execute([(int)$_GET['id']]);
            $row = $stmt->fetch();
            $row ? jsonResponse($row) : jsonResponse(['error' => 'Not found'], 404);
        }
        $stmt = $pdo->query('SELECT id, label, email, daily_limit, created_at FROM smtp_accounts ORDER BY created_at DESC');
        jsonResponse($stmt->fetchAll());
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (empty($data['label']) || empty($data['email']) || empty($data['app_password'])) {
            jsonResponse(['error' => 'label, email, app_password required'], 400);
        }
        $encrypted = encrypt($data['app_password']);
        $stmt = $pdo->prepare('INSERT INTO smtp_accounts (label, email, app_password_encrypted, daily_limit) VALUES (?, ?, ?, ?)');
        $stmt->execute([
            $data['label'],
            $data['email'],
            $encrypted,
            $data['daily_limit'] ?? 400,
        ]);
        jsonResponse(['id' => (int)$pdo->lastInsertId()], 201);
        break;

    case 'PUT':
        if (empty($_GET['id'])) jsonResponse(['error' => 'id required'], 400);
        $data = json_decode(file_get_contents('php://input'), true);

        $fields = [];
        $params = [];
        foreach (['label','email','daily_limit'] as $key) {
            if (array_key_exists($key, $data)) {
                $fields[] = "$key = ?";
                $params[] = $data[$key];
            }
        }
        if (array_key_exists('app_password', $data)) {
            $fields[] = 'app_password_encrypted = ?';
            $params[] = encrypt($data['app_password']);
        }
        if (empty($fields)) jsonResponse(['error' => 'No fields to update'], 400);
        $params[] = (int)$_GET['id'];
        $stmt = $pdo->prepare('UPDATE smtp_accounts SET ' . implode(', ', $fields) . ' WHERE id = ?');
        $stmt->execute($params);
        jsonResponse(['success' => true]);
        break;

    case 'DELETE':
        if (empty($_GET['id'])) jsonResponse(['error' => 'id required'], 400);
        $pdo->prepare('DELETE FROM smtp_accounts WHERE id = ?')->execute([(int)$_GET['id']]);
        jsonResponse(['success' => true]);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
