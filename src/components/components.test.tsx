// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { Header } from './Header';
import { Icon } from './Icon';
import { Logo, LogoMark } from './Logo';
import { CAT } from '../brand/cat';
import { LOGO_G, LOGO_REST } from './logoPaths';
import { TextLink } from './TextLink';
import { ThemeToggle } from './ThemeToggle';
import { THEME_KEY } from '../lib/theme';
import { AuthProvider } from '../lib/auth';

describe('ThemeToggle', () => {
  it('flips data-theme and persists it', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    render(<ThemeToggle />);
    const btn = screen.getByRole('button', { name: 'Switch to light theme' });
    await userEvent.click(btn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(btn).toHaveAccessibleName('Switch to dark theme');
    await userEvent.click(btn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  });
});

describe('Icon', () => {
  it('uses stroke 1.75 and hides decorative icons', () => {
    const { container } = render(<Icon icon={ArrowRight} size={18} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('stroke-width')).toBe('1.75');
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('exposes a label when given', () => {
    render(<Icon icon={ArrowRight} label="Next" />);
    expect(screen.getByRole('img', { name: 'Next' })).toBeInTheDocument();
  });
});

describe('Logo', () => {
  it('renders the wordmark from the spec paths: the cat, then the letters in ink', () => {
    const { container } = render(<Logo />);
    // Every shape of the cat, and nothing else, sits in the group before the letters.
    expect(container.querySelectorAll('svg > g > *')).toHaveLength(CAT.length);
    const letters = container.querySelector('svg > path');
    expect(letters!.getAttribute('d')).toBe(LOGO_G + LOGO_REST);
    expect(letters!.getAttribute('fill')).toBe('currentColor');
    expect(screen.getByRole('img', { name: 'Gazecraft' })).toBeInTheDocument();
  });

  it('the mark is the cat alone, and decorative', () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelectorAll('svg > *')).toHaveLength(CAT.length);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Button', () => {
  it('renders a button with the variant class', () => {
    render(<Button variant="accent">Play today</Button>);
    const btn = screen.getByRole('button', { name: 'Play today' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn.className).toContain('accent');
  });

  it('renders a link with `to`', () => {
    render(
      <MemoryRouter>
        <Button to="/play" variant="secondary">
          More games
        </Button>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'More games' })).toHaveAttribute('href', '/play');
  });
});

describe('TextLink', () => {
  it('is a button without `to`', async () => {
    let n = 0;
    render(<TextLink onClick={() => n++}>Give me a hint</TextLink>);
    await userEvent.click(screen.getByRole('button', { name: 'Give me a hint' }));
    expect(n).toBe(1);
  });
});

describe('Header', () => {
  const at = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Header />
        </AuthProvider>
      </MemoryRouter>,
    );

  it('in the app: app links, account link and theme toggle, no landing anchors', () => {
    at('/play');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav).toHaveTextContent('CasesRanksSquad');
    expect(nav).not.toHaveTextContent('How it works');
    expect(screen.getByRole('link', { name: 'Cases' }).className).toContain('active');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin?next=%2Fplay');
    expect(screen.getByRole('button', { name: /Switch to/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Play' })).toBeNull();
  });

  it('on the landing page: its own sections and one way in', () => {
    at('/');
    expect(screen.queryByRole('navigation', { name: 'Main' })).toBeNull();
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    expect(nav).toHaveTextContent('How it worksAbout');
    expect(screen.getByRole('link', { name: 'Play' })).toHaveAttribute('href', '/play');
  });
});
