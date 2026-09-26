import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { Header } from './Header';
import { Icon } from './Icon';
import { Logo } from './Logo';
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
  it('renders the mark with the exact spec path', () => {
    const { container } = render(<Logo />);
    expect(container.querySelector('path')!.getAttribute('d')).toBe(
      'M40 30V14a10 10 0 0 1 10-10h3M40 20h12M40 30v15a11 11 0 0 1-11 11h-5',
    );
    expect(container.querySelector('circle')!.getAttribute('fill')).toBe('var(--accent)');
    expect(screen.getByText('fignda')).toBeInTheDocument();
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
  it('has nav, account link and theme toggle', () => {
    render(
      <MemoryRouter initialEntries={['/play']}>
        <AuthProvider>
          <Header />
        </AuthProvider>
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav).toHaveTextContent('Games');
    expect(nav).toHaveTextContent('How it works');
    expect(nav).toHaveTextContent('About');
    expect(screen.getByRole('link', { name: 'Games' }).className).toContain('active');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/signin?next=%2Fplay');
    expect(screen.getByRole('button', { name: /Switch to/ })).toBeInTheDocument();
  });
});
