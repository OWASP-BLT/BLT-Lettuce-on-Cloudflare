import { describe, it, expect } from 'vitest';
import { renderDashboard } from '../src/dashboard';

describe('renderDashboard', () => {
  it('should return valid HTML', () => {
    const html = renderDashboard();
    
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it('should include the title', () => {
    const html = renderDashboard();
    
    expect(html).toContain('OWASP BLT');
    expect(html).toContain('Slack Welcome Bot');
  });

  it('should include stats cards', () => {
    const html = renderDashboard();
    
    expect(html).toContain('Total Members Welcomed');
    expect(html).toContain('Last Join');
    expect(html).toContain('Joins Today');
  });

  it('should include the chart container', () => {
    const html = renderDashboard();
    
    expect(html).toContain('joinsChart');
    expect(html).toContain('chart.js');
  });

  it('should include the deploy button', () => {
    const html = renderDashboard();
    
    expect(html).toContain('Deploy to Cloudflare');
    expect(html).toContain('deploy.workers.cloudflare.com');
  });

  it('should include API fetch calls', () => {
    const html = renderDashboard();
    
    expect(html).toContain('/api/stats');
    expect(html).toContain('/api/joins');
  });

  it('should include the joins table structure', () => {
    const html = renderDashboard();
    
    expect(html).toContain('joins-table');
    expect(html).toContain('Recent Joins');
  });
});
