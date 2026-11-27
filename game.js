'use strict';
/*
 * Pocket Town: a pretend-play sandbox.
 * The world is 3000 x 700 units, three 1000-unit rooms side by side.
 * Every entity is positioned by its bottom-centre point (x, y).
 */
(() => {
  const W = 3000, H = 700;
  const FLOOR_MIN = 565, FLOOR_MAX = 685;   // the walkable floor band (gives depth)
  const GRAV = 1.3, MAX_ITEMS = 45;
  const SAVE_KEY = 'pocket-town-save-v1';
  const MUTE_KEY = 'pocket-town-muted';

  const $ = (s) => document.querySelector(s);
  const world = $('#world');
  const stage = $('#stage');
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const svg = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

  /* ================= Art ================= */

  const ART = {};
  const item = (kind, w, h, body, props = {}) => { ART[kind] = { w, h, svg: svg(w, h, body), ...props }; };

  const PEOPLE = {
    pip:  { skin: '#ffd7b5', hair: '#ff8a3d', style: 'tuft',     shirt: '#4aa3ff', pants: '#34455e' },
    mo:   { skin: '#8d5a3b', hair: '#2b1a10', style: 'curly',    shirt: '#ffd23f', pants: '#5b4bb7' },
    juno: { skin: '#f1c27d', hair: '#3b2a1a', style: 'pigtails', shirt: '#ff7eb6', pants: '#2f9e78' },
    bo:   { skin: '#c68642', hair: '#151515', style: 'bun',      shirt: '#7b5cff', pants: '#ff8a3d' },
  };

  function personSVG(c) {
    const hairBack = c.style === 'pigtails'
      ? `<circle cx="9" cy="66" r="17" fill="${c.hair}"/><circle cx="111" cy="66" r="17" fill="${c.hair}"/>`
      : c.style === 'bun' ? `<circle cx="60" cy="12" r="17" fill="${c.hair}"/>` : '';
    const hairFront = {
      tuft: `<path d="M16 58 Q14 12 60 14 Q106 12 104 58 Q92 32 60 34 Q28 32 16 58Z" fill="${c.hair}"/><path d="M56 16 Q62 0 76 4 Q64 8 64 18Z" fill="${c.hair}"/>`,
      curly: [[22, 46, 16], [34, 28, 17], [52, 18, 18], [70, 18, 18], [88, 28, 17], [100, 46, 16]]
        .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.hair}"/>`).join(''),
      pigtails: `<path d="M14 62 Q12 14 60 14 Q108 14 106 62 Q96 36 60 30 Q24 36 14 62Z" fill="${c.hair}"/>`,
      bun: `<path d="M16 56 Q16 14 60 16 Q104 14 104 56 Q60 26 16 56Z" fill="${c.hair}"/>`,
    }[c.style];
    return svg(120, 220, `
      <rect x="38" y="176" width="18" height="38" rx="8" fill="${c.pants}"/>
      <rect x="64" y="176" width="18" height="38" rx="8" fill="${c.pants}"/>
      <ellipse cx="45" cy="214" rx="14" ry="6" fill="#3a3346"/><ellipse cx="75" cy="214" rx="14" ry="6" fill="#3a3346"/>
      <rect x="12" y="110" width="18" height="56" rx="9" fill="${c.shirt}"/><circle cx="21" cy="168" r="9" fill="${c.skin}"/>
      <rect x="90" y="110" width="18" height="56" rx="9" fill="${c.shirt}"/><circle cx="99" cy="168" r="9" fill="${c.skin}"/>
      <rect x="26" y="100" width="68" height="88" rx="26" fill="${c.shirt}"/>
      <rect x="26" y="160" width="68" height="28" rx="12" fill="${c.pants}"/>
      ${hairBack}
      <circle cx="15" cy="66" r="9" fill="${c.skin}"/><circle cx="105" cy="66" r="9" fill="${c.skin}"/>
      <circle cx="60" cy="62" r="46" fill="${c.skin}"/>
      ${hairFront}
      <g class="eyes"><ellipse cx="43" cy="64" rx="5.5" ry="7.5" fill="#2b2433"/><ellipse cx="77" cy="64" rx="5.5" ry="7.5" fill="#2b2433"/>
        <circle cx="45" cy="61" r="2" fill="#fff"/><circle cx="79" cy="61" r="2" fill="#fff"/></g>
      <circle cx="32" cy="80" r="7" fill="#ff8ab0" opacity=".45"/><circle cx="88" cy="80" r="7" fill="#ff8ab0" opacity=".45"/>
      <path class="m-smile" d="M48 84 Q60 96 72 84" stroke="#2b2433" stroke-width="4" fill="none" stroke-linecap="round"/>
      <ellipse class="m-open" cx="60" cy="88" rx="9" ry="10" fill="#8a2f3a"/>`);
  }

  for (const [name, c] of Object.entries(PEOPLE)) {
    ART['kid-' + name] = {
      w: 120, h: 220, svg: personSVG(c), char: true,
      slots: { head: { x: 0, y: -204 }, mouth: { x: 0, y: -132 }, hand: { x: 39, y: -52 } },
    };
  }

  const CAT = '#f4a04a';
  ART.cat = {
    w: 120, h: 110, char: true,
    slots: { head: { x: -20, y: -95 }, mouth: { x: -20, y: -50 } },
    svg: svg(120, 110, `
      <path d="M98 74 Q122 54 110 28" stroke="${CAT}" stroke-width="11" fill="none" stroke-linecap="round"/>
      <rect x="46" y="86" width="13" height="22" rx="6" fill="${CAT}"/><rect x="62" y="88" width="13" height="20" rx="6" fill="#e08a35"/>
      <rect x="82" y="88" width="13" height="20" rx="6" fill="#e08a35"/><rect x="96" y="86" width="13" height="22" rx="6" fill="${CAT}"/>
      <ellipse cx="74" cy="78" rx="38" ry="24" fill="${CAT}"/>
      <path d="M64 58 q6 10 0 20 M80 56 q6 12 0 24" stroke="#e08a35" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M14 32 L18 4 L36 20Z" fill="${CAT}"/><path d="M66 32 L62 4 L44 20Z" fill="${CAT}"/>
      <path d="M19 26 L21 12 L30 21Z" fill="#ffb3c7"/><path d="M61 26 L59 12 L50 21Z" fill="#ffb3c7"/>
      <circle cx="40" cy="45" r="30" fill="${CAT}"/>
      <g class="eyes"><circle cx="30" cy="42" r="4.5" fill="#2b2433"/><circle cx="50" cy="42" r="4.5" fill="#2b2433"/></g>
      <path d="M36 51 L44 51 L40 56Z" fill="#ff8ab0"/>
      <path class="m-smile" d="M33 58 Q36.5 62 40 58 Q43.5 62 47 58" stroke="#2b2433" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse class="m-open" cx="40" cy="61" rx="6" ry="6" fill="#8a2f3a"/>
      <path d="M22 53 H5 M22 57 L7 62 M58 53 H75 M58 57 L73 62" stroke="#7a5a3a" stroke-width="1.6" stroke-linecap="round"/>`),
  };

  // Food (can be eaten)
  item('apple', 44, 48, `<path d="M22 12 C10 4 0 14 2 26 C4 40 14 48 22 44 C30 48 40 40 42 26 C44 14 34 4 22 12Z" fill="#ef4b4b"/><path d="M22 12 Q23 4 27 1" stroke="#6b3e1f" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M24 8 Q32 1 37 7 Q30 12 24 8Z" fill="#5cb85c"/><ellipse cx="13" cy="22" rx="4" ry="7" fill="#fff" opacity=".4"/>`, { food: true });
  item('banana', 64, 40, `<path d="M8 10 Q10 34 34 36 Q54 36 60 22 Q50 28 34 26 Q16 24 14 8Z" fill="#ffd23f" stroke="#e0a800" stroke-width="2" stroke-linejoin="round"/><path d="M8 10 L6 3 L14 6Z" fill="#6b4f1d"/>`, { food: true });
  item('milk', 40, 66, `<path d="M6 20 L20 6 L34 20 V62 H6Z" fill="#fff" stroke="#c9d6e3" stroke-width="2"/><rect x="14" y="0" width="12" height="8" fill="#4aa3ff"/><rect x="6" y="32" width="28" height="18" fill="#4aa3ff"/><circle cx="20" cy="41" r="5" fill="#fff"/>`, { food: true });
  item('cheese', 54, 40, `<path d="M2 38 L2 18 L52 4 L52 38Z" fill="#ffc94a" stroke="#e8a92c" stroke-width="2" stroke-linejoin="round"/><path d="M2 18 L52 4 L52 12 L2 24Z" fill="#ffdd7a"/><circle cx="16" cy="30" r="4" fill="#e8a92c"/><circle cx="36" cy="25" r="5" fill="#e8a92c"/><circle cx="45" cy="33" r="3" fill="#e8a92c"/>`, { food: true });
  item('carrot', 30, 64, `<path d="M8 18 L22 18 L15 62Z" fill="#ff8a1f" stroke-linejoin="round"/><path d="M15 18 Q8 6 4 2 M15 18 Q15 4 15 0 M15 18 Q22 6 26 2" stroke="#4caf50" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M11 28 h5 M12 38 h4 M14 48 h3" stroke="#d96a00" stroke-width="2"/>`, { food: true });
  item('juice', 36, 58, `<rect x="4" y="12" width="28" height="44" rx="5" fill="#ff9f43"/><rect x="4" y="12" width="28" height="10" fill="#ffd166"/><path d="M24 12 L28 0" stroke="#ff5d8f" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="38" r="7" fill="#fff" opacity=".75"/><circle cx="18" cy="38" r="4" fill="#ff9f43"/>`, { food: true });
  item('cake', 60, 54, `<rect x="4" y="22" width="52" height="30" rx="6" fill="#ffb3c7"/><path d="M4 30 Q10 38 17 30 Q24 38 30 30 Q37 38 43 30 Q50 38 56 30 V26 H4Z" fill="#fff"/><rect x="27" y="7" width="6" height="16" rx="2" fill="#7ec8ff"/><path d="M30 0 Q35 4 30 8 Q25 4 30 0Z" fill="#ffb020"/><circle cx="14" cy="42" r="3" fill="#ff5d8f"/><circle cx="30" cy="44" r="3" fill="#ff5d8f"/><circle cx="46" cy="42" r="3" fill="#ff5d8f"/>`, { food: true });
  item('cookie', 44, 44, `<circle cx="22" cy="22" r="20" fill="#d9a05b" stroke="#b97a35" stroke-width="2"/><circle cx="14" cy="16" r="3" fill="#5a3416"/><circle cx="28" cy="13" r="3" fill="#5a3416"/><circle cx="25" cy="28" r="3" fill="#5a3416"/><circle cx="13" cy="29" r="2.5" fill="#5a3416"/><circle cx="33" cy="23" r="2" fill="#5a3416"/>`, { food: true });

  // Toys
  item('teddy', 66, 76, `<circle cx="15" cy="14" r="11" fill="#b5763c"/><circle cx="51" cy="14" r="11" fill="#b5763c"/><circle cx="15" cy="14" r="5" fill="#e8b98a"/><circle cx="51" cy="14" r="5" fill="#e8b98a"/><ellipse cx="33" cy="58" rx="22" ry="18" fill="#b5763c"/><ellipse cx="33" cy="60" rx="10" ry="9" fill="#e8b98a"/><ellipse cx="14" cy="70" rx="8" ry="6" fill="#c98a4b"/><ellipse cx="52" cy="70" rx="8" ry="6" fill="#c98a4b"/><circle cx="33" cy="28" r="21" fill="#c98a4b"/><ellipse cx="33" cy="35" rx="9" ry="7" fill="#e8b98a"/><circle cx="33" cy="32" r="3" fill="#3a2414"/><circle cx="25" cy="25" r="3" fill="#3a2414"/><circle cx="41" cy="25" r="3" fill="#3a2414"/>`);
  item('ball', 50, 50, `<circle cx="25" cy="25" r="23" fill="#4aa3ff"/><path d="M2 25 H48" stroke="#fff" stroke-width="6"/><path d="M25 2 Q12 25 25 48" stroke="#ffd23f" stroke-width="6" fill="none"/><circle cx="17" cy="14" r="4" fill="#fff" opacity=".5"/>`);
  item('duck', 54, 46, `<ellipse cx="31" cy="32" rx="22" ry="13" fill="#ffd23f"/><circle cx="19" cy="17" r="12" fill="#ffd23f"/><path d="M9 14 L0 19 L9 23Z" fill="#ff8a1f"/><circle cx="17" cy="14" r="2.5" fill="#2b2433"/><path d="M28 28 Q40 22 47 32 Q36 38 28 28Z" fill="#f2b705"/>`);
  item('book', 54, 42, `<rect x="2" y="6" width="50" height="34" rx="3" fill="#5a3fd6"/><rect x="6" y="3" width="44" height="34" rx="2" fill="#fff"/><rect x="2" y="2" width="48" height="34" rx="3" fill="#9b7bff"/><rect x="14" y="10" width="26" height="6" rx="3" fill="#fff" opacity=".85"/><circle cx="27" cy="25" r="5" fill="#ffd23f"/>`);
  item('flower', 34, 64, `<path d="M17 30 V64" stroke="#3fa34d" stroke-width="4"/><path d="M17 50 Q6 44 4 36 Q14 38 17 50Z" fill="#5cc96b"/><g fill="#ff7eb6"><circle cx="17" cy="8" r="8"/><circle cx="28" cy="16" r="8"/><circle cx="24" cy="28" r="8"/><circle cx="10" cy="28" r="8"/><circle cx="6" cy="16" r="8"/></g><circle cx="17" cy="18" r="6" fill="#ffd23f"/>`);

  // Things to wear (wear = how far the item sinks onto the head)
  item('partyhat', 50, 60, `<path d="M25 2 L48 56 Q25 64 2 56Z" fill="#ff5d8f" stroke-linejoin="round"/><path d="M15 30 L35 30 M9 44 L41 44" stroke="#ffd23f" stroke-width="5"/><circle cx="25" cy="4" r="6" fill="#7ec8ff"/>`, { wear: 12 });
  item('crown', 70, 44, `<path d="M4 40 L4 10 L20 24 L35 4 L50 24 L66 10 L66 40Z" fill="#ffc83d" stroke="#e09b00" stroke-width="3" stroke-linejoin="round"/><circle cx="35" cy="30" r="5" fill="#ff5d8f"/><circle cx="18" cy="32" r="3.5" fill="#4aa3ff"/><circle cx="52" cy="32" r="3.5" fill="#4aa3ff"/>`, { wear: 14 });
  item('cap', 96, 40, `<path d="M14 36 Q14 2 50 2 Q86 2 86 36Z" fill="#3fbf8f"/><path d="M60 33 H96 Q94 40 60 40Z" fill="#2a9a70"/><circle cx="50" cy="5" r="4" fill="#2a9a70"/>`, { wear: 16 });
  item('bow', 64, 34, `<path d="M32 17 L4 2 Q0 17 4 32Z" fill="#ff5d8f" stroke-linejoin="round"/><path d="M32 17 L60 2 Q64 17 60 32Z" fill="#ff5d8f" stroke-linejoin="round"/><circle cx="32" cy="17" r="7" fill="#ff8ab0"/>`, { wear: 6 });

  const FOODS = ['apple', 'banana', 'milk', 'cheese', 'carrot', 'juice'];
  const BAKES = ['cake', 'cookie', 'cookie'];
  const HATS = ['partyhat', 'crown', 'cap', 'bow'];
  const TOYS = ['teddy', 'ball', 'duck', 'book'];

  /* ================= Furniture & decoration ================= */
  // Coordinates are world units: x/y is the top-left corner.
  const FURN = [
    // ---- Bedroom (room 0)
    { room: 0, deco: true, x: 120, y: 110, w: 200, h: 170, svg: `<rect width="200" height="170" rx="12" fill="#fff"/><rect x="10" y="10" width="180" height="150" rx="6" fill="#9fd8ff"/><circle cx="140" cy="52" r="18" fill="#fff6a8"/><path d="M100 10 V160 M10 85 H190" stroke="#fff" stroke-width="8"/><path d="M0 0 H44 Q22 80 32 170 H0Z" fill="#ff9fb8"/><path d="M200 0 H156 Q178 80 168 170 H200Z" fill="#ff9fb8"/>` },
    { room: 0, deco: true, x: 640, y: 80, w: 130, h: 110, svg: `<rect width="130" height="110" rx="8" fill="#ffd23f"/><rect x="10" y="10" width="110" height="90" rx="4" fill="#fff"/><path d="M65 26 L73 46 L95 47 L78 60 L84 82 L65 70 L46 82 L52 60 L35 47 L57 46Z" fill="#ff7eb6"/>` },
    { room: 0, deco: true, x: 250, y: 592, w: 320, h: 60, svg: `<ellipse cx="160" cy="30" rx="160" ry="30" fill="#b6a3ff"/><ellipse cx="160" cy="30" rx="120" ry="20" fill="#d3c7ff"/>` },
    { room: 0, id: 'wardrobe', action: 'wardrobe', x: 60, y: 220, w: 180, h: 330,
      surfaces: [{ x1: 66, x2: 234, top: 220 }],
      svg: `<rect width="180" height="320" rx="14" fill="#c98a4b"/><rect x="10" y="12" width="76" height="290" rx="8" fill="#e0a868"/><rect x="94" y="12" width="76" height="290" rx="8" fill="#e0a868"/><circle cx="76" cy="160" r="6" fill="#7a4a1f"/><circle cx="104" cy="160" r="6" fill="#7a4a1f"/><path d="M48 66 c-8-10 -22 0 0 16 c22-16 8-26 0-16z" fill="#ff9fb8"/><path d="M132 66 c-8-10 -22 0 0 16 c22-16 8-26 0-16z" fill="#ff9fb8"/><rect x="14" y="316" width="20" height="14" fill="#7a4a1f"/><rect x="146" y="316" width="20" height="14" fill="#7a4a1f"/>` },
    { room: 0, id: 'toybox', action: 'toybox', x: 320, y: 474, w: 150, h: 96,
      surfaces: [{ x1: 326, x2: 464, top: 480 }],
      svg: `<rect y="18" width="150" height="78" rx="10" fill="#ff7eb6"/><circle cx="40" cy="58" r="12" fill="#ffd23f"/><path d="M75 44 L86 68 H64Z" fill="#7ec8ff"/><rect x="100" y="47" width="22" height="22" rx="4" fill="#3fbf8f"/><rect class="lid" y="4" width="150" height="20" rx="8" fill="#ff5d8f"/>` },
    { room: 0, id: 'bed', x: 560, y: 400, w: 360, h: 170,
      surfaces: [{ x1: 572, x2: 905, top: 470, tag: 'bed' }],
      svg: `<rect x="300" width="56" height="170" rx="20" fill="#7b5cff"/><rect y="40" width="22" height="130" rx="8" fill="#7b5cff"/><rect x="8" y="70" width="344" height="62" rx="16" fill="#fff"/><rect x="240" y="46" width="70" height="36" rx="15" fill="#fff" stroke="#e4defa" stroke-width="3"/><rect x="8" y="96" width="290" height="50" rx="14" fill="#ffd23f"/><path d="M14 112 H292" stroke="#ffb020" stroke-width="4" stroke-dasharray="10 10"/><rect x="10" y="140" width="340" height="16" rx="6" fill="#5a3fd6"/><rect x="16" y="150" width="16" height="20" fill="#5a3fd6"/><rect x="326" y="150" width="16" height="20" fill="#5a3fd6"/>` },
    { room: 0, id: 'shelf', x: 640, y: 230, w: 200, h: 24,
      surfaces: [{ x1: 646, x2: 834, top: 230 }],
      svg: `<rect width="200" height="14" rx="4" fill="#c98a4b"/><path d="M24 14 L34 24 M176 14 L166 24" stroke="#7a4a1f" stroke-width="5" stroke-linecap="round"/>` },
    { room: 0, id: 'lamp0', action: 'lamp', x: 440, y: 0, w: 100, h: 160,
      svg: `<path d="M50 0 V72" stroke="#5a4a6b" stroke-width="3"/><ellipse class="glow" cx="50" cy="128" rx="54" ry="32" fill="#fff6a8" opacity=".55"/><path d="M18 112 Q50 48 82 112Z" fill="#ffd23f"/><circle class="bulb" cx="50" cy="114" r="10" fill="#fff6a8"/>` },

    // ---- Kitchen (room 1)
    { room: 1, deco: true, x: 1300, y: 100, w: 180, h: 150, svg: `<rect width="180" height="150" rx="12" fill="#fff"/><rect x="10" y="10" width="160" height="130" rx="6" fill="#9fd8ff"/><path d="M90 10 V140 M10 75 H170" stroke="#fff" stroke-width="8"/><path d="M0 0 H180 V26 Q135 46 90 26 Q45 46 0 26Z" fill="#ff9f43"/>` },
    { room: 1, deco: true, x: 1870, y: 150, w: 100, h: 100, svg: `<circle cx="50" cy="50" r="48" fill="#ff7eb6"/><circle cx="50" cy="50" r="38" fill="#fff"/><path d="M50 50 V22 M50 50 H70" stroke="#4a3a6b" stroke-width="6" stroke-linecap="round"/><circle cx="50" cy="50" r="5" fill="#4a3a6b"/>` },
    { room: 1, id: 'fridge', action: 'fridge', x: 1060, y: 230, w: 170, h: 330,
      surfaces: [{ x1: 1066, x2: 1224, top: 230 }],
      svg: `<rect width="170" height="326" rx="20" fill="#d7ecf8"/><rect x="2" y="2" width="166" height="106" rx="18" fill="#e9f6ff" stroke="#bcd8ea" stroke-width="4"/><rect x="140" y="36" width="10" height="50" rx="5" fill="#9cc3dc"/><g class="door"><rect x="2" y="112" width="166" height="212" rx="18" fill="#e9f6ff" stroke="#bcd8ea" stroke-width="4"/><rect x="140" y="140" width="10" height="80" rx="5" fill="#9cc3dc"/><circle cx="42" cy="160" r="11" fill="#ff5d8f"/><rect x="62" y="180" width="32" height="26" rx="3" fill="#ffd23f" transform="rotate(-8 78 193)"/><circle cx="50" cy="240" r="9" fill="#4aa3ff"/></g>` },
    { room: 1, id: 'counter', action: 'oven', x: 1250, y: 400, w: 320, h: 160,
      surfaces: [{ x1: 1256, x2: 1440, top: 400 }, { x1: 1520, x2: 1564, top: 400 }],
      svg: `<rect x="192" y="-8" width="80" height="8" rx="3" fill="#3a3346"/><rect x="200" y="-38" width="64" height="32" rx="8" fill="#ff5d5d"/><rect x="190" y="-40" width="84" height="9" rx="4" fill="#e04040"/><rect width="320" height="18" rx="6" fill="#ff9f43"/><rect x="6" y="18" width="308" height="142" fill="#fff3e0"/><rect x="20" y="34" width="130" height="112" rx="8" fill="#ffd8a8"/><circle cx="136" cy="90" r="5" fill="#c98a4b"/><rect x="170" y="34" width="130" height="104" rx="10" fill="#555b66"/><rect x="182" y="60" width="106" height="64" rx="8" fill="#ffb84d" opacity=".9"/><circle cx="194" cy="46" r="5" fill="#ff5d5d"/><circle cx="214" cy="46" r="5" fill="#ffd23f"/>` },
    { room: 1, id: 'table', x: 1640, y: 440, w: 280, h: 130,
      surfaces: [{ x1: 1646, x2: 1914, top: 440 }],
      svg: `<rect x="24" y="20" width="16" height="110" rx="4" fill="#2a9a70"/><rect x="240" y="20" width="16" height="110" rx="4" fill="#2a9a70"/><rect width="280" height="20" rx="8" fill="#3fbf8f"/><path d="M6 16 H274 V36 Q256 48 240 36 Q222 48 206 36 Q188 48 172 36 Q154 48 140 36 Q122 48 106 36 Q88 48 72 36 Q54 48 40 36 Q22 48 6 36Z" fill="#fff"/>` },
    { room: 1, id: 'lamp1', action: 'lamp', x: 1730, y: 0, w: 100, h: 160,
      svg: `<path d="M50 0 V72" stroke="#5a4a6b" stroke-width="3"/><ellipse class="glow" cx="50" cy="128" rx="54" ry="32" fill="#fff6a8" opacity=".55"/><path d="M18 112 Q50 48 82 112Z" fill="#3fbf8f"/><circle class="bulb" cx="50" cy="114" r="10" fill="#fff6a8"/>` },

    // ---- Garden (room 2)
    { room: 2, deco: true, cls: 'cloud', x: 2120, y: 50, w: 180, h: 70, svg: `<g fill="#fff"><circle cx="50" cy="44" r="26"/><circle cx="90" cy="30" r="30"/><circle cx="130" cy="44" r="24"/><rect x="40" y="40" width="100" height="30" rx="15"/></g>` },
    { room: 2, deco: true, cls: 'cloud', x: 2500, y: 120, w: 140, h: 56, svg: `<g fill="#fff" opacity=".9"><circle cx="40" cy="34" r="20"/><circle cx="72" cy="24" r="24"/><circle cx="102" cy="34" r="18"/><rect x="30" y="30" width="80" height="24" rx="12"/></g>` },
    { room: 2, deco: true, x: 2000, y: 420, w: 1000, h: 110, svg: `<g fill="#fff">${Array.from({ length: 21 }, (_, i) => `<path d="M${i * 50 + 10} 110 V22 L${i * 50 + 25} 6 L${i * 50 + 40} 22 V110Z"/>`).join('')}<rect y="40" width="1000" height="10"/><rect y="78" width="1000" height="10"/></g>` },
    { room: 2, id: 'sun', action: 'sun', x: 2790, y: 40, w: 130, h: 130,
      svg: `<g class="sunface"><g class="rays" stroke="#ffd23f" stroke-width="8" stroke-linecap="round">${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<path d="M${65 + Math.cos(a) * 50} ${65 + Math.sin(a) * 50} L${65 + Math.cos(a) * 62} ${65 + Math.sin(a) * 62}"/>`; }).join('')}</g><circle cx="65" cy="65" r="40" fill="#ffd23f"/><circle cx="52" cy="60" r="4" fill="#b37a00"/><circle cx="78" cy="60" r="4" fill="#b37a00"/><path d="M52 76 Q65 86 78 76" stroke="#b37a00" stroke-width="4" fill="none" stroke-linecap="round"/></g><g class="moon"><circle cx="65" cy="65" r="38" fill="#fff6c9"/><circle cx="82" cy="54" r="32" fill="#2a2a6e"/></g>` },
    { room: 2, id: 'tree', action: 'tree', x: 2060, y: 140, w: 320, h: 430,
      svg: `<path d="M136 430 Q140 300 150 220 H174 Q182 300 188 430Z" fill="#9a6232"/><circle cx="80" cy="170" r="70" fill="#4cb85b"/><circle cx="240" cy="170" r="70" fill="#4cb85b"/><circle cx="160" cy="130" r="110" fill="#5cc96b"/><circle cx="160" cy="70" r="70" fill="#6fd67c"/><g fill="#ef4b4b"><circle cx="100" cy="130" r="12"/><circle cx="200" cy="90" r="12"/><circle cx="230" cy="180" r="12"/><circle cx="140" cy="200" r="12"/><circle cx="70" cy="200" r="11"/></g>` },
    { room: 2, id: 'bench', x: 2460, y: 440, w: 240, h: 130,
      surfaces: [{ x1: 2468, x2: 2692, top: 480 }],
      svg: `<rect x="30" y="0" width="12" height="60" fill="#8a5a2b"/><rect x="198" y="0" width="12" height="60" fill="#8a5a2b"/><rect x="0" y="2" width="240" height="14" rx="6" fill="#ff9f43"/><rect x="0" y="22" width="240" height="14" rx="6" fill="#ff9f43"/><rect x="0" y="40" width="240" height="16" rx="6" fill="#e8862a"/><rect x="18" y="56" width="14" height="74" rx="4" fill="#8a5a2b"/><rect x="208" y="56" width="14" height="74" rx="4" fill="#8a5a2b"/>` },
    { room: 2, id: 'bush', action: 'bush', x: 2760, y: 470, w: 190, h: 100,
      svg: `<circle cx="50" cy="60" r="42" fill="#4cb85b"/><circle cx="140" cy="60" r="44" fill="#4cb85b"/><circle cx="95" cy="46" r="50" fill="#5cc96b"/><g fill="#ff7eb6"><circle cx="60" cy="40" r="8"/><circle cx="110" cy="26" r="8"/><circle cx="150" cy="52" r="8"/></g><g fill="#ffd23f"><circle cx="90" cy="60" r="7"/><circle cx="40" cy="70" r="7"/><circle cx="130" cy="78" r="7"/></g>` },
  ];

  const surfaces = [];
  const furnById = {};

  /* ================= State ================= */
  const ents = [];
  const rooms = [{ dark: false }, { dark: false }, { dark: false }];
  let nextId = 1;
  let scale = 1, offY = 0, camX = 0, camTarget = null;
  const pointers = new Map();
  const byId = (id) => ents.find((e) => e.id === +id);

  /* ================= Sound (synthesised, no files needed) ================= */
  let actx = null;
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (_) { /* storage blocked */ }

  function audio() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return; }
    }
    if (actx.state === 'suspended') actx.resume();
    startMusic();
  }
  function tone(f, dur, type = 'sine', vol = 0.16, f2 = null, delay = 0) {
    if (!actx || muted) return;
    const t = actx.currentTime + delay;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  let lastLand = 0;
  const sfx = {
    pick: () => tone(480, 0.09, 'sine', 0.14, 900),
    land: () => { const n = performance.now(); if (n - lastLand > 90) { lastLand = n; tone(210, 0.12, 'triangle', 0.16, 110); } },
    chomp: () => { for (let i = 0; i < 3; i++) tone(260 - i * 30, 0.07, 'square', 0.05, 140, i * 0.13); },
    sparkle: () => [880, 1175, 1568].forEach((f, i) => tone(f, 0.2, 'sine', 0.09, null, i * 0.07)),
    spawn: () => tone(330, 0.16, 'sine', 0.14, 880),
    click: () => tone(1400, 0.04, 'square', 0.05),
    ding: () => { tone(1320, 0.5, 'sine', 0.1); tone(1760, 0.4, 'sine', 0.05, null, 0.05); },
    giggle: () => [700, 900, 760, 980].forEach((f, i) => tone(f, 0.07, 'sine', 0.08, f * 1.2, i * 0.07)),
    meow: () => tone(700, 0.35, 'sawtooth', 0.04, 420),
  };

  /* ================= Background music =================
   * Public-domain classical melodies played on a soft synthesised music box.
   * Notes are written "Name+octave:beats", e.g. "F#5:.5"; "-" is a rest.
   */
  const seq = (s) => s.trim().split(/\s+/).map((t) => { const [n, d] = t.split(':'); return [n === '-' ? null : n, +d]; });
  const freq = (n) => {
    const m = /^([A-G])([#b]?)(\d)$/.exec(n);
    const semi = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (semi + (+m[3] + 1) * 12 - 69) / 12);
  };
  const twice = (s) => s + ' ' + s;

  const PIECES = [
    { // Mozart: theme of the "Ah vous dirai-je, maman" variations (Twinkle Twinkle)
      bpm: 100,
      melody: seq(`C5:1 C5:1 G5:1 G5:1 A5:1 A5:1 G5:2 F5:1 F5:1 E5:1 E5:1 D5:1 D5:1 C5:2
                   G5:1 G5:1 F5:1 F5:1 E5:1 E5:1 D5:2 G5:1 G5:1 F5:1 F5:1 E5:1 E5:1 D5:2
                   C5:1 C5:1 G5:1 G5:1 A5:1 A5:1 G5:2 F5:1 F5:1 E5:1 E5:1 D5:1 D5:1 C5:2`),
      bass: seq(`C3:2 C3:2 F3:2 C3:2 F3:2 C3:2 G3:2 C3:2 C3:2 F3:2 C3:2 G3:2
                 C3:2 F3:2 C3:2 G3:2 C3:2 C3:2 F3:2 C3:2 F3:2 C3:2 G3:2 C3:2`),
    },
    { // Bach (attr.) / Petzold: Minuet in G
      bpm: 126,
      melody: seq(`D5:1 G4:.5 A4:.5 B4:.5 C5:.5 D5:1 G4:1 G4:1 E5:1 C5:.5 D5:.5 E5:.5 F#5:.5 G5:1 G4:1 G4:1
                   C5:1 D5:.5 C5:.5 B4:.5 A4:.5 B4:1 C5:.5 B4:.5 A4:.5 G4:.5 F#4:1 G4:.5 A4:.5 B4:.5 G4:.5 A4:3
                   D5:1 G4:.5 A4:.5 B4:.5 C5:.5 D5:1 G4:1 G4:1 E5:1 C5:.5 D5:.5 E5:.5 F#5:.5 G5:1 G4:1 G4:1
                   C5:1 D5:.5 C5:.5 B4:.5 A4:.5 B4:1 C5:.5 B4:.5 A4:.5 G4:.5 A4:1 B4:.5 A4:.5 G4:.5 F#4:.5 G4:3`),
      bass: seq(`G3:3 B3:3 C4:3 B3:3 A3:3 G3:3 D3:3 F#3:3
                 G3:3 B3:3 C4:3 B3:3 A3:3 G3:3 D3:3 G3:3`),
    },
    { // Brahms: Lullaby (Wiegenlied, Op. 49 No. 4)
      bpm: 80,
      melody: seq(`E5:.5 E5:.5 G5:2 E5:.5 E5:.5 G5:2 E5:.5 G5:.5 C6:1 B5:1.5 A5:.5 A5:1 G5:2
                   D5:.5 E5:.5 F5:2 D5:.5 E5:.5 F5:2 D5:.5 F5:.5 B5:1 A5:1 G5:1 B5:1 C6:2
                   C5:.5 C5:.5 C6:2 A5:.5 F5:.5 G5:2 E5:.5 C5:.5 F5:1 G5:1 A5:1 G5:2
                   C5:.5 C5:.5 C6:2 A5:.5 F5:.5 G5:2 E5:.5 C5:.5 F5:1 E5:1 D5:1 C5:3`),
      bass: seq(`-:1 C4:3 C4:3 C4:3 G3:3
                 G3:3 G3:3 G3:3 G3:2 C4:2
                 C4:3 F3:3 C4:3 G3:3
                 C4:3 F3:3 C4:3 G3:2 C4:2`),
    },
    { // Beethoven: Für Elise (opening theme), played twice
      bpm: 92,
      melody: seq(twice(`E5:.25 D#5:.25 E5:.25 D#5:.25 E5:.25 B4:.25 D5:.25 C5:.25 A4:.75 C4:.25 E4:.25 A4:.25
                         B4:.75 E4:.25 G#4:.25 B4:.25 C5:.75 E4:.25 E5:.25 D#5:.25 E5:.25 D#5:.25 E5:.25 B4:.25
                         D5:.25 C5:.25 A4:.75 C4:.25 E4:.25 A4:.25 B4:.75 E4:.25 C5:.25 B4:.25 A4:1.5`)),
      bass: seq(twice(`-:2 A3:1.5 E3:1.5 A3:1.5 -:1.5 A3:1.5 E3:1.5 A3:1.5`)),
    },
  ];

  const MUSIC_KEY = 'pocket-town-music';
  const music = { on: true, playing: false, idx: 0, voices: [], timer: 0, bus: null, pauseUntil: 0 };
  try { music.on = localStorage.getItem(MUSIC_KEY) !== '0'; } catch (_) { /* storage blocked */ }

  function musicBus() {
    if (!music.bus) {
      const lp = actx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3200;
      music.bus = actx.createGain();
      music.bus.gain.value = 0;
      music.bus.connect(lp).connect(actx.destination);
    }
    return music.bus;
  }

  // One music-box note: a sine with a quiet octave overtone and a gentle decay.
  function pluck(f, t, dur, vol) {
    const ring = Math.max(dur * 1.8, 0.6);
    const g = actx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ring);
    g.connect(musicBus());
    const o1 = actx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = f;
    o1.connect(g);
    const o2 = actx.createOscillator(), g2 = actx.createGain();
    o2.type = 'triangle';
    o2.frequency.value = f * 2;
    g2.gain.value = 0.12;
    o2.connect(g2).connect(g);
    for (const o of [o1, o2]) { o.start(t); o.stop(t + ring + 0.05); }
  }

  function beginPiece(t0) {
    const p = PIECES[music.idx];
    music.voices = [
      { notes: p.melody, i: 0, t: t0, vol: 0.22 },
      { notes: p.bass, i: 0, t: t0, vol: 0.13 },
    ];
  }

  // Look-ahead scheduler: queues the next ~0.4 s of notes on the audio clock.
  function scheduleMusic() {
    if (!music.playing || !actx) return;
    const now = actx.currentTime, ahead = now + 0.4;
    const spb = 60 / PIECES[music.idx].bpm;
    let finished = true;
    for (const v of music.voices) {
      while (v.i < v.notes.length && v.t < ahead) {
        const [n, beats] = v.notes[v.i];
        if (n) pluck(freq(n), Math.max(v.t, now), beats * spb, v.vol);
        v.t += beats * spb;
        v.i++;
      }
      if (v.i < v.notes.length) finished = false;
    }
    if (finished && now > Math.max(...music.voices.map((v) => v.t)) + 2.5) {
      music.idx = (music.idx + 1) % PIECES.length; // short pause, then the next piece
      beginPiece(now + 0.1);
    }
  }

  function startMusic() {
    if (!actx || muted || !music.on || music.playing || document.hidden) return;
    music.playing = true;
    const bus = musicBus(), t = actx.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(bus.gain.value, t);
    bus.gain.linearRampToValueAtTime(0.55, t + 1.2);
    beginPiece(t + 0.15);
    music.timer = setInterval(scheduleMusic, 100);
    scheduleMusic();
  }

  function stopMusic() {
    if (!music.playing) return;
    music.playing = false;
    clearInterval(music.timer);
    if (actx && music.bus) {
      const t = actx.currentTime;
      music.bus.gain.cancelScheduledValues(t);
      music.bus.gain.setValueAtTime(music.bus.gain.value, t);
      music.bus.gain.linearRampToValueAtTime(0, t + 0.3);
    }
  }

  // Pause when the app is in the background; carry on when it comes back.
  addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); else if (actx) audio(); });
  // iOS only unlocks audio inside certain gestures, so try on these too.
  for (const evt of ['touchend', 'click', 'keydown']) addEventListener(evt, audio, { passive: true });

  /* ================= World building ================= */
  function buildWorld() {
    for (let i = 0; i < 3; i++) {
      const r = document.createElement('div');
      r.className = `room room-${i}`;
      r.style.left = i * 1000 + 'px';
      r.innerHTML = '<div class="floor"></div>';
      world.appendChild(r);
    }
    for (const f of FURN) {
      const el = document.createElement('div');
      el.className = (f.deco ? 'deco' : 'furn') + (f.action ? ' tappable' : '') + (f.cls ? ' ' + f.cls : '');
      Object.assign(el.style, { left: f.x + 'px', top: f.y + 'px', width: f.w + 'px', height: f.h + 'px', zIndex: 1 });
      el.innerHTML = svg(f.w, f.h, f.svg);
      if (f.id) { el.dataset.f = f.id; furnById[f.id] = { ...f, el }; }
      for (const s of f.surfaces || []) surfaces.push(s);
      world.appendChild(el);
    }
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('div');
      s.className = 'shade' + (i === 2 ? ' garden' : '');
      s.style.left = i * 1000 + 'px';
      s.id = 'shade' + i;
      world.appendChild(s);
    }
  }

  /* ================= Entities ================= */
  function makeEnt(kind, x, y, id) {
    const a = ART[kind];
    const el = document.createElement('div');
    el.className = 'ent ' + (a.char ? 'char' : 'item');
    el.style.width = a.w + 'px';
    el.style.height = a.h + 'px';
    el.innerHTML = a.svg + (a.char ? '<span class="zzz">z</span>' : '');
    const e = {
      id: id || nextId++, kind, a, el, x, y,
      vx: 0, vy: 0, falling: false, floorY: y, attachedTo: null, slot: null,
      drag: false, tag: null, lastT: '', lastZ: -1,
    };
    el.dataset.id = e.id;
    world.appendChild(el);
    ents.push(e);
    return e;
  }

  function removeEnt(e) {
    const i = ents.indexOf(e);
    if (i >= 0) ents.splice(i, 1);
    for (const o of ents) if (o.attachedTo === e.id) { o.attachedTo = null; settle(o); }
    e.el.classList.add('gone');
    setTimeout(() => e.el.remove(), 320);
  }

  function zOf(e) {
    if (e.drag) return 100000;
    if (e.attachedTo) { const p = byId(e.attachedTo); return p ? zOf(p) + 1 : 10; }
    return Math.round(e.y) * 2 + (e.a.char ? 0 : 1);
  }

  function place(e) {
    const t = `translate(${(e.x - e.a.w / 2).toFixed(1)}px,${(e.y - e.a.h).toFixed(1)}px)`;
    if (t !== e.lastT) { e.el.style.transform = t; e.lastT = t; }
    const z = zOf(e);
    if (z !== e.lastZ) { e.el.style.zIndex = z; e.lastZ = z; }
  }

  function bump(el, cls, ms = 450) {
    el.classList.remove(cls);
    void el.offsetWidth; // restart the CSS animation
    el.classList.add(cls);
    clearTimeout(el['_t' + cls]);
    el['_t' + cls] = setTimeout(() => el.classList.remove(cls), ms);
  }

  function fx(x, y, text, color) {
    const d = document.createElement('div');
    d.className = 'fx';
    d.textContent = text;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    if (color) d.style.color = color;
    world.appendChild(d);
    setTimeout(() => d.remove(), 1150);
  }

  function spawn(kind, x, y, vx, vy) {
    const e = makeEnt(kind, x, y);
    e.vx = vx; e.vy = vy;
    e.falling = true;
    e.floorY = rand(FLOOR_MIN + 5, FLOOR_MIN + 60);
    place(e);
    bump(e.el, 'pop', 400);
    enforceCap();
    return e;
  }

  function enforceCap() {
    const items = ents.filter((e) => !e.a.char);
    if (items.length <= MAX_ITEMS) return;
    const victim = items.find((e) => !e.attachedTo && !e.drag);
    if (victim) removeEnt(victim);
  }

  /* ---------- Physics: falling onto surfaces or the floor ---------- */
  function landed(e, tag, quiet) {
    e.falling = false; e.vx = 0; e.vy = 0;
    e.tag = tag || null;
    if (e.a.char) e.el.classList.toggle('sleep', e.tag === 'bed');
    if (!quiet) { bump(e.el, 'land', 320); sfx.land(); }
  }

  function settle(e) {
    if (e.y >= FLOOR_MIN) { e.y = Math.min(e.y, FLOOR_MAX); landed(e, null); return; }
    const s = surfaces.find((s) => e.x >= s.x1 && e.x <= s.x2 && Math.abs(e.y - s.top) < 14);
    if (s) { e.y = s.top; landed(e, s.tag); return; }
    e.falling = true; e.vy = 0; e.vx = 0;
    e.floorY = rand(FLOOR_MIN + 5, FLOOR_MIN + 35);
    e.el.classList.remove('sleep');
  }

  function fall(e) {
    const ny = e.y + e.vy;
    e.vy = Math.min(e.vy + GRAV, 28);
    e.x = clamp(e.x + e.vx, 20, W - 20);
    if (e.vy > 0) {
      let hit = null;
      for (const s of surfaces) {
        if (e.x >= s.x1 && e.x <= s.x2 && e.y <= s.top && ny >= s.top && (!hit || s.top < hit.top)) hit = s;
      }
      if (hit) { e.y = hit.top; landed(e, hit.tag); return; }
      if (ny >= e.floorY) { e.y = e.floorY; landed(e, null); return; }
    }
    e.y = ny;
  }

  function follow(e) {
    const p = byId(e.attachedTo);
    const s = p && p.a.slots[e.slot];
    if (!s) { e.attachedTo = null; e.slot = null; settle(e); return; }
    e.x = p.x + s.x;
    e.y = e.slot === 'head' ? p.y + s.y + e.a.wear : p.y + s.y + e.a.h / 2;
  }

  /* ---------- Dropping an item onto a friend ---------- */
  function tryInteract(e) {
    const cx = e.x, cy = e.y - e.a.h / 2;
    let best = null, bestD = Infinity, act = null;
    for (const c of ents) {
      if (!c.a.char || c === e || c.drag) continue;
      const S = c.a.slots;
      const cands = [];
      if (e.a.food && S.mouth) cands.push(['eat', S.mouth, 58]);
      if (e.a.wear != null && S.head) cands.push(['head', { x: S.head.x, y: S.head.y + 18 }, 62]);
      if (S.hand) cands.push(['hand', S.hand, 55]);
      for (const [a, pt, r] of cands) {
        const d = Math.hypot(cx - (c.x + pt.x), cy - (c.y + pt.y));
        if (d < r && d < bestD) { bestD = d; best = c; act = a; }
      }
    }
    if (!best) return false;
    const c = best;

    if (act === 'eat') {
      removeEnt(e);
      bump(c.el, 'chomp', 900);
      sfx.chomp();
      if (c.kind === 'cat') setTimeout(sfx.meow, 500);
      setTimeout(() => fx(c.x + c.a.slots.mouth.x, c.y + c.a.slots.mouth.y - 40, '♥', '#ff5d8f'), 350);
      return true;
    }

    const prev = ents.find((o) => o.attachedTo === c.id && o.slot === act);
    if (prev) { prev.attachedTo = null; prev.slot = null; prev.falling = true; prev.vx = rand(-5, 5); prev.vy = -9; prev.floorY = rand(FLOOR_MIN + 5, FLOOR_MIN + 40); }
    e.attachedTo = c.id;
    e.slot = act;
    follow(e);
    bump(e.el, 'pop', 400);
    if (act === 'head') { sfx.sparkle(); fx(c.x + c.a.slots.head.x, c.y + c.a.slots.head.y, '✨'); }
    else sfx.pick();
    return true;
  }

  /* ================= Furniture taps ================= */
  function toggleDark(i) {
    rooms[i].dark = !rooms[i].dark;
    applyRooms();
  }
  function applyRooms() {
    rooms.forEach((r, i) => document.getElementById('shade' + i).classList.toggle('on', r.dark));
    furnById.lamp0.el.classList.toggle('off', rooms[0].dark);
    furnById.lamp1.el.classList.toggle('off', rooms[1].dark);
    furnById.sun.el.classList.toggle('off', rooms[2].dark);
  }

  const ACTIONS = {
    wardrobe() { spawn(pick(HATS), 150, 430, rand(3, 7), rand(-10, -6)); sfx.spawn(); },
    toybox(f) { bump(f.el, 'open', 500); spawn(pick(TOYS), 395, 470, rand(-5, 5), rand(-17, -12)); sfx.spawn(); },
    fridge(f) { bump(f.el, 'open', 700); spawn(pick(FOODS), 1150, 430, rand(4, 8), rand(-9, -5)); sfx.spawn(); },
    oven() {
      spawn(pick(BAKES), 1485, 480, rand(-5, 5), rand(-16, -11));
      sfx.ding();
      fx(1482, 340, '♨', '#fff');
    },
    lamp(f) { toggleDark(f.room); sfx.click(); },
    sun() { toggleDark(2); sfx.sparkle(); },
    tree() { spawn('apple', 2220 + rand(-100, 100), 300, 0, 0); },
    bush() { spawn('flower', 2855 + rand(-40, 40), 520, rand(-6, 6), rand(-14, -10)); sfx.spawn(); },
  };

  function tapFurniture(id) {
    const f = furnById[id];
    if (!f) return;
    bump(f.el, 'wiggle', 420);
    if (f.action) ACTIONS[f.action](f);
  }

  /* ================= Camera ================= */
  const viewW = () => innerWidth / scale;
  function clampCam() {
    const max = W - viewW();
    camX = max < 0 ? max / 2 : clamp(camX, 0, max);
  }
  function applyCam() {
    world.style.transform = `translate(${(-camX * scale).toFixed(1)}px,${offY.toFixed(1)}px) scale(${scale})`;
  }
  const currentRoom = () => clamp(Math.round((camX + viewW() / 2 - 500) / 1000), 0, 2);
  function goRoom(i) {
    i = clamp(i, 0, 2);
    camTarget = i * 1000 + 500 - viewW() / 2;
    audio();
    sfx.click();
  }
  function resize() {
    const portrait = innerHeight > innerWidth;
    scale = portrait ? Math.min(innerHeight / H, innerWidth / 600) : innerHeight / H;
    offY = (innerHeight - H * scale) / 2;
    $('#rotate').hidden = !portrait || rotateDismissed;
    clampCam();
    applyCam();
  }
  let rotateDismissed = false;
  setTimeout(() => { rotateDismissed = true; $('#rotate').hidden = true; }, 6000);

  function updateUI() {
    const r = currentRoom();
    document.querySelectorAll('.dot').forEach((d) => d.classList.toggle('active', +d.dataset.room === r));
    $('#prev').disabled = camX <= 1;
    $('#next').disabled = camX >= W - viewW() - 1;
  }

  /* ================= Input ================= */
  const toWorld = (cx, cy) => ({ x: cx / scale + camX, y: (cy - offY) / scale });

  stage.addEventListener('pointerdown', (ev) => {
    audio();
    const p = toWorld(ev.clientX, ev.clientY);
    const entEl = ev.target.closest('.ent');
    const e = entEl && byId(entEl.dataset.id);
    if (e && !e.drag && !e.el.classList.contains('gone')) {
      if (e.attachedTo) { e.attachedTo = null; e.slot = null; }
      e.drag = true; e.falling = false; e.vx = e.vy = 0;
      e.el.classList.add('dragging');
      e.el.classList.remove('sleep');
      sfx.pick();
      pointers.set(ev.pointerId, { type: 'ent', e, dx: e.x - p.x, dy: e.y - p.y, cx: ev.clientX, cy: ev.clientY, sx: ev.clientX, sy: ev.clientY, moved: 0 });
    } else {
      const fEl = ev.target.closest('.furn');
      pointers.set(ev.pointerId, { type: 'pan', sx: ev.clientX, sy: ev.clientY, startCam: camX, moved: 0, furn: fEl ? fEl.dataset.f : null });
      camTarget = null;
    }
    try { stage.setPointerCapture(ev.pointerId); } catch (_) { /* ignore */ }
  });

  stage.addEventListener('pointermove', (ev) => {
    const p = pointers.get(ev.pointerId);
    if (!p) return;
    p.moved = Math.max(p.moved, Math.abs(ev.clientX - p.sx) + Math.abs(ev.clientY - p.sy));
    if (p.type === 'ent') { p.cx = ev.clientX; p.cy = ev.clientY; }
    else if (p.type === 'pan') {
      const first = [...pointers.values()].find((q) => q.type === 'pan');
      if (first === p) { camX = p.startCam - (ev.clientX - p.sx) / scale; clampCam(); }
    }
  });

  function endPointer(ev) {
    const p = pointers.get(ev.pointerId);
    if (!p) return;
    pointers.delete(ev.pointerId);
    if (p.type === 'ent') {
      const e = p.e;
      e.drag = false;
      e.el.classList.remove('dragging');
      if (p.moved < 8 && e.a.char) {
        e.drag = false;
        settle(e);
        bump(e.el, 'hop', 460);
        e.kind === 'cat' ? sfx.meow() : sfx.giggle();
      } else if (e.a.char || !tryInteract(e)) {
        settle(e);
      }
      saveSoon();
    } else if (p.type === 'pan' && p.moved < 10 && p.furn) {
      tapFurniture(p.furn);
      saveSoon();
    }
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
  addEventListener('contextmenu', (ev) => ev.preventDefault());

  function dragTo(p) {
    const w = toWorld(p.cx, p.cy);
    const e = p.e;
    e.x = clamp(w.x + p.dx, 20, W - 20);
    e.y = clamp(w.y + p.dy, e.a.h * 0.6, FLOOR_MAX);
  }

  /* ================= Main loop ================= */
  function tick() {
    for (const p of pointers.values()) {
      if (p.type !== 'ent') continue;
      if (p.cx < 60) { camX -= 12; camTarget = null; }
      else if (p.cx > innerWidth - 60) { camX += 12; camTarget = null; }
    }
    if (camTarget != null) {
      camX += (camTarget - camX) * 0.14;
      if (Math.abs(camTarget - camX) < 0.5) { camX = camTarget; camTarget = null; }
    }
    clampCam();
    for (const p of pointers.values()) if (p.type === 'ent') dragTo(p);
    for (const e of ents) if (e.falling && !e.drag) fall(e);
    for (const e of ents) if (e.attachedTo) follow(e);
    for (const e of ents) place(e);
    applyCam();
    updateUI();
    requestAnimationFrame(tick);
  }

  /* ================= Saving ================= */
  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1,
        dark: rooms.map((r) => r.dark),
        cam: Math.round(camX),
        ents: ents.map((e) => ({
          id: e.id, k: e.kind, x: Math.round(e.x),
          y: Math.round(e.falling ? e.floorY : e.y),
          a: e.attachedTo, s: e.slot, t: e.tag,
        })),
      }));
    } catch (_) { /* storage blocked: the game still works, it just won't remember */ }
  }
  let saveTimer = 0;
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }
  setInterval(save, 4000);
  addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  addEventListener('pagehide', save);

  function load() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (_) { data = null; }
    if (!data || data.v !== 1 || !Array.isArray(data.ents)) return false;
    for (const d of data.ents) {
      if (!ART[d.k]) continue;
      const e = makeEnt(d.k, d.x, d.y, d.id);
      e.tag = d.t || null;
      if (e.a.char) e.el.classList.toggle('sleep', e.tag === 'bed');
      nextId = Math.max(nextId, d.id + 1);
    }
    for (const d of data.ents) {
      const e = byId(d.id);
      if (e && d.a && byId(d.a)) { e.attachedTo = d.a; e.slot = d.s; }
    }
    (data.dark || []).forEach((v, i) => { if (rooms[i]) rooms[i].dark = !!v; });
    if (typeof data.cam === 'number') camX = data.cam;
    return ents.some((e) => e.a.char);
  }

  function setupDefault() {
    const put = (kind, x, y, tag) => { const e = makeEnt(kind, x, y); e.tag = tag || null; if (tag === 'bed') e.el.classList.add('sleep'); return e; };
    put('kid-pip', 430, 615);
    put('kid-juno', 760, 470, 'bed');
    put('cat', 290, 655);
    put('teddy', 690, 230);
    put('book', 790, 230);
    put('ball', 560, 670);
    put('kid-mo', 1560, 625);
    put('apple', 1700, 440);
    put('milk', 1790, 440);
    put('cookie', 1860, 440);
    put('kid-bo', 2560, 620);
    put('duck', 2720, 660);
    const hat = put('crown', 0, 0);
    hat.attachedTo = byId(1).id; // Pip starts with a crown
    hat.slot = 'head';
  }

  function resetAll() {
    for (const e of [...ents]) e.el.remove();
    ents.length = 0;
    nextId = 1;
    rooms.forEach((r) => (r.dark = false));
    setupDefault();
    applyRooms();
    goRoom(0);
    save();
  }

  /* ================= UI buttons ================= */
  $('#prev').addEventListener('click', () => goRoom(currentRoom() - 1));
  $('#next').addEventListener('click', () => goRoom(currentRoom() + 1));
  document.querySelectorAll('.dot').forEach((d) => d.addEventListener('click', () => goRoom(+d.dataset.room)));
  const muteBtn = $('#mute');
  const showMute = () => { muteBtn.textContent = muted ? '🔇' : '🔊'; };
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (_) { /* ignore */ }
    showMute();
    if (muted) stopMusic();
    audio();
    sfx.click();
  });
  const musicBtn = $('#music');
  const showMusic = () => {
    musicBtn.classList.toggle('off', !music.on);
    musicBtn.setAttribute('aria-pressed', String(music.on));
  };
  musicBtn.addEventListener('click', () => {
    music.on = !music.on;
    try { localStorage.setItem(MUSIC_KEY, music.on ? '1' : '0'); } catch (_) { /* ignore */ }
    showMusic();
    if (!music.on) stopMusic();
    audio();
  });
  $('#reset').addEventListener('click', () => { if (confirm('Start Pocket Town over? Everything goes back to where it began.')) resetAll(); });

  let installEvt = null;
  addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); installEvt = ev; $('#install').hidden = false; });
  $('#install').addEventListener('click', async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch (_) { /* ignore */ }
    installEvt = null;
    $('#install').hidden = true;
  });
  addEventListener('appinstalled', () => { $('#install').hidden = true; });

  /* ================= Start ================= */
  buildWorld();
  if (!load()) { for (const e of [...ents]) e.el.remove(); ents.length = 0; nextId = 1; setupDefault(); }
  for (const e of ents) if (e.attachedTo) follow(e);
  applyRooms();
  showMute();
  showMusic();
  resize();
  addEventListener('resize', resize);
  requestAnimationFrame(tick);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
