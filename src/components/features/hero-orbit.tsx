"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Billboard } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

gsap.registerPlugin(ScrollTrigger);

const COVER_BOOKS = [
  { title: "THE HOBBIT", author: "J.R.R. Tolkien", color1: "#064E3B", color2: "#0A3C27" },
  { title: "NEUROMANCER", author: "William Gibson", color1: "#059669", color2: "#064E3B" },
  { title: "1984", author: "George Orwell", color1: "#10B981", color2: "#059669" },
  { title: "DUNE", author: "Frank Herbert", color1: "#047857", color2: "#0D1410" },
  { title: "FOUNDATION", author: "Isaac Asimov", color1: "#34D399", color2: "#059669" },
  { title: "FRANKENSTEIN", author: "Mary Shelley", color1: "#0A3C27", color2: "#064E3B" },
  { title: "GATSBY", author: "F. Scott Fitzgerald", color1: "#E6A62E", color2: "#0D1410" },
  { title: "SNOW CRASH", author: "Neal Stephenson", color1: "#059669", color2: "#0A3C27" },
];

// ── Canvas texture generators ──────────────────────────────────────────────
function createBookCoverCanvas(title: string, author: string, color1: string, color2: string) {
  if (typeof window === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 384);
  grad.addColorStop(0, color1);
  grad.addColorStop(1, color2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 384);

  ctx.strokeStyle = "#ffffff44";
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 16, 224, 352);
  ctx.strokeStyle = "#ffffff11";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 208, 336);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 20px serif";
  const words = title.split(" ");
  if (words.length === 1) {
    ctx.fillText(title, 128, 120);
  } else {
    ctx.fillText(words.slice(0, Math.ceil(words.length / 2)).join(" "), 128, 100);
    ctx.fillText(words.slice(Math.ceil(words.length / 2)).join(" "), 128, 130);
  }

  ctx.font = "italic 13px sans-serif";
  ctx.fillStyle = "#ffffffaa";
  ctx.fillText(`by ${author}`, 128, 200);

  ctx.fillStyle = "#ffffffcc";
  ctx.beginPath();
  ctx.arc(128, 280, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color1;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(128, 280, 9, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

function createGlowTexture(hex: string) {
  if (typeof window === "undefined") return null;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, hex);
  grad.addColorStop(0.4, hex);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

// ── Glowing portal core ─────────────────────────────────────────────────────
function PortalCore({ isLight }: { isLight: boolean }) {
  const coreRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const prefersReducedMotion = useReducedMotion();

  const glowTex = useMemo(() => {
    const c = createGlowTexture(isLight ? "rgba(4,120,87,0.9)" : "rgba(16,185,129,0.9)");
    return c ? new THREE.CanvasTexture(c) : null;
  }, [isLight]);

  useFrame((state) => {
    if (prefersReducedMotion) return;
    const t = state.clock.getElapsedTime();
    if (coreRef.current) coreRef.current.rotation.z = t * 0.15;
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.2) * 0.15;
      ringRef.current.rotation.z = t * 0.25;
    }
  });

  return (
    <group ref={coreRef}>
      {/* Layered soft glow sprites to fake bloom */}
      {glowTex &&
        [1, 1.6, 2.4, 3.4].map((scale, i) => (
          <sprite key={i} scale={[scale * 1.4, scale * 1.4, 1]}>
            <spriteMaterial
              map={glowTex}
              transparent
              opacity={0.22 - i * 0.04}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        ))}

      {/* Wireframe torus "portal ring" */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.15, 0.02, 16, 100]} />
        <meshBasicMaterial color={isLight ? "#047857" : "#34D399"} transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.95, 0.008, 16, 100]} />
        <meshBasicMaterial color={isLight ? "#059669" : "#10B981"} transparent opacity={0.5} />
      </mesh>

      <pointLight color={isLight ? "#059669" : "#10B981"} intensity={2.2} distance={8} />
    </group>
  );
}

// ── Orbiting book cover ──────────────────────────────────────────────────────
interface OrbitBookProps {
  radius: number;
  speed: number;
  tiltX: number;
  tiltZ: number;
  initialAngle: number;
  book: (typeof COVER_BOOKS)[number];
}

function OrbitingBook({ radius, speed, tiltX, tiltZ, initialAngle, book }: OrbitBookProps) {
  const groupRef = useRef<THREE.Group>(null);
  const prefersReducedMotion = useReducedMotion();
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const canvas = createBookCoverCanvas(book.title, book.author, book.color1, book.color2);
    if (canvas) {
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    }
  }, [book]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const elapsed = prefersReducedMotion ? 0 : state.clock.getElapsedTime();
    const angle = elapsed * speed + initialAngle;

    let x = Math.cos(angle) * radius;
    let z = Math.sin(angle) * radius;
    let y = Math.sin(elapsed * 0.6 + initialAngle) * 0.08;

    const cosX = Math.cos(tiltX);
    const sinX = Math.sin(tiltX);
    const cosZ = Math.cos(tiltZ);
    const sinZ = Math.sin(tiltZ);

    const tempY = y * cosX - z * sinX;
    z = y * sinX + z * cosX;
    y = tempY;

    const tempX = x * cosZ - y * sinZ;
    y = x * sinZ + y * cosZ;
    x = tempX;

    groupRef.current.position.set(x, y, z);
  });

  return (
    <group ref={groupRef}>
      <Billboard>
        {/* Soft halo behind the cover */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[0.62, 0.9]} />
          <meshBasicMaterial
            color={book.color1}
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh>
          <planeGeometry args={[0.42, 0.63]} />
          {tex ? (
            <meshBasicMaterial map={tex} toneMapped={false} />
          ) : (
            <meshBasicMaterial color={book.color1} />
          )}
        </mesh>
      </Billboard>
    </group>
  );
}

