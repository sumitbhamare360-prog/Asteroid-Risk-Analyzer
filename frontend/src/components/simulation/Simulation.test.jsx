import React from 'react';
import { cleanup, render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { vi } from 'vitest';
import Simulation from './Simulation';

// Mock the API module
vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock child components to avoid WebGL/R3F dependencies in jsdom
vi.mock('./SolarSystemScene', () => ({
  default: ({ trajectoryPoints, asteroidName }) => (
    <div data-testid="solar-system-scene">
      <span>Scene for: {asteroidName}</span>
      <span>Points: {trajectoryPoints?.length || 0}</span>
    </div>
  ),
}));

vi.mock('./TimelineControls', () => ({
  default: ({ trajectoryPoints, currentTimeIndex, onSeek, onPlayPause, onReset, onSpeedChange, playing, speed }) => (
    <div data-testid="timeline-controls">
      <button onClick={onPlayPause} data-testid="mock-play-pause">{playing ? 'Pause' : 'Play'}</button>
      <button onClick={onReset} data-testid="mock-reset">Reset</button>
      <select
        value={speed}
        onChange={(e) => onSpeedChange?.(parseInt(e.target.value, 10))}
        data-testid="mock-speed"
      >
        <option value={1}>1x</option>
        <option value={10}>10x</option>
        <option value={100}>100x</option>
      </select>
      <input
        type="range"
        min={0}
        max={Math.max(0, (trajectoryPoints?.length || 0) - 1)}
        value={currentTimeIndex}
        onChange={(e) => onSeek?.(parseInt(e.target.value, 10))}
        data-testid="mock-seek"
      />
    </div>
  ),
}));

vi.mock('./AsteroidDetailsPanel', () => ({
  default: ({ asteroid }) => (
    <div data-testid="asteroid-details-panel">
      <span>Details for: {asteroid?.name}</span>
    </div>
  ),
}));

import api from '../../api/axios';

const mockAsteroids = [
  { id: '1', name: 'Asteroid Alpha', custom_risk_score: '5.2', is_hazardous: true },
  { id: '2', name: 'Asteroid Beta', custom_risk_score: '2.1', is_hazardous: false },
  { id: '3', name: 'Asteroid Gamma', custom_risk_score: '7.8', is_hazardous: true },
];

const mockSimulationData = {
  asteroid: { id: '1', name: 'Asteroid Alpha', custom_risk_score: '5.2', is_hazardous: true },
  trajectory: {
    source: 'JPL_HORIZONS',
    points: [
      { timestamp: '2026-01-01T00:00:00Z', x: 1, y: 2, z: 3 },
      { timestamp: '2026-01-02T00:00:00Z', x: 4, y: 5, z: 6 },
    ],
    cached: false,
  },
  impact_risk: {
    source: 'JPL_SENTRY',
    has_assessment: true,
    impact_probability: 0.0001,
  },
  orbital_elements: { source: 'JPL_SBDB', semiMajorAxis: 2.5 },
};

describe('Simulation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  describe('Rendering', () => {
    it('should render loading state while fetching asteroids', () => {
      api.get.mockReturnValue(new Promise(() => {}));
      const { container } = render(<Simulation />);
      expect(container.querySelector('.loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Simulation')).toBeInTheDocument();
    });

    it('should render asteroid selector dropdown after asteroids load', async () => {
      api.get.mockResolvedValue({ data: mockAsteroids });

      render(<Simulation />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const options = within(screen.getByLabelText('Select asteroid')).getAllByRole('option');
      expect(options).toHaveLength(4); // placeholder + 3 asteroids
      expect(screen.getByText('Asteroid Alpha (1) - Risk: 5.2')).toBeInTheDocument();
      expect(screen.getByText('Asteroid Beta (2) - Risk: 2.1')).toBeInTheDocument();
      expect(screen.getByText('Asteroid Gamma (3) - Risk: 7.8')).toBeInTheDocument();
    });

    it('should auto-select the first asteroid and fetch simulation data', async () => {
      api.get
        .mockResolvedValueOnce({ data: mockAsteroids })
        .mockResolvedValueOnce({ data: mockSimulationData });

      render(<Simulation />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });

      expect(api.get).toHaveBeenCalledWith('/asteroids');
      expect(api.get).toHaveBeenCalledWith('/asteroids/1/simulation');

      await waitFor(() => {
        expect(screen.getByTestId('solar-system-scene')).toBeInTheDocument();
        expect(screen.getByTestId('timeline-controls')).toBeInTheDocument();
        expect(screen.getByTestId('asteroid-details-panel')).toBeInTheDocument();
      });
    });

    it('should display error message when asteroid fetch fails', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<Simulation />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch asteroid list.')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should display error when simulation data fetch fails', async () => {
      api.get
        .mockResolvedValueOnce({ data: mockAsteroids })
        .mockRejectedValueOnce(new Error('JPL API unavailable'));

      render(<Simulation />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch simulation data/)).toBeInTheDocument();
      });
    });
  });

  describe('Interactions', () => {
    it('should fetch new simulation data when a different asteroid is selected', async () => {
      api.get
        .mockResolvedValueOnce({ data: mockAsteroids })
        .mockResolvedValueOnce({ data: mockSimulationData });

      render(<Simulation />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/asteroids/1/simulation');
      });

      api.get.mockResolvedValueOnce({
        data: { ...mockSimulationData, asteroid: { ...mockSimulationData.asteroid, id: '2', name: 'Asteroid Beta' } },
      });

      fireEvent.change(screen.getByLabelText('Select asteroid'), { target: { value: '2' } });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/asteroids/2/simulation');
      });
    });

    it('should show first asteroid as auto-selected', async () => {
      api.get.mockResolvedValue({ data: mockAsteroids });

      render(<Simulation />);

      await waitFor(() => {
        expect(screen.getByLabelText('Select asteroid').value).toBe('1');
      });
    });

    it('should not fetch simulation when select shows placeholder', async () => {
      api.get
        .mockResolvedValueOnce({ data: mockAsteroids })
        .mockResolvedValueOnce({ data: mockSimulationData });

      render(<Simulation />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });

      api.get.mockClear();
      fireEvent.change(screen.getByLabelText('Select asteroid'), { target: { value: '' } });

      await waitFor(() => {
        expect(api.get).not.toHaveBeenCalled();
      });
    });

    it('should display no-data message when selected asteroid has no simulation data', async () => {
      api.get
        .mockResolvedValueOnce({ data: mockAsteroids })
        .mockResolvedValueOnce({
          data: {
            asteroid: { id: '2', name: 'Asteroid Beta', custom_risk_score: '2.1', is_hazardous: false },
            trajectory: null,
            impact_risk: null,
            orbital_elements: null,
          },
        });

      render(<Simulation />);

      await waitFor(() => expect(screen.getByTestId('solar-system-scene')).toBeInTheDocument());
    });

  describe('Additional Rendering Tests', () => {
    it('should display disclaimer footer', async () => {
      api.get.mockResolvedValue({ data: mockAsteroids });

      render(<Simulation />);

      await waitFor(() => {
        expect(screen.getByText(/AstraGuard visualizes publicly available NASA\/JPL data/)).toBeInTheDocument();
      });
    });

    it('should render empty state when no asteroids are available', async () => {
      api.get.mockResolvedValue({ data: [] });

      render(<Simulation />);

      await waitFor(() => {
        const select = screen.getByLabelText('Select asteroid');
        expect(select).toBeInTheDocument();
        expect(select.options.length).toBe(1); // only placeholder
        expect(select.options[0].text).toBe('-- Choose an asteroid --');
      });
    });

    it('should show simulation header with title', async () => {
      api.get.mockResolvedValue({ data: mockAsteroids });

      render(<Simulation />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Simulation' })).toBeInTheDocument();
      });
    });
  });

  describe('Additional Interaction Tests', () => {
    it('should reset playback state when selecting a new asteroid', async () => {
      api.get
        .mockResolvedValueOnce({ data: mockAsteroids })
        .mockResolvedValueOnce({ data: mockSimulationData });

      render(<Simulation />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/asteroids/1/simulation');
      });

      // Change to a different asteroid
      api.get.mockResolvedValueOnce({
        data: { ...mockSimulationData, asteroid: { ...mockSimulationData.asteroid, id: '2' } },
      });

      fireEvent.change(screen.getByLabelText('Select asteroid'), { target: { value: '2' } });

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/asteroids/2/simulation');
      });
    });

    it('should handle selecting asteroid with missing custom_risk_score', async () => {
      const asteroidsWithMissingRisk = [
        { id: '1', name: 'Asteroid Alpha', is_hazardous: true },
        { id: '2', name: 'Asteroid Beta', custom_risk_score: '2.1', is_hazardous: false },
      ];

      api.get.mockResolvedValue({ data: asteroidsWithMissingRisk });

      render(<Simulation />);

      await waitFor(() => {
        const options = within(screen.getByLabelText('Select asteroid')).getAllByRole('option');
        expect(options).toHaveLength(3); // placeholder + 2 asteroids
        expect(screen.getByText('Asteroid Alpha (1) - Risk:')).toBeInTheDocument();
      });
    });

    it('should display error boundary styling when error occurs', async () => {
      api.get.mockRejectedValue(new Error('Connection failed'));

      render(<Simulation />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch asteroid list.')).toBeInTheDocument();
      });

      expect(screen.getByText('Failed to fetch asteroid list.')).toHaveClass('error-boundary');
    });
  });

  describe('Play/Pause and Scene Tests', () => {
    it('should have TimelineControls with correct props when data loads', async () => {
      api.get
        .mockResolvedValueOnce({ data: mockAsteroids })
        .mockResolvedValueOnce({ data: mockSimulationData });

      render(<Simulation />);

      await waitFor(() => {
        const timeline = screen.getByTestId('timeline-controls');
        expect(timeline).toBeInTheDocument();
      });
    });

    it('should show SolarSystemScene with trajectory points', async () => {
      api.get
        .mockResolvedValueOnce({ data: mockAsteroids })
        .mockResolvedValueOnce({ data: mockSimulationData });

      render(<Simulation />);

      await waitFor(() => {
        const scene = screen.getByTestId('solar-system-scene');
        expect(scene).toBeInTheDocument();
        expect(screen.getByText('Points: 2')).toBeInTheDocument();
      });
    });

    it('should not show SolarSystemScene when no trajectory data', async () => {
      api.get
        .mockResolvedValueOnce({ data: mockAsteroids })
        .mockResolvedValueOnce({
          data: {
            asteroid: { id: '1', name: 'Asteroid Alpha' },
            trajectory: null,
          },
        });

      render(<Simulation />);

      await waitFor(() => {
        expect(screen.queryByTestId('solar-system-scene')).not.toBeInTheDocument();
      });
    });

    it('should display no-data message when selected asteroid has no simulation data', async () => {
      api.get
        .mockResolvedValueOnce({ data: mockAsteroids })
        .mockResolvedValueOnce({
          data: {
            asteroid: { id: '2', name: 'Asteroid Beta', custom_risk_score: '2.1', is_hazardous: false },
            trajectory: null,
            impact_risk: null,
            orbital_elements: null,
          },
        });

      render(<Simulation />);

      await waitFor(() => {
        const scene = screen.queryByTestId('solar-system-scene');
        expect(scene).not.toBeInTheDocument();
      });
      expect(screen.getByText(/No simulation data available for this asteroid/)).toBeInTheDocument();
    });
});
  });
});
