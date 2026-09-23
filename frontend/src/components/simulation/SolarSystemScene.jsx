import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Horizons vectors are stored in kilometres, ecliptic J2000, with UTC timestamps.
const AU_IN_KM = 149597870.7;
const SCALE = 80 / AU_IN_KM;
const toScenePosition = (point) => new THREE.Vector3((Number(point?.x) || 0) * SCALE, (Number(point?.z) || 0) * SCALE, -(Number(point?.y) || 0) * SCALE);

function Sun() { const ref = useRef(); useFrame(() => { if (ref.current) ref.current.rotation.y += 0.002; }); return <mesh ref={ref}><sphereGeometry args={[4, 32, 32]} /><meshBasicMaterial color="#ffbf00" /><pointLight intensity={2} distance={300} /></mesh>; }
function Asteroid({ position, onSelect }) { const ref = useRef(); useFrame(() => { if (ref.current) ref.current.rotation.y += 0.015; }); return <mesh ref={ref} position={position} onClick={onSelect} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = 'auto'; }}><dodecahedronGeometry args={[1.2, 1]} /><meshStandardMaterial color="#a7adb5" roughness={0.85} /></mesh>; }
function SceneContents({ points, currentTimeIndex, onAsteroidSelect }) {
  const current = toScenePosition(points[currentTimeIndex]);
  const trail = useMemo(() => points.slice(0, currentTimeIndex + 1).flatMap((point) => { const value = toScenePosition(point); return [value.x, value.y, value.z]; }), [points, currentTimeIndex]);
  const earthAngle = points.length ? (currentTimeIndex / points.length) * Math.PI * 2 : 0;
  return <><Stars radius={300} depth={60} count={2500} factor={3} fade /><ambientLight intensity={0.35} /><directionalLight position={[50, 60, 30]} intensity={1} /><Sun /><mesh position={[80 * Math.cos(earthAngle), 0, 80 * Math.sin(earthAngle)]}><sphereGeometry args={[1.8, 24, 24]} /><meshStandardMaterial color="#2f81f7" /></mesh>{trail.length >= 6 && <line><bufferGeometry><bufferAttribute attach="attributes-position" array={new Float32Array(trail)} itemSize={3} /></bufferGeometry><lineBasicMaterial color="#00ffff" /></line>}{points.length > 0 && <Asteroid position={current} onSelect={onAsteroidSelect} />}<OrbitControls minDistance={15} maxDistance={400} /></>;
}
export default function SolarSystemScene({ trajectoryPoints = [], currentTimeIndex = 0, onAsteroidSelect }) { const index = Math.min(Math.max(0, currentTimeIndex), Math.max(0, trajectoryPoints.length - 1)); return <div className="simulation-scene"><Canvas camera={{ position: [0, 75, 145], fov: 50 }}><SceneContents points={trajectoryPoints} currentTimeIndex={index} onAsteroidSelect={onAsteroidSelect} /></Canvas></div>; }
