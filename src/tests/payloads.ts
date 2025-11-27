/**
 * OWASP-inspired security test payloads
 */

export const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  '<svg onload=alert("XSS")>',
  'javascript:alert("XSS")',
  '<iframe src="javascript:alert(\'XSS\')">',
];

export const SQLI_PAYLOADS = [
  "' OR '1'='1",
  "1' OR '1'='1' --",
  "' UNION SELECT NULL--",
  "admin'--",
  "1' AND 1=1--",
];

export const CSRF_PAYLOADS: string[] = [
  // CSRF tests check for token presence, not payloads
];

export const REDIRECT_PAYLOADS = [
  'https://evil.com',
  '//evil.com',
  'http://evil.com',
  'javascript:alert(1)',
];

export const COMMAND_INJECTION_PAYLOADS = [
  '; ls -la',
  '| cat /etc/passwd',
  '`whoami`',
  '$(whoami)',
];
