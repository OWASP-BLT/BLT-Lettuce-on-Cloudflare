/**
 * Security test runner
 */

import { SecurityTestResult } from '../types';
import { XSS_PAYLOADS, SQLI_PAYLOADS, REDIRECT_PAYLOADS } from './payloads';

export async function runSecurityTest(scenario: string, targetUrl: string): Promise<SecurityTestResult> {
  const testFunctions: Record<string, (url: string) => Promise<SecurityTestResult>> = {
    'xss': testXSS,
    'sqli': testSQLi,
    'csrf': testCSRF,
    'open-redirect': testOpenRedirect,
  };

  const testFn = testFunctions[scenario.toLowerCase()];
  if (!testFn) {
    return {
      scenario,
      target: targetUrl,
      passed: false,
      details: 'Unknown test scenario',
    };
  }

  try {
    return await testFn(targetUrl);
  } catch (error: any) {
    return {
      scenario,
      target: targetUrl,
      passed: false,
      details: `Test error: ${error.message}`,
    };
  }
}

async function testXSS(targetUrl: string): Promise<SecurityTestResult> {
  const payload = XSS_PAYLOADS[0];
  const testUrl = `${targetUrl}?q=${encodeURIComponent(payload)}`;

  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'BLT-Lettuce-Bot/3.0' },
    });

    const body = await response.text();
    const vulnerable = body.includes(payload) && !body.includes('&lt;script&gt;');

    return {
      scenario: 'xss',
      target: targetUrl,
      passed: !vulnerable,
      details: vulnerable 
        ? 'WARNING: Potential XSS vulnerability detected - payload reflected unescaped'
        : 'No XSS vulnerability detected - payload properly escaped',
    };
  } catch (error: any) {
    return {
      scenario: 'xss',
      target: targetUrl,
      passed: false,
      details: `Request failed: ${error.message}`,
    };
  }
}

async function testSQLi(targetUrl: string): Promise<SecurityTestResult> {
  const payload = SQLI_PAYLOADS[0];
  const testUrl = `${targetUrl}?id=${encodeURIComponent(payload)}`;

  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'BLT-Lettuce-Bot/3.0' },
    });

    const body = await response.text();
    const errorPatterns = [
      /sql syntax/i,
      /mysql_fetch/i,
      /pg_query/i,
      /sqlite_/i,
      /ORA-\d{5}/i,
    ];

    const vulnerable = errorPatterns.some(pattern => pattern.test(body));

    return {
      scenario: 'sqli',
      target: targetUrl,
      passed: !vulnerable,
      details: vulnerable
        ? 'WARNING: Potential SQL Injection vulnerability - database error exposed'
        : 'No SQL Injection vulnerability detected',
    };
  } catch (error: any) {
    return {
      scenario: 'sqli',
      target: targetUrl,
      passed: false,
      details: `Request failed: ${error.message}`,
    };
  }
}

async function testCSRF(targetUrl: string): Promise<SecurityTestResult> {
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'BLT-Lettuce-Bot/3.0' },
    });

    const body = await response.text();
    const hasCSRFToken = /csrf[_-]?token/i.test(body) || /<input[^>]*name=["']_token["']/i.test(body);

    return {
      scenario: 'csrf',
      target: targetUrl,
      passed: hasCSRFToken,
      details: hasCSRFToken
        ? 'CSRF protection detected - token found in response'
        : 'WARNING: No CSRF token detected - forms may be vulnerable',
    };
  } catch (error: any) {
    return {
      scenario: 'csrf',
      target: targetUrl,
      passed: false,
      details: `Request failed: ${error.message}`,
    };
  }
}

async function testOpenRedirect(targetUrl: string): Promise<SecurityTestResult> {
  const payload = REDIRECT_PAYLOADS[0];
  const testUrl = `${targetUrl}?redirect=${encodeURIComponent(payload)}`;

  try {
    const response = await fetch(testUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': 'BLT-Lettuce-Bot/3.0' },
    });

    const location = response.headers.get('location');
    const vulnerable = location && location.includes('evil.com');

    return {
      scenario: 'open-redirect',
      target: targetUrl,
      passed: !vulnerable,
      details: vulnerable
        ? 'WARNING: Open redirect vulnerability detected - external redirect allowed'
        : 'No open redirect vulnerability detected',
    };
  } catch (error: any) {
    return {
      scenario: 'open-redirect',
      target: targetUrl,
      passed: false,
      details: `Request failed: ${error.message}`,
    };
  }
}
