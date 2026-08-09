import { describe, expect, it } from 'vitest';
import { releases } from '@/lib/releases/data';

describe('release data', () => {
  it('contains unique semantic versions', () => {
    const versions = releases.map((release) => release.version);

    expect(new Set(versions).size).toBe(versions.length);
    expect(versions.every((version) => /^\d+\.\d+\.\d+$/.test(version))).toBe(
      true,
    );
  });

  it('contains the fields needed to render every release', () => {
    expect(releases.length).toBeGreaterThan(0);

    for (const release of releases) {
      expect(release.title).not.toBe('');
      expect(release.summary).not.toBe('');
      expect(release.releasedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(release.changes.length).toBeGreaterThan(0);
    }
  });
});
