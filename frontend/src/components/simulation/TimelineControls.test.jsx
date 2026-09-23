import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import TimelineControls from './TimelineControls';

const mockTrajectoryPoints = [
  { timestamp: '2026-01-01T00:00:00Z', x: 1, y: 2, z: 3 },
  { timestamp: '2026-01-02T00:00:00Z', x: 4, y: 5, z: 6 },
  { timestamp: '2026-01-03T00:00:00Z', x: 7, y: 8, z: 9 },
  { timestamp: '2026-01-04T00:00:00Z', x: 10, y: 11, z: 12 },
];

describe('TimelineControls Component', () => {
  describe('Rendering', () => {
    it('should render frame counter and current date', () => {
      render(
        <TimelineControls
          trajectoryPoints={mockTrajectoryPoints}
          currentTimeIndex={2}
        />
      );

      expect(screen.getByText('Frame: 2 / 3')).toBeInTheDocument();
      expect(screen.getByText(/Jan/)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onPlayPause when play button is clicked', () => {
      const onPlayPause = vi.fn();
      render(
        <TimelineControls
          trajectoryPoints={mockTrajectoryPoints}
          currentTimeIndex={0}
          onPlayPause={onPlayPause}
        />
      );

      fireEvent.click(screen.getByTitle('Play'));
      expect(onPlayPause).toHaveBeenCalledTimes(1);
    });
  });
});
