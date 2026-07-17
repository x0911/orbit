"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import { HelpCircle, X } from "lucide-react";
import BookHandUI from "./library-3d-ui";
import { useCoverTexture } from "@/lib/cover-texture";

export interface LibraryBook {
  shelfId: string;
  bookId: string;
  title: string;
  author: string;
  coverUrl: string | null;
  genre: string;
  pageCount: number;
  currentPage: number;
  status: "want_to_read" | "reading" | "finished";
  rating: number | null;
}

interface Library3DExperienceProps {
  books: LibraryBook[];
  onExit: () => void;
}

const ROOM_WIDTH = 24;
const ROOM_DEPTH = 24;
const ROOM_HEIGHT = 7;
const WALL_MARGIN = 1.1;
const EYE_HEIGHT = 1.65;
const REACH_DISTANCE = 3.4;
const MOVE_SPEED = 4.2;
const POINTER_LOCK_COOLDOWN_MS = 1400;

// Book "cover" plaque dimensions — roughly a paperback's 2:3 aspect ratio.
const BOOK_WIDTH = 0.42;
const BOOK_HEIGHT = 0.62;
const BOOK_DEPTH = 0.05;
const ROW_HEIGHT = 0.86;

// ── Fallback texture (used only when a book has no cover image, or it fails to load) ─
function makeFallbackCoverTexture(
  title: string,
  author: string,
  colorHex: string,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const grad = ctx.createLinearGradient(0, 0, 0, 384);
  grad.addColorStop(0, colorHex);
  grad.addColorStop(1, "#0D1410");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 384);

  ctx.strokeStyle = "#ffffff33";
  ctx.lineWidth = 5;
  ctx.strokeRect(14, 14, 228, 356);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 22px serif";
  const words = title.split(" ");
  if (words.length <= 2) {
    ctx.fillText(title.toUpperCase(), 128, 150);
  } else {
    const mid = Math.ceil(words.length / 2);
    ctx.fillText(words.slice(0, mid).join(" ").toUpperCase(), 128, 130);
    ctx.fillText(words.slice(mid).join(" ").toUpperCase(), 128, 165);
  }

  ctx.font = "italic 14px sans-serif";
  ctx.fillStyle = "#ffffffb0";
  ctx.fillText(`by ${author}`, 128, 220);

  ctx.fillStyle = "#ffffffcc";
  ctx.beginPath();
  ctx.arc(128, 300, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(128, 300, 10, 0, Math.PI * 2);
  ctx.stroke();

  return canvas;
}

