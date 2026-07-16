"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

// 1. Stylized 3D Open Book Component
function StylizedBook() {
  const groupRef = useRef<THREE.Group>(null);
  const prefersReducedMotion = useReducedMotion();

  // Gentle floating animation
  useFrame((state) => {
    if (prefersReducedMotion || !groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = Math.sin(t * 0.5) * 0.1;
    groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.05;
  });

  return (
    <group ref={groupRef}>
      {/* Book Cover - Left side */}
      <group position={[-0.75, 0, 0]} rotation={[0, 0.25, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.4, 2, 0.06]} />
          <meshBasicMaterial color="#141210" />
        </mesh>
        {/* Wireframe Outline */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.4, 2, 0.06)]} />
          <lineBasicMaterial color="#E6A62E" linewidth={1.5} />
        </lineSegments>
      </group>

      {/* Book Cover - Right side */}
      <group position={[0.75, 0, 0]} rotation={[0, -0.25, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.4, 2, 0.06]} />
          <meshBasicMaterial color="#141210" />
        </mesh>
        {/* Wireframe Outline */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(1.4, 2, 0.06)]} />
          <lineBasicMaterial color="#E6A62E" linewidth={1.5} />
        </lineSegments>
      </group>

      {/* Book Pages Block - Left */}
      <group position={[-0.68, 0, 0.04]} rotation={[0, 0.2, 0]}>
        <mesh>
          <boxGeometry args={[1.25, 1.9, 0.04]} />
          <meshBasicMaterial color="#F4EDE2" />
        </mesh>
      </group>

      {/* Book Pages Block - Right */}
      <group position={[0.68, 0, 0.04]} rotation={[0, -0.2, 0]}>
        <mesh>
          <boxGeometry args={[1.25, 1.9, 0.04]} />
          <meshBasicMaterial color="#F4EDE2" />
        </mesh>
      </group>
    </group>
  );
}

// 2. Orbiting "Book Moons" Spheres
interface MoonProps {
  radius: number;
  speed: number;
  color: string;
  tiltX: number;
  tiltZ: number;
  initialAngle: number;
}

function BookMoon({ radius, speed, color, tiltX, tiltZ, initialAngle }: MoonProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const prefersReducedMotion = useReducedMotion();

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // If reduced motion is preferred, freeze spheres in fixed angles
    const elapsed = prefersReducedMotion ? 0 : state.clock.getElapsedTime();
    const angle = elapsed * speed + initialAngle;

    // Base circular orbit coordinates
    let x = Math.cos(angle) * radius;
    let z = Math.sin(angle) * radius;
    let y = 0;

    // Apply tilt rotations to simulate skewed orbits
    const cosX = Math.cos(tiltX);
    const sinX = Math.sin(tiltX);
    const cosZ = Math.cos(tiltZ);
    const sinZ = Math.sin(tiltZ);

    // Coordinate transforms
    const tempY = y * cosX - z * sinX;
    z = y * sinX + z * cosX;
    y = tempY;

    const tempX = x * cosZ - y * sinZ;
    y = x * sinZ + y * cosZ;
    x = tempX;

    meshRef.current.position.set(x, y, z);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// 3. Scroll and Pointer Camera controller
function SceneController({
  scrollProgress,
  pointer,
}: {
  scrollProgress: { current: number };
  pointer: { x: number; y: number };
}) {
  const { camera } = useThree();
  const prefersReducedMotion = useReducedMotion();
  const targetCamPos = useRef(new THREE.Vector3(0, 0, 5));
  const targetCamRot = useRef(new THREE.Euler(0, 0, 0));

  useFrame(() => {
    if (prefersReducedMotion) {
      // Return static camera position
      camera.position.set(0, 0, 5);
      camera.rotation.set(0, 0, 0);
      return;
    }

    // Scroll dolly-in (camera moves from z=5 to z=3.2 as user scrolls down)
    const baseZ = 5 - scrollProgress.current * 1.8;
    const baseRotY = scrollProgress.current * 0.6;
    const baseRotX = scrollProgress.current * 0.2;

    // Mouse parallax offset (smooth lerped)
    const parallaxX = pointer.x * 0.4;
    const parallaxY = pointer.y * 0.3;

    targetCamPos.current.set(parallaxX, parallaxY, baseZ);
    targetCamRot.current.set(baseRotX - parallaxY * 0.1, baseRotY + parallaxX * 0.1, 0);

    // Smooth Lerp transitions
    camera.position.lerp(targetCamPos.current, 0.1);
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetCamRot.current.x, 0.1);
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetCamRot.current.y, 0.1);
  });

  return null;
}

export default function HeroOrbit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useRef(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [inView, setInView] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  // 1. Observe viewport entry to pause render loop when scrolled out
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  // 2. Track pointer position for parallax effect (skip on touch devices)
  useEffect(() => {
    if (prefersReducedMotion) return;

    const isTouchDevice =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;
    
    if (isTouchDevice) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      setPointer({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [prefersReducedMotion]);

  // 3. Bind GSAP ScrollTrigger to capture scroll offset
  useEffect(() => {
    if (prefersReducedMotion || !containerRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: containerRef.current,
      start: "top top",
      end: "bottom top",
      scrub: true,
      onUpdate: (self) => {
        scrollProgress.current = self.progress;
      },
    });

    return () => trigger.kill();
  }, [prefersReducedMotion]);

  // Data for orbiting moon spheres
  const moonsData = [
    { radius: 1.8, speed: 0.8, color: "#F2B84B", tiltX: 0.25, tiltZ: 0.1, initialAngle: 0 },
    { radius: 2.3, speed: 0.5, color: "#E6A62E", tiltX: -0.15, tiltZ: 0.35, initialAngle: Math.PI / 2 },
    { radius: 2.8, speed: 0.3, color: "#C4881B", tiltX: 0.35, tiltZ: -0.15, initialAngle: Math.PI },
    { radius: 3.4, speed: 0.2, color: "#F2B84B", tiltX: -0.05, tiltZ: 0.2, initialAngle: (3 * Math.PI) / 2 },
  ];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[100vh] bg-ink-950 overflow-hidden"
    >
      {/* Three.js Canvas (Only rendered when container in viewport for performance) */}
      {inView ? (
        <Canvas
          gl={{ antialias: true, powerPreference: "high-performance" }}
          dpr={[1, 2]} // Cap DPR at 2
          camera={{ position: [0, 0, 5], fov: 45 }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          <color attach="background" args={["#0B0908"]} />
          <ambientLight intensity={0.2} />
          <pointLight position={[5, 5, 5]} intensity={0.8} color="#F2B84B" />
          
          <StylizedBook />
          
          {moonsData.map((moon, index) => (
            <BookMoon
              key={index}
              radius={moon.radius}
              speed={moon.speed}
              color={moon.color}
              tiltX={moon.tiltX}
              tiltZ={moon.tiltZ}
              initialAngle={moon.initialAngle}
            />
          ))}

          <Stars radius={100} depth={50} count={350} factor={4} saturation={0.5} fade speed={0} />

          <SceneController scrollProgress={scrollProgress} pointer={pointer} />
        </Canvas>
      ) : (
        <div className="absolute inset-0 bg-[#0B0908]" />
      )}
    </div>
  );
}
