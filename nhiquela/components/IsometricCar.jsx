import React from 'react';
import Svg, { Path, G, Ellipse, Polygon } from 'react-native-svg';

export default function IsometricCar({ color = '#3B82F6', size = 60 }) {
  // We use SVG to draw an isometric 3D car.
  // The car is drawn facing right/down (isometric projection).
  
  // To create shading:
  // - Top face is the base color.
  // - Left side face is the base color + black overlay (darker).
  // - Right front face is the base color + white overlay (lighter).

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G transform="translate(10, 20)">
        
        {/* Wheels (Left side and Front) */}
        <Ellipse cx="25" cy="58" rx="6" ry="10" fill="#1a1a1a" transform="rotate(-30 25 58)" />
        <Ellipse cx="55" cy="65" rx="6" ry="10" fill="#1a1a1a" transform="rotate(-30 55 65)" />
        <Ellipse cx="75" cy="50" rx="5" ry="9" fill="#1a1a1a" transform="rotate(-30 75 50)" />

        {/* Shadow under car */}
        <Polygon points="15,62 50,72 80,55 45,45" fill="rgba(0,0,0,0.3)" />

        {/* Body - Left Side */}
        <Polygon points="10,40 50,55 50,65 10,50" fill={color} />
        <Polygon points="10,40 50,55 50,65 10,50" fill="rgba(0,0,0,0.25)" />

        {/* Body - Front */}
        <Polygon points="50,55 80,42 80,50 50,65" fill={color} />
        <Polygon points="50,55 80,42 80,50 50,65" fill="rgba(255,255,255,0.15)" />

        {/* Body - Top/Hood/Trunk */}
        <Polygon points="10,40 25,32 50,42 35,50" fill={color} />
        <Polygon points="50,42 80,30 80,42 50,55" fill={color} />

        {/* Cabin - Left Side */}
        <Polygon points="20,25 45,35 45,45 20,35" fill={color} />
        <Polygon points="20,25 45,35 45,45 20,35" fill="rgba(0,0,0,0.25)" />

        {/* Cabin - Front */}
        <Polygon points="45,35 70,25 70,35 45,45" fill={color} />
        <Polygon points="45,35 70,25 70,35 45,45" fill="rgba(255,255,255,0.15)" />

        {/* Cabin - Top */}
        <Polygon points="20,25 45,15 70,25 45,35" fill={color} />

        {/* Windows */}
        {/* Front Windshield */}
        <Polygon points="47,36 67,28 67,34 47,43" fill="#87CEEB" opacity="0.8" />
        {/* Left Side Window */}
        <Polygon points="23,28 42,35 42,42 23,34" fill="#87CEEB" opacity="0.6" />

        {/* Headlights */}
        <Polygon points="75,44 78,43 78,46 75,48" fill="#FFF" opacity="0.9" />
        <Polygon points="55,52 58,51 58,54 55,56" fill="#FFF" opacity="0.9" />

        {/* Steering Wheel inside window (entrar volante) */}
        <Ellipse cx="55" cy="35" rx="3" ry="5" fill="#333" transform="rotate(-30 55 35)" />

      </G>
    </Svg>
  );
}