function colorForGenre(genre: string) {
  const palette = [
    "#064E3B",
    "#059669",
    "#10B981",
    "#047857",
    "#0A3C27",
    "#34D399",
  ];
  let hash = 0;
  for (let i = 0; i < genre.length; i++)
    hash = genre.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

/** Cover texture for a book mesh — real cover art if available, else a generated fallback. */
function useBookCoverTexture(
  book: Pick<LibraryBook, "coverUrl" | "title" | "author" | "genre">,
) {
  const realTexture = useCoverTexture(book.coverUrl);
  const fallbackTexture = useMemo(() => {
    const canvas = makeFallbackCoverTexture(
      book.title,
      book.author,
      colorForGenre(book.genre),
    );
    if (!canvas) return null;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [book.title, book.author, book.genre]);

  return realTexture || fallbackTexture;
}

// ── Room shell (floor, walls, ceiling) ───────────────────────────────────────
function RoomShell() {
  const floorTex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#12160f";
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = "#1c2318";
    ctx.lineWidth = 3;
    for (let i = 0; i <= 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  }, []);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial
          map={floorTex || undefined}
          color={floorTex ? undefined : "#12160f"}
          roughness={0.9}
        />
      </mesh>
      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT, 0]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#0a0f0b" roughness={1} />
      </mesh>
      {/* Walls */}
      <mesh position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#161c14" roughness={0.95} />
      </mesh>
      <mesh
        position={[0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[ROOM_WIDTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#161c14" roughness={0.95} />
      </mesh>
      <mesh
        position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#161c14" roughness={0.95} />
      </mesh>
      <mesh
        position={[ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <planeGeometry args={[ROOM_DEPTH, ROOM_HEIGHT]} />
        <meshStandardMaterial color="#161c14" roughness={0.95} />
      </mesh>

      {/* Warm hanging lamps down the center aisle */}
      {[-8, -2.5, 2.5, 8].map((z, i) => (
        <group key={i} position={[0, ROOM_HEIGHT - 0.4, z]}>
          <mesh>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshStandardMaterial
              color="#E6A62E"
              emissive="#E6A62E"
              emissiveIntensity={1.8}
            />
          </mesh>
          <pointLight color="#E6A62E" intensity={1.4} distance={9} decay={2} />
        </group>
      ))}
    </group>
  );
}

// ── A single shelf module (wooden frame with rows of books) ─────────────────
// Slots only ever store a stable shelfId reference (assigned once); the live
// book data (status, progress, rating) is looked up separately each render so
// that updating a book never reshuffles the shelf layout.
interface ShelfSlot {
  shelfId: string | null;
  decorativeColor: string;
}

function ShelfModule({
  position,
  rotationY,
  slots,
  booksById,
  registerBookMesh,
  hiddenShelfIds,
}: {
  position: [number, number, number];
  rotationY: number;
  slots: ShelfSlot[][]; // rows x columns
  booksById: Map<string, LibraryBook>;
  registerBookMesh: (
    mesh: THREE.Object3D,
    book: LibraryBook,
  ) => (() => void) | void;
  hiddenShelfIds: Set<string>;
}) {
  const rows = slots.length;
  const cols = slots[0]?.length || 0;
  const shelfWidth = cols * BOOK_WIDTH;
  const shelfHeight = rows * ROW_HEIGHT;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Wooden frame back panel */}
      <mesh position={[0, shelfHeight / 2, -0.28]}>
        <boxGeometry args={[shelfWidth + 0.3, shelfHeight + 0.3, 0.08]} />
        <meshStandardMaterial color="#2b1d10" roughness={0.8} />
      </mesh>
      {/* Shelf boards */}
      {Array.from({ length: rows + 1 }).map((_, r) => (
        <mesh key={r} position={[0, r * ROW_HEIGHT, -0.05]}>
          <boxGeometry args={[shelfWidth + 0.3, 0.06, 0.5]} />
          <meshStandardMaterial color="#4a3218" roughness={0.7} />
        </mesh>
      ))}
      {/* Side posts */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[(side * (shelfWidth + 0.3)) / 2, shelfHeight / 2, -0.05]}
        >
          <boxGeometry args={[0.08, shelfHeight + 0.06, 0.5]} />
          <meshStandardMaterial color="#4a3218" roughness={0.7} />
        </mesh>
      ))}

      {/* Books */}
      {slots.map((rowSlots, r) =>
        rowSlots.map((slot, c) => {
          const x = -shelfWidth / 2 + BOOK_WIDTH / 2 + c * BOOK_WIDTH;
          const y = r * ROW_HEIGHT + BOOK_HEIGHT / 2 + 0.06;
          const key = `${r}-${c}`;

          if (!slot.shelfId) {
            // Decorative, non-interactive book
            return (
              <mesh key={key} position={[x, y, 0]}>
                <boxGeometry
                  args={[BOOK_WIDTH * 0.9, BOOK_HEIGHT, BOOK_DEPTH]}
                />
                <meshStandardMaterial
                  color={slot.decorativeColor}
                  roughness={0.6}
                />
              </mesh>
            );
          }

          if (hiddenShelfIds.has(slot.shelfId)) {
            // Currently held by the player — leave an empty gap
            return null;
          }

          const liveBook = booksById.get(slot.shelfId);
          if (!liveBook) return null;

          return (
            <InteractiveBook
              key={key}
              position={[x, y, 0]}
              book={liveBook}
              registerBookMesh={registerBookMesh}
            />
          );
        }),
      )}
    </group>
  );
}

