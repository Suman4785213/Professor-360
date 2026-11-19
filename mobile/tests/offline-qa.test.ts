import { expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { createSessionClient } from '../src/services/client';

it('blocks public and authenticated network dispatch when no endpoint is configured', async () => {
  const client = createSessionClient('', { read: async () => null, write: async () => {} }, () => {});
  const publicMock = new MockAdapter(client.publicApi);
  const privateMock = new MockAdapter(client.api);
  publicMock.onAny().reply(200);
  privateMock.onAny().reply(200);
  await expect(client.publicApi.get('colleges/public/')).rejects.toThrow();
  await expect(client.api.get('auth/me/')).rejects.toThrow();
  expect(publicMock.history).toHaveLength(0);
  expect(privateMock.history).toHaveLength(0);
});