// ── Ember particles ──────────────────────────────────────────────────────────
function Embers({ isLight }: { isLight: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const prefersReducedMotion = useReducedMotion();
  const count = 220;

  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const radius = 1.2 + Math.random() * 3.2;
      const angle = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 3;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
      spd[i] = 0.05 + Math.random() * 0.12;
    }
    return [pos, spd];
  }, []);

  useFrame(() => {
    if (prefersReducedMotion || !pointsRef.current) return;
    const arr = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * 0.016;
      if (arr[i * 3 + 1] > 1.8) arr[i * 3 + 1] = -1.8;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.035}
        color={isLight ? "#047857" : "#6EE7B7"}
        transparent
        opacity={0.55}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

// ── Camera / scroll controller ───────────────────────────────────────────────
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
      camera.position.set(0, 0, 5);
      camera.rotation.set(0, 0, 0);
      return;
    }

    const baseZ = 5 - scrollProgress.current * 2.6;
    const baseRotY = scrollProgress.current * 0.5;
    const baseRotX = scrollProgress.current * 0.15;

    const parallaxX = pointer.x * 0.35;
    const parallaxY = pointer.y * 0.25;

    targetCamPos.current.set(parallaxX, parallaxY, baseZ);
    targetCamRot.current.set(baseRotX - parallaxY * 0.1, baseRotY + parallaxX * 0.1, 0);

    camera.position.lerp(targetCamPos.current, 0.08);
    camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, targetCamRot.current.x, 0.08);
    camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, targetCamRot.current.y, 0.08);
  });

  return null;
}

export default function HeroOrbit() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollProgress = useRef(0);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [inView, setInView] = useState(true);
  const [isLight, setIsLight] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains("light"));
    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.classList.contains("light"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.05,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      setPointer({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [prefersReducedMotion]);

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

  const orbitBooks = [
    { radius: 1.9, speed: 0.35, tiltX: 0.3, tiltZ: 0.1, initialAngle: 0 },
    { radius: 2.4, speed: 0.28, tiltX: -0.2, tiltZ: 0.4, initialAngle: Math.PI / 4 },
    { radius: 2.9, speed: 0.2, tiltX: 0.4, tiltZ: -0.15, initialAngle: Math.PI / 2 },
    { radius: 3.4, speed: 0.16, tiltX: -0.1, tiltZ: 0.25, initialAngle: (3 * Math.PI) / 4 },
    { radius: 2.1, speed: -0.24, tiltX: 0.15, tiltZ: -0.3, initialAngle: Math.PI },
    { radius: 2.7, speed: -0.19, tiltX: -0.3, tiltZ: 0.05, initialAngle: (5 * Math.PI) / 4 },
    { radius: 3.2, speed: 0.13, tiltX: 0.05, tiltZ: -0.35, initialAngle: (3 * Math.PI) / 2 },
    { radius: 3.7, speed: -0.1, tiltX: -0.25, tiltZ: 0.2, initialAngle: (7 * Math.PI) / 4 },
  ];

  return (
    <div ref={containerRef} className="relative w-full h-[100vh] bg-ink-950 overflow-hidden">
      {inView ? (
        <Canvas
          gl={{ antialias: true, powerPreference: "high-performance" }}
          dpr={[1, 2]}
          camera={{ position: [0, 0, 5], fov: 45 }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          <color attach="background" args={[isLight ? "#F4FAF7" : "#060B08"]} />
          <ambientLight intensity={isLight ? 0.6 : 0.15} />

          <PortalCore isLight={isLight} />
          <Embers isLight={isLight} />

          {orbitBooks.map((cfg, i) => (
            <OrbitingBook key={i} {...cfg} book={COVER_BOOKS[i % COVER_BOOKS.length]} />
          ))}

          {!isLight && (
            <Stars radius={100} depth={50} count={280} factor={4} saturation={0.5} fade speed={0} />
          )}

          <SceneController scrollProgress={scrollProgress} pointer={pointer} />
        </Canvas>
      ) : (
        <div className={`absolute inset-0 transition-colors duration-200 ${isLight ? "bg-[#F4FAF7]" : "bg-[#060B08]"}`} />
      )}
    </div>
  );
}
