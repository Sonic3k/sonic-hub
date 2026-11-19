/* ── A scene for each station ──
   One sheet each (1200 by 520, cut to whatever frame it is put in: a banner shows the band between about 150 and
   360). Flat shapes, one light in each sky, lamps along the foreground. Port Halcyon's is the first one drawn and
   the others follow it. */
/* ── Port Halcyon at the evening gun ── */
function sceneHalcyon() {
  let lights = '', flags = '';
  for (let i = 0; i < 17; i++) { const x = 40 + i * 70, y = 392 + Math.sin(i * 0.9) * 9 + 14; lights += `<circle cx="${x}" cy="${f1(y)}" r="5" fill="#ffe08a"/><circle cx="${x}" cy="${f1(y)}" r="12" fill="#ffe08a" opacity=".22"/>`; }
  ['#d7263d', '#ffd45c', '#2458c5', '#fff6e0', '#d7263d', '#2458c5'].forEach((c, i) => { flags += `<path d="M${716 + i * 2} ${126 + i * 22}l26 6l-26 8z" fill="${c}"/>`; });
  return `<svg class="scene" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#28507e"/><stop offset=".45" stop-color="#e8707a"/><stop offset=".78" stop-color="#ffb35c"/><stop offset="1" stop-color="#ffe29a"/></linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f29a6a"/><stop offset=".35" stop-color="#3f8fa6"/><stop offset="1" stop-color="#17506b"/></linearGradient></defs>
    <rect width="1200" height="300" fill="url(#sky)"/><circle cx="820" cy="262" r="64" fill="#fff3c4"/><circle cx="820" cy="262" r="110" fill="#fff3c4" opacity=".25"/>
    <g fill="#fff" opacity=".5"><ellipse cx="260" cy="96" rx="120" ry="12"/><ellipse cx="330" cy="116" rx="80" ry="8"/><ellipse cx="980" cy="140" rx="110" ry="10"/></g>
    <path d="M0 268Q120 214 250 240Q330 200 420 252L470 270H0Z" fill="#3b3160"/><path d="M196 236V160h14v76z" fill="#f4ead2"/><path d="M192 160h22l-5 -16h-12z" fill="#c8324b"/><circle cx="203" cy="152" r="6" fill="#ffe08a"/><path class="beam" d="M203 152L60 120V186Z" fill="#ffe08a" opacity=".18"/>
    <rect y="268" width="1200" height="252" fill="url(#water)"/><g class="glints" fill="#fff3c4" opacity=".5"><rect x="760" y="282" width="120" height="4" rx="2"/><rect x="780" y="298" width="80" height="4" rx="2"/><rect x="744" y="316" width="150" height="5" rx="2"/><rect x="790" y="338" width="64" height="5" rx="2"/></g>
    <g fill="#1d2a48"><path d="M520 300h250l-22 30H548z"/><path d="M580 300v-22h40v-18h46v18h50v22z"/><path d="M640 260v-44M626 232h30" stroke="#1d2a48" stroke-width="4" fill="none"/><path d="M716 116V300" stroke="#1d2a48" stroke-width="3"/>
      <path d="M930 318h190l-16 22H950z"/><path d="M980 318v-16h32v-12h34v12h30v16z"/></g>${flags}
    <path d="M0 410Q200 392 420 404T860 400T1200 408V520H0Z" fill="#12283c"/><path d="M0 396Q300 420 600 398T1200 402" fill="none" stroke="#2a1c1a" stroke-width="2"/><g class="bulbs">${lights}</g>
    <g fill="#0c1b2a"><rect x="0" y="446" width="1200" height="10"/><path d="M60 446v74h10v-74zM260 446v74h10v-74zM460 446v74h10v-74zM660 446v74h10v-74zM860 446v74h10v-74zM1060 446v74h10v-74z"/></g></svg>`;
}

