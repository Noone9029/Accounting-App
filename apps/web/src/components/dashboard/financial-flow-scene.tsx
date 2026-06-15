"use client";

import { useEffect, useRef, useState } from "react";

function supportsReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function hasWebGlSupport(): boolean {
  if (typeof document === "undefined") {
    return false;
  }

  if (typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("jsdom")) {
    return false;
  }

  const canvas = document.createElement("canvas");
  try {
    return Boolean(canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

export function FinancialFlowScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || supportsReducedMotion() || !hasWebGlSupport()) {
      setFallback(true);
      return;
    }
    const target = host;

    let cancelled = false;
    let frameId = 0;
    let cleanup: (() => void) | undefined;

    async function mountScene() {
      const THREE = await import("three");
      if (cancelled) {
        return;
      }

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
      renderer.setClearColor(0x000000, 0);
      target.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0, 0, 9);

      const group = new THREE.Group();
      const material = new THREE.LineBasicMaterial({
        color: 0x0f766e,
        transparent: true,
        opacity: 0.42,
      });
      const accentMaterial = new THREE.LineBasicMaterial({
        color: 0x2563eb,
        transparent: true,
        opacity: 0.18,
      });

      for (let row = 0; row < 7; row += 1) {
        const points: Array<import("three").Vector3> = [];
        const y = (row - 3) * 0.58;
        for (let index = 0; index < 36; index += 1) {
          const x = (index - 17.5) * 0.28;
          const z = Math.sin(index * 0.55 + row) * 0.18;
          points.push(new THREE.Vector3(x, y + Math.sin(index * 0.4 + row) * 0.1, z));
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        group.add(new THREE.Line(geometry, row % 2 === 0 ? material : accentMaterial));
      }

      scene.add(group);

      function resize() {
        const rect = target.getBoundingClientRect();
        const width = Math.max(Math.floor(rect.width), 1);
        const height = Math.max(Math.floor(rect.height), 1);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }

      function animate(time: number) {
        group.rotation.y = Math.sin(time * 0.00022) * 0.14;
        group.rotation.x = Math.sin(time * 0.00016) * 0.05;
        group.position.x = Math.sin(time * 0.00012) * 0.16;
        renderer.render(scene, camera);
        frameId = window.requestAnimationFrame(animate);
      }

      resize();
      window.addEventListener("resize", resize);
      frameId = window.requestAnimationFrame(animate);

      cleanup = () => {
        window.cancelAnimationFrame(frameId);
        window.removeEventListener("resize", resize);
        group.traverse((object) => {
          if ("geometry" in object && object.geometry instanceof THREE.BufferGeometry) {
            object.geometry.dispose();
          }
        });
        material.dispose();
        accentMaterial.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    }

    void mountScene();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      data-testid="financial-flow-scene"
      data-fallback={fallback ? "true" : "false"}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {fallback ? (
        <div className="size-full bg-[linear-gradient(115deg,rgba(15,118,110,0.14),rgba(37,99,235,0.08)_44%,rgba(255,255,255,0)_72%)]" />
      ) : null}
    </div>
  );
}
