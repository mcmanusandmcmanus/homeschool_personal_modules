import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('canvas-confetti', () => jest.fn());
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(async () => ({ exists: () => false })),
  setDoc: jest.fn(async () => {}),
}));

describe('App shell', () => {
  test('renders missions control chrome', () => {
    render(<App />);

    expect(screen.getByText(/Homeschool Missions Control/i)).toBeInTheDocument();
    expect(screen.getByText(/Growth Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Select a badge to begin/i)).toBeInTheDocument();
  });

  test('shows user badges for selection', () => {
    render(<App />);
    expect(screen.getByLabelText(/Select Mom/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Dad/i)).toBeInTheDocument();
  });
});