const Scenes = (() => {
  const wrap = (id, defs, body) => `<svg class="scene" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;
  const grad = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`).join('')}</linearGradient>`;
  const lamps = (n, y, col, wave = 9, r = 5) => { let g = '<g class="bulbs">'; for (let i = 0; i < n; i++) { const x = 40 + i * (1120 / (n - 1)), yy = y + Math.sin(i * 0.9) * wave; g += `<circle cx="${f1(x)}" cy="${f1(yy)}" r="${r}" fill="${col}"/><circle cx="${f1(x)}" cy="${f1(yy)}" r="${r * 2.4}" fill="${col}" opacity=".22"/>`; } return g + '</g>'; };
  const pine = (x, base, h, col) => { const w = h * 0.36; return `<path d="M${f1(x)} ${f1(base - h)}L${f1(x + w * .55)} ${f1(base - h * .62)}H${f1(x + w * .3)}L${f1(x + w * .8)} ${f1(base - h * .3)}H${f1(x + w * .45)}L${f1(x + w)} ${base}H${f1(x - w)}L${f1(x - w * .45)} ${f1(base - h * .3)}H${f1(x - w * .8)}L${f1(x - w * .3)} ${f1(base - h * .62)}H${f1(x - w * .55)}Z" fill="${col}"/>`; };
  /* the same scatter of trees and stars every time: a scene is a place, not a throw of dice */
  const dice = seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  /* ── Kestrel Field at first light: hangars, the tower, the dawn patrol going out ── */
  function kestrel() {
    const hangar = (x, w, lit) => `<path d="M${x} 300V262Q${x + w / 2} ${222 - w * .06} ${x + w} 262V300Z" fill="#22395a"/><path d="M${x + w * .16} 300V268H${x + w * .84}V300Z" fill="${lit ? '#ffd98a' : '#16284a'}"/>${lit ? `<path d="M${x + w * .5} 268V300M${x + w * .33} 268V300M${x + w * .67} 268V300" stroke="#22395a" stroke-width="3"/>` : ''}`;
    const plane = (x, y, s, col = '#1b2c4a') => `<g transform="translate(${x} ${y}) scale(${s})" fill="${col}"><path d="M-46 0Q-40 -9 -10 -10H30Q46 -8 52 0Q46 5 30 6H-34Q-44 5 -46 0Z"/><path d="M-40 -2L-52 -24H-40L-26 -6Z"/><path d="M-6 0L-22 26H-6L14 2Z"/><path d="M24 -10Q34 -16 40 -8Z" fill="#bfe6f5"/></g>`;
    let dashes = '';
    for (let i = 0; i < 9; i++) { const t = i / 9, y = 306 + t * t * 214, w = 3 + t * 16, h = 4 + t * 26; dashes += `<path d="M${f1(770 + t * 120 - w / 2)} ${f1(y)}h${f1(w)}l${f1(w * .25)} ${f1(h)}h${f1(-w * 1.5)}Z" fill="#fff" opacity=".85"/>`; }
    return wrap('k', grad('k-sky', [[0, '#3f7fc0'], [.42, '#8fcbe6'], [.74, '#fbe3b4'], [1, '#ffc98a']]) + grad('k-field', [[0, '#8fbf7a'], [.3, '#5f9d68'], [1, '#2f6a55']]) + grad('k-trail', [[0, '#fff', 0], [1, '#fff', .9]], 1, 0),
      `<rect width="1200" height="304" fill="url(#k-sky)"/><circle cx="930" cy="296" r="58" fill="#fff6d6"/><circle cx="930" cy="296" r="120" fill="#fff6d6" opacity=".3"/>
      <g fill="#fff" opacity=".7"><ellipse cx="220" cy="84" rx="150" ry="13"/><ellipse cx="320" cy="108" rx="96" ry="9"/><ellipse cx="700" cy="150" rx="130" ry="10"/><ellipse cx="1080" cy="110" rx="100" ry="9"/></g>
      <path d="M0 300Q160 262 330 286Q470 258 640 290Q840 268 1010 288Q1110 276 1200 286V304H0Z" fill="#6f8fb8"/>
      <rect y="300" width="1200" height="220" fill="url(#k-field)"/>
      <path d="M746 300H794L1010 520H560Z" fill="#59657a"/><path d="M746 300H794L1010 520H560Z" fill="#fff" opacity=".06"/>${dashes}
      ${hangar(60, 170, true)}${hangar(244, 170, false)}${hangar(428, 150, true)}
      <g fill="#22395a"><path d="M618 300V206h22v94Z"/><path d="M606 206h46l-6 -30h-34Z"/><path d="M629 176v-34" stroke="#22395a" stroke-width="4"/></g><path d="M612 202h34l-4 -22h-26Z" fill="#bfe6f5"/><circle cx="629" cy="140" r="5" fill="#ff5a4a"/><circle cx="629" cy="140" r="12" fill="#ff5a4a" opacity=".25"/>
      <path d="M690 300V236" stroke="#22395a" stroke-width="4"/><path d="M690 236l44 6v12l-44 6Z" fill="#ff7f51"/><path d="M704 238v20M718 240v16" stroke="#fff" stroke-width="5"/>
      ${plane(366, 290, .62)}${plane(230, 292, .5)}
      <path d="M700 196L1010 96" stroke="url(#k-trail)" stroke-width="5" stroke-linecap="round"/><g transform="translate(1030 90) rotate(-18)">${plane(0, 0, .8)}</g>
      <g transform="translate(1110 150) rotate(-18)">${plane(0, 0, .34)}</g><g transform="translate(1068 176) rotate(-18)">${plane(0, 0, .34)}</g>
      <path d="M0 418Q260 398 520 410T1200 404V520H0Z" fill="#17382f"/>${lamps(15, 410, '#8fd0ff', 5, 4)}
      <g fill="#0f2a24"><rect x="0" y="452" width="1200" height="8"/><path d="M90 452v68h8v-68zM330 452v68h8v-68zM1100 452v68h8v-68z"/></g>`);
  }

  /* ── Ironwood Depot in the morning mist: the sheds, the water tower, the motor pool drawn up under the pines ── */
  function ironwood() {
    const rnd = dice(4711); let far = '', mid = '', near = '';
    for (let i = 0; i < 34; i++) far += pine(18 + i * 36 + (rnd() - .5) * 14, 286, 70 + rnd() * 46, '#8fb79c');
    for (let i = 0; i < 26; i++) { const x = 10 + i * 47 + (rnd() - .5) * 18; if (x > 420 && x < 900) continue; mid += pine(x, 306, 110 + rnd() * 70, '#4f8d6a'); }
    for (let i = 0; i < 9; i++) { const x = [30, 110, 190, 270, 960, 1030, 1100, 1170, 350][i]; near += pine(x, 404, 190 + rnd() * 90, '#1f4a3c'); }
    const truck = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#1c3a30"><path d="M-40 0V-30H10V0Z"/><path d="M10 0V-22H30L40 -10V0Z"/><circle cx="-24" cy="2" r="9"/><circle cx="22" cy="2" r="9"/><path d="M14 -18H28L34 -10H14Z" fill="#ffe7a8"/></g>`;
    const tank = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#1c3a30"><path d="M-46 0Q-52 -8 -44 -14H40Q50 -8 44 0Q0 8 -46 0Z"/><path d="M-22 -14V-28H16V-14Z"/><path d="M16 -24H62V-19H16Z"/></g>`;
    return wrap('i', grad('i-sky', [[0, '#2f7a78'], [.5, '#8fcaa8'], [.82, '#eef0b8'], [1, '#ffe9a8']]) + grad('i-ground', [[0, '#c9b97a'], [.25, '#8a9a5a'], [1, '#2f5a45']]) + grad('i-mist', [[0, '#fff', 0], [.5, '#fff', .5], [1, '#fff', 0]]),
      `<rect width="1200" height="310" fill="url(#i-sky)"/><circle cx="640" cy="236" r="56" fill="#fffbe0"/><circle cx="640" cy="236" r="118" fill="#fffbe0" opacity=".3"/>
      <path d="M0 250Q200 200 420 236Q640 190 860 232Q1040 204 1200 240V300H0Z" fill="#a9cdb0"/>${far}
      <rect y="262" width="1200" height="52" fill="url(#i-mist)"/>${mid}
      <rect y="300" width="1200" height="220" fill="url(#i-ground)"/>
      <g fill="#234a3d"><path d="M452 306V262h268v44Z"/><path d="M448 262l34 -30v30l34 -30v30l34 -30v30l34 -30v30l34 -30v30l34 -30v30l34 -30v30l30 -26v26Z"/></g>
      <g fill="#ffd98a"><rect x="470" y="276" width="26" height="18"/><rect x="514" y="276" width="26" height="18"/><rect x="558" y="276" width="26" height="18"/><rect x="646" y="276" width="26" height="18"/><rect x="602" y="272" width="30" height="34" fill="#17382f"/></g>
      <g fill="#234a3d"><path d="M774 306L782 232M826 306L818 232" stroke="#234a3d" stroke-width="6"/><path d="M766 232V192Q800 176 834 192V232Z"/><path d="M760 192L800 168L840 192Z" fill="#17382f"/><path d="M778 262H822" stroke="#234a3d" stroke-width="4"/></g>
      <path d="M866 306V212" stroke="#234a3d" stroke-width="4"/><path d="M866 212l40 8l-40 12Z" fill="#d7263d"/>
      ${truck(500, 330, 1)}${truck(604, 330, 1)}${tank(720, 332, 1)}${tank(848, 332, 1)}
      <g fill="#17382f"><ellipse cx="400" cy="336" rx="15" ry="7"/><rect x="385" y="312" width="30" height="24" rx="4"/><ellipse cx="400" cy="312" rx="15" ry="6" fill="#2f5a45"/><rect x="424" y="318" width="24" height="20" rx="4"/></g>
      ${near}<path d="M0 424Q300 404 600 416T1200 410V520H0Z" fill="#12281f"/>${lamps(13, 414, '#ffd98a', 6, 4.5)}
      <g fill="#0c1b15"><rect x="0" y="454" width="1200" height="8"/><path d="M150 454v66h8v-66zM470 454v66h8v-66zM790 454v66h8v-66zM1090 454v66h8v-66z"/></g>`);
  }

  /* ── Cape Lantern after dark: the light turning, the College's windows lit on the cliff ── */
  function lantern() {
    const rnd = dice(584945395); let stars = '', wins = '';   // where the pines of Ironwood left the dice in the draft, so the stars stand where they were approved
    for (let i = 0; i < 80; i++) { const x = rnd() * 1200, y = rnd() * 250, r = .8 + rnd() * 1.5; stars += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#fff" opacity="${f1(.35 + rnd() * .6)}"/>`; }
    for (let i = 0; i < 11; i++) wins += `<rect x="${246 + i * 26}" y="246" width="12" height="20" rx="6" fill="#ffd98a"/>`;
    return wrap('l', grad('l-sky', [[0, '#101544'], [.5, '#2b3484'], [.82, '#6a58a8'], [1, '#d98aa0']]) + grad('l-sea', [[0, '#7a5a9a'], [.3, '#243a80'], [1, '#0d1840']]) + grad('l-beam', [[0, '#fff3c4', .75], [1, '#fff3c4', 0]], 1, 0) + grad('l-beam2', [[0, '#fff3c4', 0], [1, '#fff3c4', .75]], 1, 0),
      `<rect width="1200" height="300" fill="url(#l-sky)"/>${stars}<circle cx="1030" cy="196" r="30" fill="#fff6d6"/><circle cx="1017" cy="189" r="27" fill="#3a3f92"/>
      <rect y="292" width="1200" height="228" fill="url(#l-sea)"/><g class="glints" fill="#fff3c4" opacity=".35"><rect x="950" y="306" width="150" height="4" rx="2"/><rect x="980" y="324" width="96" height="4" rx="2"/><rect x="960" y="346" width="130" height="5" rx="2"/></g>
      <g class="beam" style="transform-origin:702px 190px"><path d="M702 190L1200 150V262Z" fill="url(#l-beam)"/><path d="M702 190L0 152V254Z" fill="url(#l-beam2)"/></g>
      <path d="M0 300V270Q120 244 220 266H560Q640 262 690 240Q740 228 770 254Q800 284 842 300Z" fill="#0c1238"/>
      <g fill="#141c52"><path d="M226 268V236H548V268Z"/><path d="M216 236H558L540 216H234Z"/><path d="M360 216Q387 178 414 216Z"/><path d="M387 188V168" stroke="#141c52" stroke-width="4"/></g>${wins}<circle cx="387" cy="204" r="6" fill="#ffd98a"/>
      <g><path d="M686 246L692 200H712L718 246Z" fill="#f4ead2"/><path d="M702 246V200H712L718 246Z" fill="#cfc3a3"/><path d="M688.500 230H715.500L714 216H690Z" fill="#c8324b"/><path d="M687 200H717V194H687Z" fill="#0c1238"/><rect x="692" y="178" width="20" height="16" fill="#ffe08a"/><path d="M692 178V194M702 178V194M712 178V194" stroke="#0c1238" stroke-width="2"/><path d="M688 178L702 164L716 178Z" fill="#0c1238"/><circle cx="702" cy="186" r="24" fill="#ffe08a" opacity=".4"/></g>
      <g fill="#0c1238"><path d="M900 286h120l-10 14H910Z"/><path d="M930 286v-12h24v-8h22v8h20v12Z"/></g><circle cx="942" cy="280" r="2.5" fill="#ffd98a"/><circle cx="984" cy="272" r="2.5" fill="#ffd98a"/>
      <path d="M0 414Q280 396 560 408T1200 402V520H0Z" fill="#070b26"/>${lamps(15, 408, '#ffe08a', 7, 4.5)}
      <g fill="#04071a"><rect x="0" y="448" width="1200" height="9"/><path d="M120 448v72h9v-72zM420 448v72h9v-72zM720 448v72h9v-72zM1020 448v72h9v-72z"/></g>`);
  }

  /* ── Fort Meridian under a heavy sky: the walls on the point, the guns laid on the Gate ── */
  function meridian() {
    const gun = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-112 -27L8 -15V2L-112 -11Z" fill="#241a3a"/><path d="M-112 -27L8 -15V-9L-112 -21Z" fill="#5a4a7a"/><path d="M-10 6Q-12 -24 22 -26Q50 -24 48 6Z" fill="#241a3a"/><rect x="-22" y="6" width="80" height="10" fill="#241a3a"/></g>`;
    let caps = '', teeth = '';
    for (let i = 0; i < 12; i++) caps += `<path d="M${40 + i * 44 + (i % 3) * 14} ${326 + (i % 4) * 14}q10 -7 20 0" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2.5"/>`;
    for (let i = 0; i < 16; i++) teeth += `<rect x="${610 + i * 38}" y="222" width="22" height="16" fill="#3a2a55"/>`;
    return wrap('m', grad('m-sky', [[0, '#2a2350'], [.45, '#6b4a7f'], [.78, '#e3766a'], [1, '#ffc27a']]) + grad('m-sea', [[0, '#c9706a'], [.3, '#4a5a8f'], [1, '#1c2a5a']]) + grad('m-wall', [[0, '#5a4a7a'], [1, '#33254f']]),
      `<rect width="1200" height="300" fill="url(#m-sky)"/><circle cx="250" cy="280" r="50" fill="#ffe9b0"/><circle cx="250" cy="280" r="104" fill="#ffe9b0" opacity=".25"/>
      <g fill="#1e1a44" opacity=".55"><path d="M0 70Q160 40 330 74Q470 50 640 86Q560 110 400 104Q200 120 0 104Z"/><path d="M520 150Q700 120 900 150Q1060 130 1200 158V190Q1000 170 820 186Q640 172 520 150Z"/></g>
      <g fill="#ffb38a" opacity=".5"><ellipse cx="180" cy="196" rx="140" ry="9"/><ellipse cx="420" cy="224" rx="110" ry="7"/></g>
      <rect y="292" width="1200" height="228" fill="url(#m-sea)"/>${caps}
      <g fill="#241a3a"><path d="M70 300h96l-8 12H80Z"/><path d="M96 300v-10h18v-8h20v8h14v10Z"/></g>
      <path d="M520 350Q560 300 640 296H1200V520H470Z" fill="#241a3a"/>
      <path d="M596 300L620 238H1200V300Z" fill="url(#m-wall)"/>${teeth}<path d="M620 238H1200" stroke="#7a6a9a" stroke-width="3"/>
      <g fill="#ffd98a"><rect x="700" y="262" width="16" height="22" rx="8"/><rect x="884" y="262" width="16" height="22" rx="8"/><rect x="1068" y="262" width="16" height="22" rx="8"/></g>
      <path d="M960 238V150H1052V238Z" fill="#3a2a55"/><path d="M952 150h14v-14h16v14h16v-14h16v14h16v-14h16v14h14v10H952Z" fill="#33254f"/><rect x="996" y="178" width="18" height="28" rx="9" fill="#ffd98a"/>
      <path d="M1006 136V70" stroke="#241a3a" stroke-width="4"/><path d="M1006 70l52 10l-52 14Z" fill="#d7263d"/>
      ${gun(740, 228, 1)}${gun(890, 226, .9)}${gun(660, 300, 1.25)}
      <path d="M0 418Q260 400 540 412T1200 404V520H0Z" fill="#150f2a"/>${lamps(13, 410, '#ffb38a', 6, 4.5)}
      <g fill="#0c081c"><rect x="0" y="450" width="1200" height="9"/><path d="M200 450v70h9v-70zM520 450v70h9v-70zM840 450v70h9v-70z"/></g>`);
  }

  /* ── The Admiralty at the blue hour: the long front under its dome, every window lit, the fleet dressed overall ── */
  function admiralty() {
    let cols = '', wins = '', city = '', bunting = '';
    for (let i = 0; i < 24; i++) { const x = 340 + i * 22; if (i > 9 && i < 14) continue; cols += `<rect x="${x}" y="246" width="8" height="46" fill="#f4ead2"/>`; wins += `<rect x="${x + 11}" y="256" width="8" height="26" rx="4" fill="#ffd98a"/>`; }
    for (let i = 0; i < 6; i++) cols += `<rect x="${556 + i * 16}" y="232" width="8" height="60" fill="#fffaf0"/>`;
    [[16, 258, 46], [66, 244, 40], [110, 264, 52], [166, 250, 44], [216, 268, 60], [276, 256, 46], [884, 256, 54], [942, 244, 44], [990, 264, 56], [1050, 250, 46], [1100, 268, 50], [1154, 248, 50]].forEach(([x, y, w], i) => {
      city += `<path d="M${x} 300V${y}H${x + w}V300Z" fill="#16255c"/>` + (i % 3 === 1 ? `<path d="M${x + w / 2 - 7} ${y}L${x + w / 2} ${y - 44}L${x + w / 2 + 7} ${y}Z" fill="#16255c"/>` : `<path d="M${x - 4} ${y}L${x + w / 2} ${y - 15}L${x + w + 4} ${y}Z" fill="#101c4a"/>`);
      for (let k = 0; k < 2; k++) city += `<rect x="${x + 8 + k * (w - 24)}" y="${y + 11}" width="7" height="10" fill="#ffd98a" opacity=".85"/>`;
    });
    ['#d7263d', '#ffd45c', '#fff6e0', '#2f6fd0', '#d7263d', '#ffd45c', '#fff6e0', '#2f6fd0', '#d7263d', '#ffd45c'].forEach((c, i) => { const x = 106 + i * 22, y = 236 + i * 6.8; bunting += `<path d="M${x} ${f1(y)}l8 12l-13 -3Z" fill="${c}"/>`; });
    return wrap('a', grad('a-sky', [[0, '#101a52'], [.5, '#2f4fa8'], [.8, '#8f8fd0'], [1, '#ffcf9a']]) + grad('a-sea', [[0, '#8a7ab8'], [.3, '#243f8f'], [1, '#0c1a4a']]),
      `<rect width="1200" height="300" fill="url(#a-sky)"/><g fill="#fff" opacity=".8"><circle cx="110" cy="60" r="1.6"/><circle cx="300" cy="186" r="1.2"/><circle cx="470" cy="176" r="1.8"/><circle cx="820" cy="190" r="1.4"/><circle cx="1010" cy="180" r="1.8"/><circle cx="1130" cy="200" r="1.2"/><circle cx="760" cy="110" r="1.2"/><circle cx="200" cy="206" r="1.4"/></g>
      <g fill="#c9c0f0" opacity=".35"><ellipse cx="240" cy="204" rx="150" ry="8"/><ellipse cx="960" cy="214" rx="130" ry="7"/></g>${city}
      <g><path d="M324 300V242H876V300Z" fill="#1c2f7a"/>${wins}${cols}<path d="M316 246H884V236H316Z" fill="#fffaf0"/><path d="M546 236H654L600 210Z" fill="#f4ead2"/><path d="M538 236H662V229H538Z" fill="#fffaf0"/>
        <path d="M570 214V198H630V214Z" fill="#f4ead2"/><path d="M564 198Q600 150 636 198Z" fill="#e2b04a"/><path d="M576 198Q600 164 624 198Z" fill="#f6dc8a" opacity=".6"/><path d="M600 166V134" stroke="#f4ead2" stroke-width="3"/><path d="M600 134l30 6l-30 9Z" fill="#d7263d"/>
        <path d="M316 300V290H884V300Z" fill="#fffaf0"/><rect x="590" y="252" width="20" height="38" rx="10" fill="#ffd98a"/></g>
      <rect y="298" width="1200" height="222" fill="url(#a-sea)"/><g class="glints" fill="#ffd98a" opacity=".3"><rect x="420" y="308" width="360" height="5" rx="2"/><rect x="470" y="326" width="260" height="5" rx="2"/><rect x="520" y="346" width="160" height="6" rx="3"/></g>
      <g fill="#0c1640"><path d="M60 322h250l-22 30H88z"/><path d="M120 322v-22h40v-18h46v18h50v22z"/><path d="M180 282v-44M166 254h30" stroke="#0c1640" stroke-width="4" fill="none"/><path d="M100 322L104 236L330 304" stroke="#0c1640" stroke-width="2" fill="none"/>
        <path d="M900 334h200l-18 26H922z"/><path d="M950 334v-18h34v-14h38v14h34v18z"/><path d="M1004 302v-34" stroke="#0c1640" stroke-width="4"/></g>${bunting}
      <path d="M0 416Q260 398 540 410T1200 404V520H0Z" fill="#080f33"/>${lamps(17, 408, '#ffe08a', 7, 4.5)}
      <g fill="#050a24"><rect x="0" y="448" width="1200" height="9"/><path d="M80 448v72h9v-72zM380 448v72h9v-72zM680 448v72h9v-72zM980 448v72h9v-72z"/></g>`);
  }

  const all = { halcyon: sceneHalcyon, kestrel, ironwood, lantern, meridian, admiralty }, made = {};
  /** the scene of a station, drawn once and kept */
  return id => made[id] || (made[id] = (all[id] || sceneHalcyon)());
})();
const scene = id => Scenes(id);