function InteractiveBook({
  position,
  book,
  registerBookMesh,
}: {
  position: [number, number, number];
  book: LibraryBook;
  registerBookMesh: (
    mesh: THREE.Object3D,
    book: LibraryBook,
  ) => (() => void) | void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useBookCoverTexture(book);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.userData.isBook = true;
    mesh.userData.interactive = true;
    mesh.userData.shelfId = book.shelfId;
    const unregister = registerBookMesh(mesh, book);
    return () => unregister?.();
  }, [book, registerBookMesh]);

  const statusGlow =
    book.status === "reading"
      ? "#E6A62E"
      : book.status === "finished"
        ? "#10B981"
        : "#6B7280";

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <boxGeometry args={[BOOK_WIDTH * 0.92, BOOK_HEIGHT, BOOK_DEPTH]} />
        <meshStandardMaterial
          color={texture ? "#ffffff" : colorForGenre(book.genre)}
          roughness={0.55}
        />
      </mesh>
      {/* Front cover face — the book's actual cover art, facing outward from the shelf */}
      {texture && (
        <mesh position={[0, 0, BOOK_DEPTH / 2 + 0.001]}>
          <planeGeometry args={[BOOK_WIDTH * 0.92, BOOK_HEIGHT]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
      {/* Small status indicator light */}
      <mesh position={[0, BOOK_HEIGHT / 2 + 0.05, 0]}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <meshStandardMaterial
          color={statusGlow}
          emissive={statusGlow}
          emissiveIntensity={1.2}
        />
      </mesh>
    </group>
  );
}

// ── Held book, attached to the camera ────────────────────────────────────────
function HeldBookView({ book }: { book: LibraryBook | null }) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const texture = useBookCoverTexture(
    book || { coverUrl: null, title: "", author: "", genre: "" },
  );

  useFrame((state) => {
    if (!groupRef.current || !book) return;
    const t = state.clock.getElapsedTime();
    const offset = new THREE.Vector3(0.42, -0.32, -0.75);
    offset.y += Math.sin(t * 1.6) * 0.012;
    const worldOffset = offset.clone().applyQuaternion(camera.quaternion);
    groupRef.current.position.copy(camera.position).add(worldOffset);
    groupRef.current.quaternion.copy(camera.quaternion);
    groupRef.current.rotateY(-0.35);
    groupRef.current.rotateX(0.12);
  });

  if (!book) return null;

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.34, 0.5, BOOK_DEPTH]} />
        <meshStandardMaterial
          color={colorForGenre(book.genre)}
          roughness={0.5}
        />
      </mesh>
      {texture && (
        <mesh position={[0, 0, BOOK_DEPTH / 2 + 0.001]}>
          <planeGeometry args={[0.34, 0.5]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

// ── Player rig: handles movement, look, and raycast interaction ─────────────
interface PlayerRigProps {
  isTouch: boolean;
  bookMeshesRef: React.MutableRefObject<Map<THREE.Object3D, LibraryBook>>;
  onHoverChange: (book: LibraryBook | null) => void;
  interactSignal: number;
  onInteract: (book: LibraryBook) => void;
  moveInputRef: React.MutableRefObject<{ x: number; y: number }>;
  lookDeltaRef: React.MutableRefObject<{ x: number; y: number }>;
  heldBookActive: boolean;
}

function PlayerRig({
  isTouch,
  bookMeshesRef,
  onHoverChange,
  interactSignal,
  onInteract,
  moveInputRef,
  lookDeltaRef,
  heldBookActive,
}: PlayerRigProps) {
  const { camera } = useThree();
  const keysRef = useRef<Record<string, boolean>>({});
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const hoveredRef = useRef<LibraryBook | null>(null);
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const walkCycle = useRef(0);
  const lastInteractSignal = useRef(interactSignal);

  useEffect(() => {
    camera.position.set(0, EYE_HEIGHT, ROOM_DEPTH / 2 - 2.5);
    yawRef.current = Math.PI;
    camera.rotation.order = "YXZ";
    camera.rotation.set(0, yawRef.current, 0);
  }, [camera]);

  useEffect(() => {
    if (isTouch) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isTouch]);

  useFrame((state, delta) => {
    // ── Mobile look: apply accumulated drag delta directly to camera rotation
    if (isTouch) {
      yawRef.current -= lookDeltaRef.current.x * 0.0032;
      pitchRef.current -= lookDeltaRef.current.y * 0.0032;
      pitchRef.current = THREE.MathUtils.clamp(pitchRef.current, -1.1, 1.1);
      lookDeltaRef.current.x = 0;
      lookDeltaRef.current.y = 0;
      camera.rotation.set(pitchRef.current, yawRef.current, 0);
    }

    // ── Movement (both platforms): derive forward/right from current yaw only.
    // Camera looks down -Z at yaw=0, so forward = (-sin(yaw), 0, -cos(yaw)),
    // and "right" (screen-right when walking) is forward rotated -90° about Y,
    // i.e. right = (-forward.z, 0, forward.x). (Previously this was flipped,
    // which made A/D and the left/right arrow keys reversed.)
    const yaw = isTouch ? yawRef.current : camera.rotation.y;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).negate();
    const right = new THREE.Vector3(-forward.z, 0, forward.x);

    let moveX = 0;
    let moveZ = 0;

    // Freeze walking while a book panel is open — otherwise typing W/A/S/D
    // into the review textarea would also drive the player around the room.
    if (!heldBookActive) {
      if (isTouch) {
        moveX = moveInputRef.current.x;
        moveZ = -moveInputRef.current.y;
      } else {
        if (keysRef.current["KeyW"] || keysRef.current["ArrowUp"]) moveZ += 1;
        if (keysRef.current["KeyS"] || keysRef.current["ArrowDown"]) moveZ -= 1;
        if (keysRef.current["KeyD"] || keysRef.current["ArrowRight"])
          moveX += 1;
        if (keysRef.current["KeyA"] || keysRef.current["ArrowLeft"]) moveX -= 1;
      }
    }

    const moving = Math.abs(moveX) > 0.02 || Math.abs(moveZ) > 0.02;

    if (moving) {
      const move = new THREE.Vector3();
      move.addScaledVector(forward, moveZ);
      move.addScaledVector(right, moveX);
      if (move.lengthSq() > 0) move.normalize();
      camera.position.addScaledVector(move, MOVE_SPEED * delta);
      walkCycle.current += delta * 8;
    }

    // Clamp inside room bounds
    const maxX = ROOM_WIDTH / 2 - WALL_MARGIN;
    const maxZ = ROOM_DEPTH / 2 - WALL_MARGIN;
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -maxX, maxX);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -maxZ, maxZ);
    camera.position.y =
      EYE_HEIGHT + (moving ? Math.abs(Math.sin(walkCycle.current)) * 0.035 : 0);

    // ── Raycast from screen center to find focused book
    if (!heldBookActive) {
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const meshes = Array.from(bookMeshesRef.current.keys());
      const hits = raycaster.intersectObjects(meshes, false);
      const validHit = hits.find((h) => h.distance <= REACH_DISTANCE);
      const nextBook = validHit
        ? bookMeshesRef.current.get(validHit.object) || null
        : null;

      if (nextBook?.shelfId !== hoveredRef.current?.shelfId) {
        hoveredRef.current = nextBook;
        onHoverChange(nextBook);
      }
    } else if (hoveredRef.current) {
      hoveredRef.current = null;
      onHoverChange(null);
    }

    // ── Interact signal (fires on click / tap of the pickup button)
    if (interactSignal !== lastInteractSignal.current) {
      lastInteractSignal.current = interactSignal;
      if (!heldBookActive && hoveredRef.current) {
        onInteract(hoveredRef.current);
      }
    }
  });

  return null;
}

