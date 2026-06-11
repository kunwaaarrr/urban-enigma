// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { App } from '../src/app';
import { getLines } from '../src/data/openings';
import { squareCenter } from '../src/chess/coords';

beforeEach(() => {
  cleanup();
  localStorage.clear();
  location.hash = '';
});

describe('app smoke', () => {
  it('renders the home screen with both openings', () => {
    render(<App />);
    expect(screen.getByText('Caro-Kann Defense')).toBeTruthy();
    expect(screen.getByText('Vienna Gambit')).toBeTruthy();
    expect(screen.getByText(/Drill everything/)).toBeTruthy();
  });

  it('renders the variation list for the Caro-Kann', async () => {
    location.hash = '#/o/caro-kann';
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('Advance: 3...Bf5 Main Line')).toBeTruthy();
      expect(screen.getByText('Classical: 4...Bf5 Main Line')).toBeTruthy();
    });
    expect(screen.getAllByText('Learn').length).toBeGreaterThan(5);
  });

  it('runs a learn session end to end with the Next button', async () => {
    vi.useFakeTimers();
    const line = getLines('vienna')[0];
    location.hash = `#/t/${encodeURIComponent(line.id)}/learn`;
    const { container } = render(<App />);

    // Intro → Start
    await fireEvent.click(screen.getByText('Start'));
    // Vienna: user is White and moves first.
    for (let guard = 0; guard < 60; guard++) {
      const next = screen.queryByText('Next');
      if (next) {
        await fireEvent.click(next);
      } else {
        // opponent is moving
        await vi.advanceTimersByTimeAsync(700);
      }
      if (screen.queryByText(/Line complete/)) break;
    }
    expect(screen.queryByText(/Line complete/)).toBeTruthy();
    // Learn completion does not award mastery
    expect(localStorage.getItem('oct:v1:progress')).toBeNull();
    expect(container.querySelectorAll('.piece').length).toBeGreaterThan(20);
    vi.useRealTimers();
  });

  it('records mastery after a clean drill via board pointer input', async () => {
    vi.useFakeTimers();
    const line = getLines('caro-kann')[0];
    location.hash = `#/t/${encodeURIComponent(line.id)}/drill`;
    const { container } = render(<App />);

    await fireEvent.click(screen.getByText('Start'));

    const board = container.querySelector('.board-wrap') as HTMLElement;
    expect(board).toBeTruthy();
    const SIZE = 400;
    board.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: SIZE, bottom: SIZE, width: SIZE, height: SIZE, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    board.setPointerCapture = () => {};

    const clientFor = (square: string) => {
      const c = squareCenter(square, line.side);
      return { clientX: (c.x / 8) * SIZE, clientY: (c.y / 8) * SIZE };
    };
    const tap = async (square: string) => {
      const at = clientFor(square);
      await fireEvent.pointerDown(board, at);
      await fireEvent.pointerUp(board, at);
    };

    for (let guard = 0; guard < 40 && !screen.queryByText(/Line complete/); guard++) {
      // let any scheduled opponent move play
      await vi.advanceTimersByTimeAsync(700);
      // the move strip length tells us which ply is expected next
      const played = container.querySelectorAll('.movestrip .mv').length;
      if (played >= line.plies.length) break;
      const next = line.plies[played];
      if (!next.isUserMove) continue;
      await tap(next.from);
      await tap(next.to);
    }

    await vi.advanceTimersByTimeAsync(700);
    expect(screen.queryByText(/Line complete/)).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem('oct:v1:progress') ?? '{}');
    expect(stored[line.id]?.mastered).toBe(true);
    vi.useRealTimers();
  });
});
