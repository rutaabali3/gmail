# Contributing Guidelines

Thank you for your interest in contributing to the Cold Email Campaign Tool. We welcome contributions from developers of all skill levels. Please review this document before submitting bug reports, feature requests, or code contributions.

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful, professional, and welcoming environment for all contributors.

1. **Be Respectful**: Treat all community members with empathy, kindness, and professionalism.
2. **Be Constructive**: Focus reviews and discussions on code quality, security, performance, and user experience.
3. **Be Collaborative**: Welcome feedback and support fellow contributors in resolving issues.

---

## How to Contribute

### 1. Reporting Bugs

If you discover a bug or issue, please follow these steps before submitting a report:

- Search existing issues and pull requests to ensure the problem has not already been reported.
- Verify that the issue exists on the latest `main` branch.
- Gather relevant contextual details:
  - Operating system and environment (e.g., Windows 11, XAMPP, PHP version, MySQL version).
  - Web browser version.
  - Steps to reproduce the problem.
  - Error logs (PHP error log, browser console logs, MySQL error output).

### 2. Suggesting Enhancements

Feature requests are highly appreciated. When submitting a proposal:

- Explain the rationale behind the request and how it improves the application.
- Describe the proposed implementation or user workflow in detail.
- State any potential impacts on security, database performance, or backwards compatibility.

### 3. Submitting Code Changes

Follow this workflow when preparing a pull request:

1. **Fork and Clone**: Fork the repository and clone your fork locally.
2. **Create a Feature Branch**: Use a descriptive branch name following the format `feature/feature-name` or `fix/bug-description`.
3. **Implement Changes**: Write clean, maintainable, and well-documented code adhering to project standards.
4. **Test Thoroughly**: Test API endpoints, UI rendering, database interaction, and error handling.
5. **Commit**: Write clear, concise commit messages following standard conventions.
6. **Push and PR**: Push your branch to GitHub and open a Pull Request against the `main` branch.

---

## Development Setup

### Local Prerequisites

- **PHP**: Version 8.0 or higher with PDO, OpenSSL, and Fileinfo extensions enabled.
- **MySQL / MariaDB**: Version 5.7+ / 10.3+.
- **Composer**: Package manager for PHP dependencies.
- **Web Server**: Apache / Nginx or XAMPP / WampServer / Local WP environment.

### Installation Steps

1. Clone the repository into your local server root (e.g., `htdocs`):
   ```bash
   git clone https://github.com/your-username/gmail.git
   cd gmail
   ```

2. Install PHP dependencies:
   ```bash
   composer install
   ```

3. Configure local database:
   - Create a database (e.g., `gmail_db`).
   - Import `db/schema.sql`:
     ```bash
     mysql -u root -p gmail_db < db/schema.sql
     ```

4. Create configuration file:
   - Copy `config.example.php` to `config.php`.
   - Update database host, credentials, encryption key, and base URL.

---

## Coding Standards

### PHP Standards

- Adhere strictly to **PSR-12** coding standard.
- Use explicit type declarations and strict mode where applicable (`declare(strict_types=1);`).
- Execute database queries exclusively using Prepared Statements with `PDO` to prevent SQL injection.
- Validate and sanitize all external inputs using appropriate filters or validation routines.
- Encrypt sensitive stored data (such as SMTP credentials) using AES-256-CBC.

### JavaScript Standards

- Write modern ECMAScript (ES6+) without reliance on external frameworks or libraries.
- Keep frontend logic structured cleanly inside standard event listeners and modular functions.
- Handle API interactions gracefully using native `fetch()` with explicit error handling and user status feedback.
- Avoid inline Javascript handlers in HTML attributes (`onclick`, etc.); bind event listeners in `app.js`.

### CSS Standards

- Utilize CSS variables defined in `:root` for theme consistency across dark and light modes.
- Maintain responsive, fluid layouts compatible with mobile, tablet, and desktop viewports.
- Keep component styles organized and well-commented.

---

## Commit Message Guidelines

Commit messages should be formatted clearly:

```text
<type>(<scope>): <short summary>

[optional detailed description]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semi-colons, CSS changes without logic change
- `refactor`: Code refactoring without functionality changes
- `test`: Adding or modifying test suites
- `chore`: Maintenance tasks, dependency updates, configuration changes

---

## Pull Request Checklist

Before submitting your pull request, verify that:

- [ ] Code follows all project coding and security standards.
- [ ] No syntax errors, warnings, or debug statements remain in the codebase.
- [ ] Database changes (if any) are included in or compatible with `db/schema.sql`.
- [ ] Documentation (`README.md`, inline code comments) is updated accordingly.
- [ ] No emojis are present in documentation or code comments per project guidelines.
- [ ] Feature tested successfully on both Light and Dark themes.

---

## Security Policy

Security reports are taken very seriously. If you discover a security vulnerability, please do NOT create a public issue. Send a report directly to the repository maintainer with full technical details and reproduction steps.