// ── Mobile touch look-drag layer (invisible overlay, right 60% of screen) ───
function useTouchLook(
  lookDeltaRef: React.MutableRefObject<{ x: number; y: number }>,
) {
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    lastPos.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      if (lastPos.current) {
        lookDeltaRef.current.x += t.clientX - lastPos.current.x;
        lookDeltaRef.current.y += t.clientY - lastPos.current.y;
      }
      lastPos.current = { x: t.clientX, y: t.clientY };
    },
    [lookDeltaRef],
  );

  const onTouchEnd = useCallback(() => {
    lastPos.current = null;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

// ── Virtual joystick (mobile movement) ───────────────────────────────────────
function VirtualJoystick({
  moveInputRef,
}: {
  moveInputRef: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const activeTouchId = useRef<number | null>(null);
  const MAX_RADIUS = 42;

  const handleStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    activeTouchId.current = touch.identifier;
  };

  const handleMove = (e: React.TouchEvent) => {
    if (activeTouchId.current === null || !baseRef.current) return;
    const touch = Array.from(e.touches).find(
      (t) => t.identifier === activeTouchId.current,
    );
    if (!touch) return;
    const rect = baseRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const dist = Math.min(MAX_RADIUS, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    dx = Math.cos(angle) * dist;
    dy = Math.sin(angle) * dist;
    setKnobPos({ x: dx, y: dy });
    moveInputRef.current = { x: dx / MAX_RADIUS, y: dy / MAX_RADIUS };
  };

  const handleEnd = (e: React.TouchEvent) => {
    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === activeTouchId.current,
    );
    if (touch) {
      activeTouchId.current = null;
      setKnobPos({ x: 0, y: 0 });
      moveInputRef.current = { x: 0, y: 0 };
    }
  };

  return (
    <div
      ref={baseRef}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      className="absolute bottom-8 left-8 w-28 h-28 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm touch-none select-none"
    >
      <div
        className="absolute top-1/2 left-1/2 w-14 h-14 rounded-full bg-amber-500/70 border border-amber-300/50 pointer-events-none"
        style={{
          transform: `translate(-50%, -50%) translate(${knobPos.x}px, ${knobPos.y}px)`,
        }}
      />
    </div>
  );
}

// ── Controls help modal ───────────────────────────────────────────────────────
function ControlsModal({
  isTouch,
  onClose,
}: {
  isTouch: boolean;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-40 px-6">
      <div className="bg-ink-900 border border-ink-800 rounded-2xl p-8 max-w-md w-full text-left space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          aria-label="Close controls"
          className="absolute top-4 right-4 p-1.5 rounded-full bg-ink-950 border border-ink-800 text-parchment-500 hover:text-parchment-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="font-sans text-xl font-bold text-parchment-100">
          {isTouch
            ? "How to explore (touch)"
            : "How to explore (keyboard & mouse)"}
        </h3>

        {isTouch ? (
          <ul className="text-sm text-parchment-400 space-y-3 leading-relaxed">
            <li>
              <strong className="text-parchment-100">Move:</strong> drag the
              joystick in the bottom-left corner.
            </li>
            <li>
              <strong className="text-parchment-100">Look around:</strong> drag
              anywhere else on the screen.
            </li>
            <li>
              <strong className="text-parchment-100">Pick up a book:</strong>{" "}
              aim the center reticle at a glowing book, then tap the{" "}
              <strong>Grab</strong> button.
            </li>
            <li>
              <strong className="text-parchment-100">
                While holding a book:
              </strong>{" "}
              use the panel to log reading progress, leave a review, or change
              its shelf status.
            </li>
            <li>
              <strong className="text-parchment-100">Put it back:</strong> tap
              the ✕ or &quot;Put the book back&quot; in the panel.
            </li>
          </ul>
        ) : (
          <ul className="text-sm text-parchment-400 space-y-3 leading-relaxed">
            <li>
              <strong className="text-parchment-100">Move:</strong>{" "}
              <kbd className="px-1.5 py-0.5 bg-ink-950 border border-ink-800 rounded text-xs">
                W
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 bg-ink-950 border border-ink-800 rounded text-xs">
                A
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 bg-ink-950 border border-ink-800 rounded text-xs">
                S
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 bg-ink-950 border border-ink-800 rounded text-xs">
                D
              </kbd>{" "}
              or the arrow keys.
            </li>
            <li>
              <strong className="text-parchment-100">Look around:</strong> click
              anywhere to lock the mouse, then just move it. Press{" "}
              <strong>Esc</strong> to release the mouse again.
            </li>
            <li>
              <strong className="text-parchment-100">Pick up a book:</strong>{" "}
              aim the center reticle at a glowing book and click.
            </li>
            <li>
              <strong className="text-parchment-100">
                While holding a book:
              </strong>{" "}
              use the panel to log reading progress, leave a review, or change
              its shelf status.
            </li>
            <li>
              <strong className="text-parchment-100">Put it back:</strong> click
              the ✕ or &quot;Put the book back&quot; in the panel.
            </li>
          </ul>
        )}

        <p className="text-xs text-parchment-500 pt-1 border-t border-ink-850">
          Reopen this any time with the <strong>?</strong> button, top-right.
        </p>

        <button
          onClick={onClose}
          className="w-full bg-amber-500 hover:bg-amber-600 text-ink-950 font-semibold px-6 py-2.5 rounded-lg text-sm transition-all cursor-pointer"
        >
          Got it, let&apos;s go
        </button>
      </div>
    </div>
  );
}

// ── Main experience ───────────────────────────────────────────────────────────
export default function Library3DExperience({
  books,
  onExit,
}: Library3DExperienceProps) {
  const [isTouch, setIsTouch] = useState(false);
  const [ready, setReady] = useState(false);
  const [hoveredBook, setHoveredBook] = useState<LibraryBook | null>(null);
  const [heldBook, setHeldBook] = useState<LibraryBook | null>(null);
  const [localBooks, setLocalBooks] = useState<LibraryBook[]>(books);
  const [interactSignal, setInteractSignal] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [locked, setLocked] = useState(false);
  const [lockCooldown, setLockCooldown] = useState(false);

  const bookMeshesRef = useRef<Map<THREE.Object3D, LibraryBook>>(new Map());
  const moveInputRef = useRef({ x: 0, y: 0 });
  const lookDeltaRef = useRef({ x: 0, y: 0 });
  // Typed loosely on purpose: drei forwards the underlying three-stdlib
  // PointerLockControls instance, and we only need isLocked/lock/unlock off it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plcRef = useRef<any>(null);
  const wasLockedRef = useRef(false);
  const cooldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchLook = useTouchLook(lookDeltaRef);

  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  // Track lock state ourselves via the browser's own events too (more reliable
  // across browsers than relying solely on drei's onLock/onUnlock callbacks),
  // and start a short cooldown after an ESC-triggered unlock: browsers refuse
  // to re-acquire pointer lock for ~1.3s after it's released, and attempting
  // to anyway throws a SecurityError + logs "Unable to use Pointer Lock API".
  // During the cooldown we cover the canvas so that click never reaches it.
  useEffect(() => {
    if (isTouch) return;

    const startCooldown = () => {
      setLockCooldown(true);
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = setTimeout(
        () => setLockCooldown(false),
        POINTER_LOCK_COOLDOWN_MS,
      );
    };

    const handleChange = () => {
      const isLocked = !!document.pointerLockElement;
      if (wasLockedRef.current && !isLocked) startCooldown();
      wasLockedRef.current = isLocked;
      setLocked(isLocked);
    };

    const handleError = () => {
      setLocked(false);
      startCooldown();
    };

    document.addEventListener("pointerlockchange", handleChange);
    document.addEventListener("pointerlockerror", handleError);
    return () => {
      document.removeEventListener("pointerlockchange", handleChange);
      document.removeEventListener("pointerlockerror", handleError);
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
    };
  }, [isTouch]);

  // "?" or "H" toggles the controls modal at any time — but not while the
  // user is typing in a form field (e.g. the review textarea in the hand UI).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (isTyping) return;
      if (e.key === "?" || e.key.toLowerCase() === "h") {
        setShowControls((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const registerBookMesh = useCallback(
    (mesh: THREE.Object3D, book: LibraryBook) => {
      bookMeshesRef.current.set(mesh, book);
      return () => {
        bookMeshesRef.current.delete(mesh);
      };
    },
    [],
  );

  // Build shelf layout ONCE from the initial book list: distribute real books
  // first, fill remainder decoratively. Slots only ever store a shelfId — the
  // actual book data is looked up live via `booksById`, so logging progress or
  // changing a status later never reshuffles which book sits where.
  const { backShelf, leftShelf, rightShelf } = useMemo(() => {
    const cols = 10;
    const rows = 3;
    const bookQueue = [...books];
    const decorativeColors = ["#0A3C27", "#123524", "#1E4A34", "#0E2E20"];

    const buildSlots = (): ShelfSlot[][] => {
      const grid: ShelfSlot[][] = [];
      for (let r = 0; r < rows; r++) {
        const row: ShelfSlot[] = [];
        for (let c = 0; c < cols; c++) {
          const book =
            bookQueue.length > 0 && Math.random() > 0.35
              ? bookQueue.shift()
              : undefined;
          row.push({
            shelfId: book?.shelfId ?? null,
            decorativeColor:
              decorativeColors[
                Math.floor(Math.random() * decorativeColors.length)
              ],
          });
        }
        grid.push(row);
      }
      return grid;
    };

    const back = buildSlots();
    const left = buildSlots();
    // Put any remaining real books on the right shelf, front-loaded
    const right: ShelfSlot[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: ShelfSlot[] = [];
      for (let c = 0; c < cols; c++) {
        const book = bookQueue.shift();
        row.push({
          shelfId: book?.shelfId ?? null,
          decorativeColor:
            decorativeColors[
              Math.floor(Math.random() * decorativeColors.length)
            ],
        });
      }
      right.push(row);
    }

    return { backShelf: back, leftShelf: left, rightShelf: right };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally computed once — `books` is stable for the session

  const booksById = useMemo(() => {
    const map = new Map<string, LibraryBook>();
    localBooks.forEach((b) => map.set(b.shelfId, b));
    return map;
  }, [localBooks]);

  const handleInteractPress = useCallback(() => {
    setInteractSignal((s) => s + 1);
  }, []);

  const handleInteract = useCallback((book: LibraryBook) => {
    setHeldBook(book);
  }, []);

  const handleRelease = useCallback(() => {
    setHeldBook(null);
  }, []);

  const handleBookUpdate = useCallback((updated: LibraryBook) => {
    setLocalBooks((prev) =>
      prev.map((b) => (b.shelfId === updated.shelfId ? updated : b)),
    );
    setHeldBook(updated);
  }, []);

  const hiddenShelfIds = useMemo(() => {
    const s = new Set<string>();
    if (heldBook) s.add(heldBook.shelfId);
    return s;
  }, [heldBook]);

  // Any dialog (controls modal or the held-book panel) must fully own mouse
  // input while it's open. Previously PointerLockControls stayed mounted (and
  // listening for clicks) underneath every dialog, so a stray click could
  // silently re-lock the pointer — hiding the cursor again and making the
  // dialog un-clickable until the user pressed Esc. Now: whenever a dialog is
  // open we (a) proactively release any active lock, and (b) unmount
  // PointerLockControls entirely below, so there is no listener left that
  // could re-acquire it while the dialog is up.
  const dialogOpen = showControls || !!heldBook;
  useEffect(() => {
    if (isTouch || !dialogOpen) return;
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {
        // no-op
      }
    }
  }, [isTouch, dialogOpen]);

  // Desktop click has two jobs depending on state:
  //  - not locked yet → this click's job is just to lock the pointer (handled
  //    natively by drei's PointerLockControls); we don't also treat it as "pick up".
  //  - already locked → this click means "interact with whatever I'm looking at".
  const handleCanvasClick = useCallback(() => {
    if (isTouch || dialogOpen) return;
    if (!locked) return;
    handleInteractPress();
  }, [isTouch, dialogOpen, locked, handleInteractPress]);

  const handleExit = useCallback(() => {
    try {
      if (plcRef.current?.isLocked) plcRef.current.unlock();
    } catch {
      // Ignore — the controls/element may already be gone.
    }
    onExit();
  }, [onExit]);

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <Canvas
        shadows
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 70, near: 0.1, far: 100 }}
        onCreated={() => setReady(true)}
        onClick={handleCanvasClick}
      >
        <color attach="background" args={["#0a0d09"]} />
        <fog attach="fog" args={["#0a0d09", 6, 22]} />
        <ambientLight intensity={0.35} />
        <hemisphereLight args={["#2d3b2f", "#0a0d09", 0.5]} />

        <RoomShell />

        <ShelfModule
          position={[0, 0, -ROOM_DEPTH / 2 + 0.35]}
          rotationY={0}
          slots={backShelf}
          booksById={booksById}
          registerBookMesh={registerBookMesh}
          hiddenShelfIds={hiddenShelfIds}
        />
        <ShelfModule
          position={[-ROOM_WIDTH / 2 + 0.35, 0, 0]}
          rotationY={Math.PI / 2}
          slots={leftShelf}
          booksById={booksById}
          registerBookMesh={registerBookMesh}
          hiddenShelfIds={hiddenShelfIds}
        />
        <ShelfModule
          position={[ROOM_WIDTH / 2 - 0.35, 0, 0]}
          rotationY={-Math.PI / 2}
          slots={rightShelf}
          booksById={booksById}
          registerBookMesh={registerBookMesh}
          hiddenShelfIds={hiddenShelfIds}
        />

        <HeldBookView book={heldBook} />

        <PlayerRig
          isTouch={isTouch}
          bookMeshesRef={bookMeshesRef}
          onHoverChange={setHoveredBook}
          interactSignal={interactSignal}
          onInteract={handleInteract}
          moveInputRef={moveInputRef}
          lookDeltaRef={lookDeltaRef}
          heldBookActive={!!heldBook}
        />

        {!isTouch && ready && !dialogOpen && (
          <PointerLockControls
            ref={plcRef}
            onLock={() => setLocked(true)}
            onUnlock={() => setLocked(false)}
          />
        )}
      </Canvas>

      {/* ── Cooldown shield: physically blocks clicks reaching the canvas for a
           moment after ESC-unlocking, so the browser's pointer-lock cooldown
           never gets tripped (avoids the SecurityError / console spam). ──── */}
      {!isTouch && lockCooldown && !heldBook && (
        <div className="absolute inset-0 z-30 flex items-end justify-center pb-24 cursor-not-allowed">
          <p className="text-parchment-300 text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
            One moment — click again to look around
          </p>
        </div>
      )}

      {/* ── Crosshair ─────────────────────────────────────────────────────── */}
      {!heldBook && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className={`w-2.5 h-2.5 rounded-full border-2 transition-all ${
              hoveredBook
                ? "border-amber-400 scale-150 bg-amber-400/30"
                : "border-white/60"
            }`}
          />
        </div>
      )}

      {/* ── Re-lock hint (desktop only) ───────────────────────────────────── */}
      {!isTouch && !locked && !lockCooldown && !showControls && !heldBook && (
        <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 text-center">
          <p className="text-parchment-300 text-xs font-semibold bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
            Click anywhere to look around and walk
          </p>
        </div>
      )}

      {/* ── Hover label ───────────────────────────────────────────────────── */}
      {hoveredBook && !heldBook && (
        <div className="pointer-events-none absolute top-[56%] left-1/2 -translate-x-1/2 text-center">
          <p className="text-amber-400 text-xs font-semibold tracking-wide bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
            {hoveredBook.title} —{" "}
            {isTouch
              ? "tap Grab"
              : locked
                ? "click to pick up"
                : "click to look, then click again to pick up"}
          </p>
        </div>
      )}

      {/* ── Exit button ───────────────────────────────────────────────────── */}
      <button
        onClick={handleExit}
        className="absolute top-5 left-5 z-10 bg-ink-950/80 hover:bg-ink-900 border border-ink-800 text-parchment-100 px-4 py-2 rounded-lg text-xs font-semibold backdrop-blur-sm transition-all cursor-pointer"
      >
        ← Exit 3D Mode
      </button>

      {/* ── Controls / help button (always available) ────────────────────── */}
      <button
        onClick={() => setShowControls(true)}
        className="absolute top-5 right-5 z-10 flex items-center gap-1.5 bg-ink-950/80 hover:bg-ink-900 border border-ink-800 text-parchment-100 px-4 py-2 rounded-lg text-xs font-semibold backdrop-blur-sm transition-all cursor-pointer"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        Controls
        <kbd className="ml-1 px-1.5 py-0.5 bg-ink-900 border border-ink-800 rounded text-[10px]">
          ?
        </kbd>
      </button>

      {/* ── Controls / instructions modal ─────────────────────────────────── */}
      {showControls && ready && !heldBook && (
        <ControlsModal
          isTouch={isTouch}
          onClose={() => setShowControls(false)}
        />
      )}

      {/* ── Mobile controls ──────────────────────────────────────────────── */}
      {isTouch && !heldBook && !showControls && (
        <>
          <div
            className="absolute inset-0 z-[5]"
            onTouchStart={touchLook.onTouchStart}
            onTouchMove={touchLook.onTouchMove}
            onTouchEnd={touchLook.onTouchEnd}
          />
          <div className="relative z-10">
            <VirtualJoystick moveInputRef={moveInputRef} />
          </div>
          <button
            onClick={handleInteractPress}
            disabled={!hoveredBook}
            className={`absolute bottom-10 right-8 z-10 w-20 h-20 rounded-full font-bold text-xs uppercase tracking-wide border-2 transition-all ${
              hoveredBook
                ? "bg-amber-500 border-amber-300 text-ink-950"
                : "bg-white/10 border-white/20 text-white/40"
            }`}
          >
            Grab
          </button>
        </>
      )}

      {/* ── Book-in-hand UI panel ────────────────────────────────────────── */}
      {heldBook && (
        <BookHandUI
          book={heldBook}
          onClose={handleRelease}
          onUpdate={handleBookUpdate}
        />
      )}
    </div>
  );
}
