/* What moves in the flat: the fish in their tank, the pendulum of the living-room clock, the hands of the clocks. */
import * as THREE from 'three';

export function buildLife(scene, ctx) {
  const fish = [];
  if (ctx.fish) {
    const f = ctx.fish, cols = ['#f28a2e', '#f4f1e8', '#e8552e', '#f2c23a', '#2a2a2e', '#f28a2e', '#e8e2d0'];
    for (let i = 0; i < 7; i++) {
      const g = new THREE.SphereGeometry(0.5, 10, 8); g.scale(0.022 + (i % 3) * 0.004, 0.02, 0.055 + (i % 2) * 0.012);
      const tail = new THREE.ConeGeometry(0.014, 0.03, 4); tail.rotateX(-Math.PI / 2); tail.translate(0, 0, -0.04);
      const mat = new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.4, emissive: cols[i], emissiveIntensity: 0.25 });
      const m = new THREE.Group(); m.add(new THREE.Mesh(g, mat), new THREE.Mesh(tail, mat)); scene.add(m);
      fish.push({ m, x: f.x0 + (f.x1 - f.x0) * ((i * 0.37) % 1), y: f.y0 + (f.y1 - f.y0) * ((i * 0.61 + 0.2) % 1), ph: i * 1.7, sp: 0.16 + (i % 4) * 0.05 });
    }
  }
  const pend = new THREE.Group();
  if (ctx.pendulum) {
    const brass = new THREE.MeshStandardMaterial({ color: '#c9a23a', roughness: 0.3, metalness: 0.9 });
    const rod = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.17, 0.003), brass); rod.position.y = -0.085;
    const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.006, 16).rotateX(Math.PI / 2), brass); bob.position.y = -0.17;
    pend.add(rod, bob); pend.position.set(ctx.pendulum.x, ctx.pendulum.y, ctx.pendulum.z); scene.add(pend);
  }
  const hands = ctx.clocks.map(c => {
    const g = new THREE.Group(), ink = new THREE.MeshBasicMaterial({ color: '#1c1a18' });
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.012, c.r * 0.62, 0.002).translate(0, c.r * 0.26, 0), ink), m = new THREE.Mesh(new THREE.BoxGeometry(0.007, c.r * 0.95, 0.002).translate(0, c.r * 0.4, 0.002), ink);
    g.add(h, m); g.position.set(c.x, c.y, c.z); g.rotation.y = -c.ry * Math.PI / 180; scene.add(g);
    return { h, m };
  });

  return {
    /** every clock in the flat shows the same time */
    setClocks(hh, mm) { for (const c of hands) { c.h.rotation.z = -((hh % 12) + mm / 60) / 12 * Math.PI * 2; c.m.rotation.z = -mm / 60 * Math.PI * 2; } },
    animate(dt, clock) {
      if (ctx.fish) { const f = ctx.fish, span = f.z1 - f.z0; for (const q of fish) { const u = (clock * q.sp + q.ph) % 2, k = u < 1 ? u : 2 - u, e = k * k * (3 - 2 * k); q.m.position.set(q.x + Math.sin(clock * 0.7 + q.ph) * 0.02, q.y + Math.sin(clock * 0.9 + q.ph * 2) * 0.025, f.z0 + span * e); q.m.rotation.y = u < 1 ? 0 : Math.PI; } }
      pend.rotation.z = Math.sin(clock * 3.6) * 0.26;
    },
  };
}
