import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Sphere } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Rotating Earth sphere rendered with a solid material.
 * A texture can be swapped in by replacing the `color` prop with a
 * `map={useTexture('/earth.jpg')}` attribute once a texture asset is present.
 */
function Earth() {
  const meshRef = useRef(null);

  useFrame((_state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]}>
      <meshPhongMaterial color="#1a6b9a" emissive="#0a2e3f" specular="#4fc3f7" shininess={30} />
    </Sphere>
  );
}

/**
 * Atmospheric glow effect around the Earth.
 */
function Atmosphere() {
  return (
    <Sphere args={[1.02, 64, 64]}>
      <meshPhongMaterial
        color="#4fc3f7"
        transparent
        opacity={0.08}
        side={THREE.BackSide}
      />
    </Sphere>
  );
}

/**
 * Globe component — wraps everything in a Three.js Canvas.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children  – Additional Three.js scene objects
 *                                           (e.g. SatelliteLayer) rendered inside the canvas.
 */
export default function Globe({ children }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 45 }}
      style={{ width: '100%', height: '100%', background: '#000008' }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 5, 5]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-5, -5, -5]} intensity={0.3} color="#4fc3f7" />

      {/* Background stars */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Earth + atmosphere */}
      <Earth />
      <Atmosphere />

      {/* Satellite orbits / markers passed as children */}
      {children}

      {/* User interaction */}
      <OrbitControls enablePan={false} minDistance={1.5} maxDistance={8} />
    </Canvas>
  );
}
