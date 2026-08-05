import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockVerifyWebhook, mockSeedGenresForUser } = vi.hoisted(() => ({
  mockVerifyWebhook: vi.fn(),
  mockSeedGenresForUser: vi.fn(),
}));

vi.mock('@clerk/nextjs/webhooks', () => ({
  verifyWebhook: mockVerifyWebhook,
}));

vi.mock('@/lib/subjects/genres', () => ({
  seedGenresForUser: mockSeedGenresForUser,
}));

import { POST } from '@/app/api/webhooks/clerk/route';

beforeEach(() => {
  vi.clearAllMocks();
});

function req(body: unknown) {
  return new Request('http://localhost/api/webhooks/clerk', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'svix-id': 'msg_1',
      'svix-timestamp': '1700000000',
      'svix-signature': 'v1,test',
    },
  });
}

describe('Clerk webhook', () => {
  it('seeds genres for a new user on user.created', async () => {
    mockVerifyWebhook.mockResolvedValue({
      type: 'user.created',
      data: { id: 'user_abc123' },
    });
    const res = await POST(
      req({ type: 'user.created', data: { id: 'user_abc123' } }),
    );
    expect(res.status).toBe(200);
    expect(mockSeedGenresForUser).toHaveBeenCalledWith('user_abc123');
  });

  it('ignores non-user.created events', async () => {
    mockVerifyWebhook.mockResolvedValue({
      type: 'user.updated',
      data: { id: 'user_abc123' },
    });
    const res = await POST(
      req({ type: 'user.updated', data: { id: 'user_abc123' } }),
    );
    expect(res.status).toBe(200);
    expect(mockSeedGenresForUser).not.toHaveBeenCalled();
  });

  it('rejects a request with an invalid signature', async () => {
    mockVerifyWebhook.mockRejectedValue(new Error('bad signature'));
    const res = await POST(
      req({ type: 'user.created', data: { id: 'user_abc123' } }),
    );
    expect(res.status).toBe(400);
    expect(mockSeedGenresForUser).not.toHaveBeenCalled();
  });
});
