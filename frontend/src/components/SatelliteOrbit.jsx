import React, { useMemo } from "react";
import * as THREE from "three";

export function latLonAltToVec3(lat, lon, altKm) {
  const EARTH_RADIUS_KM = 6371;
  const GLOBE_RADIUS = 1;
  const r = GLOBE_RADIUS * (1 + altKm / EARTH_RADIUS_KM);
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

export default function SatelliteOrbit({ path, color = "#4fc3f7" }) {

  const geometry = useMemo(() => {
    if (!path || !path.length) return new THREE.BufferGeometry();
    const points = path.map(
      p => latLonAltToVec3(p.lat, p.lon, p.alt_km)
    );
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [path]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} opacity={0.6} transparent />
    </line>
  );
}

export function CollisionMarker({ event }) {
  const posA = useMemo(() => latLonAltToVec3(event.location_a.lat, event.location_a.lon, event.location_a.alt_km), [event]);
  const posB = useMemo(() => latLonAltToVec3(event.location_b.lat, event.location_b.lon, event.location_b.alt_km), [event]);
  
  const lineGeom = useMemo(() => new THREE.BufferGeometry().setFromPoints([posA, posB]), [posA, posB]);

  return (
    <group>
      <mesh position={posA}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color="#ff3366" />
      </mesh>
      <mesh position={posB}>
        <sphereGeometry args={[0.02, 16, 16]} />
        <meshBasicMaterial color="#ff9800" />
      </mesh>
      <line geometry={lineGeom}>
        <lineBasicMaterial color="#ff3366" transparent opacity={0.8} />
      </line>
    </group>
  );
}