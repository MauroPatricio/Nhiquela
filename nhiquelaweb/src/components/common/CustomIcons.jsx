import React from 'react';

/**
 * Modern SVG Steering Wheel Icon for Drivers / Condutores / Frotas
 */
export const SteeringWheelIcon = ({ size = 20, color = 'currentColor', className = '', style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ display: 'inline-block', verticalAlign: '-0.15em', flexShrink: 0, ...style }}
  >
    <circle cx="12" cy="12" r="9.5" strokeWidth="2.2" />
    <circle cx="12" cy="12" r="3" fill={color} fillOpacity="0.15" strokeWidth="2" />
    <line x1="12" y1="2.5" x2="12" y2="9" strokeWidth="2.2" />
    <line x1="4.2" y1="15.2" x2="9.5" y2="13.2" strokeWidth="2.2" />
    <line x1="19.8" y1="15.2" x2="14.5" y2="13.2" strokeWidth="2.2" />
    <circle cx="12" cy="12" r="1.2" fill={color} />
  </svg>
);

/**
 * Driver Person with Steering Wheel Icon (Motorista / Condutor)
 */
export const DriverPersonIcon = ({ size = 20, color = 'currentColor', className = '', style = {} }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ display: 'inline-block', verticalAlign: '-0.15em', flexShrink: 0, ...style }}
  >
    {/* Person Head */}
    <circle cx="12" cy="6" r="3.5" strokeWidth="1.8" />
    {/* Person Shoulders */}
    <path d="M6 14.5c0-2.8 2.7-4.5 6-4.5s6 1.7 6 4.5" strokeWidth="1.8" />
    {/* Steering Wheel in hands */}
    <circle cx="12" cy="17" r="4.5" strokeWidth="2" />
    <circle cx="12" cy="17" r="1.2" fill={color} />
    <line x1="12" y1="12.5" x2="12" y2="15.8" strokeWidth="1.8" />
    <line x1="8" y1="18.2" x2="10.8" y2="17.4" strokeWidth="1.8" />
    <line x1="16" y1="18.2" x2="13.2" y2="17.4" strokeWidth="1.8" />
  </svg>
);
