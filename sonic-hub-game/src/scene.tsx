/* The plant at night, behind the featured game: a far row of silhouettes against the glow of the horizon, two lit
   clusters up close at the edges, and the catwalk everything stands on. All of it is drawn here; nothing is an image. */
import type { ReactNode } from 'react';

const GROUND = 316;
const FAR = '#1B1670', FAR_HI = '#2C2598', FAR_LO = '#141057';
const INK = '#04061F', S0 = '#0F1C8C', S1 = '#1F36C9', S2 = '#3558F0', S3 = '#7FA2FF';

/* ── far row: flat shapes with one lighter edge, no outlines ─────────────────────────────────────────────────── */

function FarTank({ x, w, h, dome = 18 }: { x: number; w: number; h: number; dome?: number }) {
  const top = GROUND - h;
  return (
    <g>
      <ellipse cx={x + w / 2} cy={top} rx={w / 2} ry={dome} fill={FAR} shapeRendering="geometricPrecision" />
      <rect x={x} y={top} width={w} height={h} fill={FAR} />
      <rect x={x} y={top} width={6} height={h} fill={FAR_HI} />
      <rect x={x + w - 12} y={top} width={12} height={h} fill={FAR_LO} />
    </g>
  );
}

function FarColumn({ x, w, h, decks }: { x: number; w: number; h: number; decks: number[] }) {
  const top = GROUND - h;
  return (
    <g>
      <rect x={x} y={top} width={w} height={h} fill={FAR} />
      <rect x={x} y={top} width={5} height={h} fill={FAR_HI} />
      <rect x={x + w / 2 - 6} y={top - 14} width={12} height={14} fill={FAR} />
      <rect x={x + w / 2 - 2} y={top - 30} width={4} height={16} fill={FAR} />
      {decks.map(d => (
        <g key={d}>
          <rect x={x - 9} y={GROUND - d} width={w + 18} height={5} fill={FAR} />
          <rect x={x - 9} y={GROUND - d - 10} width={3} height={10} fill={FAR} />
          <rect x={x + w + 6} y={GROUND - d - 10} width={3} height={10} fill={FAR} />
          <rect x={x - 9} y={GROUND - d - 11} width={w + 18} height={2} fill={FAR} />
        </g>
      ))}
    </g>
  );
}

function FarSphere({ cx, r }: { cx: number; r: number }) {
  const cy = GROUND - r - 46;
  return (
    <g>
      {[-0.72, -0.28, 0.28, 0.72].map(k => <rect key={k} x={cx + k * r - 3} y={cy} width={6} height={GROUND - cy} fill={FAR} />)}
      <circle cx={cx} cy={cy} r={r} fill={FAR} shapeRendering="geometricPrecision" />
      <path d={`M${cx - r * 0.8} ${cy - r * 0.55} A${r} ${r} 0 0 1 ${cx - r * 0.2} ${cy - r * 0.97}`} fill="none" stroke={FAR_HI} strokeWidth="5"
        shapeRendering="geometricPrecision" />
      <rect x={cx - r - 7} y={cy - 3} width={2 * r + 14} height={6} fill={FAR_LO} />
    </g>
  );
}

function FarStack({ x, w, h, beacon }: { x: number; w: number; h: number; beacon: string }) {
  const top = GROUND - h;
  return (
    <g>
      <rect x={x} y={top} width={w} height={h} fill={FAR} />
      <rect x={x} y={top} width={5} height={h} fill={FAR_HI} />
      <rect x={x - 4} y={top} width={w + 8} height={7} fill={FAR} />
      <rect x={x} y={top + 20} width={w} height={10} fill={FAR_HI} />
      <rect x={x} y={top + 42} width={w} height={10} fill={FAR_HI} />
      <rect className={`sc-blink ${beacon}`} x={x + w / 2 - 4} y={top - 10} width={8} height={8} fill="#FF4D6A" />
    </g>
  );
}

/* ── near clusters: steel with an outline, a lit edge and a shaded edge ──────────────────────────────────────── */

function Steel({ x, y, w, h, hi = 18, lo = 26, children }: { x: number; y: number; w: number; h: number; hi?: number; lo?: number; children?: ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={INK} />
      <rect x={x + 3} y={y + 3} width={w - 6} height={h - 6} fill={S1} />
      <rect x={x + 3} y={y + 3} width={hi} height={h - 6} fill={S2} />
      <rect x={x + 3} y={y + 3} width={4} height={h - 6} fill={S3} />
      <rect x={x + w - 3 - lo} y={y + 3} width={lo} height={h - 6} fill={S0} />
      {children}
    </g>
  );
}

