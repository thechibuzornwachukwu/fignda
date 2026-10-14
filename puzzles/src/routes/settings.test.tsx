// @vitest-environment jsdom
// Download my data: one tap saves everything kept about the player as a file, and a failure says so.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const world = vi.hoisted(() => ({ data: null as unknown, fail: false }));
vi.mock('../lib/auth', () => ({
  useAuth: () => ({ enabled: true, loading: false, session: { user: { email: 'ada@example.com', app_metadata: {} } }, profile: { id: 'u1', name: 'Ada', handle: 'ada', avatar: null }, refreshProfile: async () => {} }),
}));
vi.mock('../lib/api', async (original) => ({
  ...(await original<typeof import('../lib/api')>()),
  exportMyData: async () => {
    if (world.fail) throw new Error('offline');
    return world.data;
  },
}));
vi.mock('./Reminders', () => ({ Reminders: () => null }));

const { Settings } = await import('./Settings');

function show() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );
}

describe('Download my data', () => {
  beforeEach(() => {
    world.data = { profile: { handle: 'ada' }, plays: [] };
    world.fail = false;
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
  });

  it('saves a JSON file named for the player and the day', async () => {
    const clicked: HTMLAnchorElement[] = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Download my data' }));
    await waitFor(() => expect(clicked).toHaveLength(1));
    expect(clicked[0]!.download).toMatch(/^gazecraft-ada-\d{4}-\d{2}-\d{2}\.json$/);
    const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Blob;
    expect(JSON.parse(await blob.text())).toEqual(world.data);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    expect(screen.queryByRole('alert')).toBeNull();
    click.mockRestore();
  });

  it('a failure says so, and the button works again', async () => {
    world.fail = true;
    show();
    const button = screen.getByRole('button', { name: 'Download my data' });
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('That did not download. Try again.');
    expect(button).not.toBeDisabled();
  });
});