function SightGlass({ x, y, h, fill, hi, level }: { x: number; y: number; h: number; fill: string; hi: string; level: number }) {
  const lh = Math.round((h - 6) * level);
  return (
    <g>
      <rect x={x} y={y} width={22} height={h} fill={INK} />
      <rect x={x + 3} y={y + 3} width={16} height={h - 6} fill="#0A1050" />
      <rect x={x + 3} y={y + h - 3 - lh} width={16} height={lh} fill={fill} />
      <rect x={x + 3} y={y + h - 3 - lh} width={16} height={3} fill={hi} />
      <rect x={x + 6} y={y + 6} width={3} height={h - 12} fill="#FFFFFF" opacity=".28" />
      <rect x={x - 4} y={y - 6} width={30} height={9} fill={INK} />
      <rect x={x - 1} y={y - 3} width={24} height={3} fill={S3} />
      <rect x={x - 4} y={y + h - 3} width={30} height={9} fill={INK} />
      <rect x={x - 1} y={y + h} width={24} height={3} fill={S2} />
    </g>
  );
}

export function Skyline() {
  return (
    <svg className="skyline" viewBox="0 0 1600 360" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="sc-hz" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="9" height="18" fill="#FFD21A" /><rect x="9" width="9" height="18" fill="#16110A" />
        </pattern>
        <pattern id="sc-truss" width="48" height="28" patternUnits="userSpaceOnUse">
          <rect width="48" height="28" fill={S0} />
          <path d="M0 0L24 28L48 0M0 28L24 0L48 28" fill="none" stroke={S1} strokeWidth="5" />
          <rect width="5" height="28" fill={S2} />
        </pattern>
      </defs>

      {/* far row: low behind the words, tall only where nothing is written (the gap beside the big screen, the right end) */}
      <g shapeRendering="crispEdges">
        <FarColumn x={236} w={30} h={150} decks={[60, 110]} />
        <rect x={266} y={GROUND - 96} width={34} height={7} fill={FAR} />
        <FarSphere cx={338} r={38} />
        <FarTank x={404} w={92} h={98} />
        <path d={`M520 ${GROUND}V${GROUND - 50}l45 -26v26l45 -26v26l45 -26v26l45 -26v76z`} fill={FAR} />
        <rect x={520} y={GROUND - 50} width={5} height={50} fill={FAR_HI} />
        <FarStack x={716} w={22} h={178} beacon="b1" />
        <FarTank x={758} w={60} h={78} dome={12} />
        <g className="sc-tall">
          <rect x={846} y={GROUND - 262} width={9} height={262} fill={FAR} />
          <rect x={846} y={GROUND - 262} width={3} height={262} fill={FAR_HI} />
          <path d={`M834 ${GROUND}l16 -84l16 84z`} fill={FAR} />
          <rect x={839} y={GROUND - 150} width={23} height={5} fill={FAR} />
        </g>
        <FarTank x={904} w={70} h={82} dome={12} />
        <FarTank x={982} w={70} h={82} dome={12} />
        <FarColumn x={1076} w={28} h={92} decks={[44, 76]} />
        <path d={`M1122 ${GROUND}V${GROUND - 46}l40 -22v22l40 -22v22l40 -22v68z`} fill={FAR} />
        <rect x={1122} y={GROUND - 46} width={5} height={46} fill={FAR_HI} />
        <FarSphere cx={1298} r={32} />
        <FarStack x={1348} w={20} h={214} beacon="b2" />
        {/* lit windows and deck lamps, kept low */}
        {[[248, 116, '#FFB01F'], [430, 52, '#FFB01F'], [556, 28, '#5CF0FF'], [600, 28, '#FFB01F'], [690, 28, '#FFB01F'], [784, 40, '#5CF0FF'],
          [930, 44, '#FFB01F'], [1008, 44, '#5CF0FF'], [1088, 60, '#FFB01F'], [1150, 24, '#FFB01F'], [1230, 24, '#5CF0FF']]
          .map(([x, up, c], i) => <rect key={i} x={x as number} y={GROUND - (up as number)} width={4} height={4} fill={c as string} />)}
      </g>
      {/* the flare on the tall thin stack */}
      <g className="sc-tall">
        <g className="sc-flare" shapeRendering="geometricPrecision">
          <path d={`M850.5 ${GROUND - 292}c-9 10 -9 20 0 30c9 -10 9 -20 0 -30z`} fill="#FF8A1E" />
          <path d={`M850.5 ${GROUND - 280}c-4 6 -4 12 0 18c4 -6 4 -12 0 -18z`} fill="#FFE873" />
        </g>
      </g>

      {/* near cluster, left: a storage tank, its sight glass and a pump box */}
      <g shapeRendering="crispEdges">
        <ellipse cx={72} cy={GROUND - 226} rx={105} ry={26} fill={INK} shapeRendering="geometricPrecision" />
        <ellipse cx={72} cy={GROUND - 226} rx={102} ry={23} fill={S2} shapeRendering="geometricPrecision" />
        <Steel x={-33} y={GROUND - 228} w={210} h={228} hi={30} lo={44}>
          {[56, 112, 168].map(d => <rect key={d} x={-30} y={GROUND - 228 + d} width={204} height={3} fill={S0} />)}
          <rect x={-30} y={GROUND - 84} width={204} height={22} fill={INK} />
          <rect x={-30} y={GROUND - 81} width={204} height={16} fill="url(#sc-hz)" />
          {/* ladder */}
          <rect x={112} y={GROUND - 222} width={4} height={138} fill={S3} />
          <rect x={136} y={GROUND - 222} width={4} height={138} fill={S3} />
          {Array.from({ length: 9 }, (_, i) => <rect key={i} x={112} y={GROUND - 212 + i * 15} width={28} height={3} fill={S3} />)}
        </Steel>
        <SightGlass x={190} y={GROUND - 190} h={184} fill="#FF2D95" hi="#FF9BCF" level={0.62} />
        <rect x={177} y={GROUND - 150} width={16} height={12} fill={INK} /><rect x={177} y={GROUND - 147} width={16} height={6} fill={S2} />
      </g>

      {/* near cluster, right: a reaction column with decks, a tank and the pipe between them */}
      <g shapeRendering="crispEdges">
        <Steel x={1420} y={GROUND - 262} w={56} h={262} hi={14} lo={16}>
          {[70, 140, 210].map(d => (
            <g key={d}>
              <rect x={1404} y={GROUND - d} width={88} height={9} fill={INK} />
              <rect x={1407} y={GROUND - d + 3} width={82} height={3} fill={S3} />
              <rect x={1404} y={GROUND - d - 18} width={3} height={18} fill={S3} />
              <rect x={1489} y={GROUND - d - 18} width={3} height={18} fill={S3} />
              <rect x={1404} y={GROUND - d - 19} width={88} height={3} fill={S3} />
            </g>
          ))}
        </Steel>
        <rect x={1434} y={GROUND - 284} width={28} height={25} fill={INK} /><rect x={1437} y={GROUND - 281} width={22} height={19} fill={S2} />
        <SightGlass x={1386} y={GROUND - 170} h={164} fill="#1FE0F2" hi="#B5F8FF" level={0.5} />
        <ellipse cx={1570} cy={GROUND - 168} rx={75} ry={20} fill={INK} shapeRendering="geometricPrecision" />
        <ellipse cx={1570} cy={GROUND - 168} rx={72} ry={17} fill={S2} shapeRendering="geometricPrecision" />
        <Steel x={1495} y={GROUND - 170} w={150} h={170} hi={22} lo={30}>
          {[58, 116].map(d => <rect key={d} x={1498} y={GROUND - 170 + d} width={144} height={3} fill={S0} />)}
          <rect x={1498} y={GROUND - 52} width={144} height={18} fill={INK} />
          <rect x={1498} y={GROUND - 49} width={144} height={12} fill="url(#sc-hz)" />
        </Steel>
        {/* the pipe from the column over to the tank */}
        <path d={`M1476 ${GROUND - 236}h72v62`} fill="none" stroke={INK} strokeWidth="18" />
        <path d={`M1476 ${GROUND - 236}h72v62`} fill="none" stroke={S2} strokeWidth="12" />
        <path d={`M1476 ${GROUND - 240}h76v66`} fill="none" stroke={S3} strokeWidth="3" />
      </g>

      {/* the catwalk: railing, deck, truss */}
      <g shapeRendering="crispEdges">
        {Array.from({ length: 26 }, (_, i) => <rect key={i} x={i * 64 + 12} y={GROUND - 26} width={4} height={26} fill="#4668E6" />)}
        <rect x={0} y={GROUND - 28} width={1600} height={4} fill="#5C80F5" />
        <rect x={0} y={GROUND - 14} width={1600} height={3} fill="#4668E6" />
        <rect x={0} y={GROUND} width={1600} height={44} fill={INK} />
        <rect x={0} y={GROUND + 3} width={1600} height={7} fill={S2} />
        <rect x={0} y={GROUND + 3} width={1600} height={2} fill={S3} />
        <rect x={0} y={GROUND + 13} width={1600} height={22} fill="url(#sc-truss)" />
        <rect x={0} y={GROUND + 38} width={1600} height={3} fill={S1} />
      </g>
    </svg>
  );
}

/** A few fixed stars: small squares, some of them twinkling. Placed by a seeded generator so they never move between visits. */
export function Stars() {
  let s = 20261112;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const stars = Array.from({ length: 70 }, () => ({ x: Math.round(rnd() * 1600), y: Math.round(rnd() * rnd() * 300), big: rnd() > 0.82, tw: rnd() > 0.8 }));
  return (
    <svg className="stars" viewBox="0 0 1600 320" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      {stars.map((st, i) => st.big
        ? <path key={i} className={st.tw ? 'sc-twinkle' : undefined} d={`M${st.x} ${st.y - 4}v3h3v2h-3v3h-2v-3h-3v-2h3v-3z`} fill="#DCE7FF" />
        : <rect key={i} className={st.tw ? 'sc-twinkle' : undefined} x={st.x} y={st.y} width={2} height={2} fill={i % 3 ? '#AFC2FF' : '#FFFFFF'} />)}
    </svg>
  );
}
