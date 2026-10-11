// The gift box artwork (SVG): an isometric cube with a lifting lid, satin
// ribbons and a bow with long tails. Colours come from CSS variables derived
// from the admin's colour settings (see themeVars in lib/settings.ts).
// The ids #box, #base, #hole, #inner and #lid and the 400x420 geometry are
// what the animation engine drives — keep them when changing the drawing.

const V = (name: string, opacity?: number) => ({ stopColor: `var(${name})`, ...(opacity !== undefined ? { stopOpacity: opacity } : {}) });
const F = (name: string) => ({ fill: `var(${name})` });
const S = (name: string) => ({ stroke: `var(${name})` });

export function GiftBox() {
  return (
    <svg viewBox="0 0 400 420" aria-hidden="true">
      <defs>
        <linearGradient id="gFaceL" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={V("--face-l-hi")} />
          <stop offset="1" style={V("--face-l")} />
        </linearGradient>
        <linearGradient id="gFaceR" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={V("--face-r-hi")} />
          <stop offset="1" style={V("--face-r")} />
        </linearGradient>
        <linearGradient id="gAO" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".1" />
          <stop offset=".25" stopColor="#000" stopOpacity="0" />
          <stop offset=".8" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".16" />
        </linearGradient>
        <linearGradient id="gLidTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={V("--lid-top-hi")} />
          <stop offset="1" style={V("--lid-top")} />
        </linearGradient>
        <linearGradient id="gLidL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={V("--lid-l")} />
          <stop offset="1" style={V("--lid-l-lo")} />
        </linearGradient>
        <linearGradient id="gLidR" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={V("--lid-r")} />
          <stop offset="1" style={V("--lid-r-lo")} />
        </linearGradient>
        {/* satin ribbon across its width: soft highlight band down the middle */}
        <linearGradient id="gRibL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={V("--rib")} />
          <stop offset=".45" style={V("--rib-hi")} />
          <stop offset="1" style={V("--rib-lo")} />
        </linearGradient>
        <linearGradient id="gRibR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={V("--rib-lo")} />
          <stop offset=".5" style={V("--rib-hi")} />
          <stop offset="1" style={V("--rib")} />
        </linearGradient>
        <linearGradient id="gRibTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={V("--rib-hi")} />
          <stop offset="1" style={V("--rib")} />
        </linearGradient>
        {/* bow: ribbon colour shading into the accent colour */}
        <linearGradient id="gBowA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={V("--acc")} />
          <stop offset=".5" style={V("--rib")} />
          <stop offset="1" style={V("--rib-lo")} />
        </linearGradient>
        <linearGradient id="gBowB" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" style={V("--acc")} />
          <stop offset=".5" style={V("--rib")} />
          <stop offset="1" style={V("--rib-lo")} />
        </linearGradient>
        <linearGradient id="gGloss" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gCast" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".2" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gTailL" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" style={V("--rib")} />
          <stop offset=".6" style={V("--rib-hi")} />
          <stop offset="1" style={V("--acc")} />
        </linearGradient>
        <linearGradient id="gTailR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={V("--rib")} />
          <stop offset=".6" style={V("--rib-hi")} />
          <stop offset="1" style={V("--acc")} />
        </linearGradient>
        <radialGradient id="gKnot" cx=".35" cy=".3" r=".85">
          <stop offset="0" style={V("--rib-hi")} />
          <stop offset=".55" style={V("--rib")} />
          <stop offset="1" style={V("--rib-lo")} />
        </radialGradient>
        <radialGradient id="gIn" cx=".5" cy=".5" r=".5">
          <stop offset="0" style={V("--inner-a")} />
          <stop offset=".55" style={V("--inner-b")} />
          <stop offset="1" style={V("--inner-c")} />
        </radialGradient>
        <radialGradient id="gShadow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#05070c" stopOpacity=".55" />
          <stop offset="1" stopColor="#05070c" stopOpacity="0" />
        </radialGradient>
        <clipPath id="cL">
          <path d="M100 200 L200 233 L200 345 L100 312 Z" />
        </clipPath>
        <clipPath id="cR">
          <path d="M200 233 L300 200 L300 312 L200 345 Z" />
        </clipPath>
      </defs>

      {/* floor shadow */}
      <ellipse cx="206" cy="364" rx="150" ry="22" fill="url(#gShadow)" />
      <ellipse cx="200" cy="338" rx="92" ry="14" fill="url(#gShadow)" opacity=".5" />

      <g id="box">
        <g id="base">
          {/* left face (lit) */}
          <path d="M100 200 L200 233 L200 345 L100 312 Z" fill="url(#gFaceL)" />
          <g clipPath="url(#cL)">
            <rect x="100" y="196" width="100" height="152" fill="url(#gAO)" />
            <path d="M137 212.3 L163 221 L163 333 L137 324.3 Z" fill="url(#gRibL)" />
            <path d="M137 212.3 L137 324.3" stroke="#000" strokeWidth="1" opacity=".12" />
            <path d="M163 221 L163 333" stroke="#000" strokeWidth="1" opacity=".16" />
            <path d="M104 214 L134 224 L134 316 L104 306 Z" fill="url(#gGloss)" />
            <path d="M100 207.7 L200 241 L200 264 L100 230.7 Z" fill="url(#gCast)" />
          </g>
          {/* right face (in shade) */}
          <path d="M200 233 L300 200 L300 312 L200 345 Z" fill="url(#gFaceR)" />
          <g clipPath="url(#cR)">
            <rect x="200" y="196" width="100" height="152" fill="url(#gAO)" />
            <path d="M237 220.7 L263 212 L263 324 L237 332.7 Z" fill="url(#gRibR)" />
            <path d="M200 241 L300 207.7 L300 230.7 L200 264 Z" fill="url(#gCast)" />
            <path d="M237 220.7 L237 332.7" stroke="#000" strokeWidth="1" opacity=".16" />
            <path d="M263 212 L263 324" stroke="#000" strokeWidth="1" opacity=".1" />
          </g>
          {/* front vertical edge catches the light */}
          <path d="M200 233 L200 345" style={S("--edge-hi")} strokeWidth="1.6" opacity=".75" />
          <path d="M100 312 L200 345 L300 312" fill="none" style={S("--edge-hi")} strokeWidth="1.2" opacity=".35" />

          {/* the opening: hidden while the lid is on, revealed when it lifts (engine fades #hole in) */}
          <g id="hole" opacity="0">
            <path d="M100 200 L200 167 L300 200 L200 233 Z" fill="#241a1c" />
            <path d="M100 200 L200 167 L200 200 L100 233 Z" style={F("--inner-wall-l")} opacity=".9" />
            <path d="M200 167 L300 200 L300 233 L200 200 Z" style={F("--inner-wall-r")} opacity=".9" />
            <path id="inner" d="M100 200 L200 167 L300 200 L200 233 Z" fill="url(#gIn)" opacity="0" />
            <path d="M100 200 L200 233 L300 200" fill="none" style={S("--edge-hi")} strokeWidth="2" opacity=".8" />
          </g>
        </g>

        <g id="lid">
          {/* lid faces */}
          <path d="M92 175 L200 211 L200 241 L92 205 Z" fill="url(#gLidL)" />
          <path d="M200 211 L308 175 L308 205 L200 241 Z" fill="url(#gLidR)" />
          <path d="M92 175 L200 139 L308 175 L200 211 Z" fill="url(#gLidTop)" />
          {/* lid edges */}
          <path d="M92 175 L200 211 L308 175" fill="none" style={S("--edge-hi")} strokeWidth="1.6" opacity=".9" />
          <path d="M200 211 L200 241" style={S("--edge-hi")} strokeWidth="1.4" opacity=".7" />
          <path d="M92 205 L200 241 L308 205" fill="none" style={S("--box-shadow-edge")} strokeWidth="1.2" opacity=".35" />
          <path d="M104 177 L186 150" stroke="#fff" strokeWidth="2" opacity=".35" strokeLinecap="round" />

          {/* ribbon straps: down each lid face and crossing over the top */}
          <path d="M133 188.7 L159 197.3 L159 227.3 L133 218.7 Z" fill="url(#gRibL)" />
          <path d="M241 197.3 L267 188.7 L267 218.7 L241 227.3 Z" fill="url(#gRibR)" />
          <path d="M133 188.7 L159 197.3 L267 161.3 L241 152.7 Z" fill="url(#gRibTop)" />
          <path d="M241 197.3 L267 188.7 L159 152.7 L133 161.3 Z" fill="url(#gRibTop)" opacity=".92" />

          {/* long ribbon tails sweep out over the lid and curl to each side */}
          <path d="M193 178 C160 214 96 214 40 186 C34 183 30 188 36 191 C78 222 150 238 202 192 Z" fill="url(#gTailL)" style={S("--rib-lo")} strokeWidth="1" strokeLinejoin="round" />
          <path d="M207 178 C240 220 316 240 370 214 C377 211 380 217 373 220 C330 258 252 262 198 192 Z" fill="url(#gTailR)" style={S("--rib-lo")} strokeWidth="1" strokeLinejoin="round" />

          {/* bow: back loops, front loops, then the knot */}
          <path d="M196 170 C160 92 78 104 94 146 C104 170 160 182 196 170 Z" fill="url(#gBowA)" style={S("--rib-lo")} strokeWidth=".8" />
          <path d="M190 166 C162 112 112 118 118 142 C124 160 160 170 190 166 Z" style={F("--rib-lo")} opacity=".4" />
          <path d="M204 170 C240 92 322 104 306 146 C296 170 240 182 204 170 Z" fill="url(#gBowB)" style={S("--rib-lo")} strokeWidth=".8" />
          <path d="M210 166 C238 112 288 118 282 142 C276 160 240 170 210 166 Z" style={F("--rib-lo")} opacity=".4" />
          <path d="M196 178 C150 150 108 172 118 192 C128 208 176 200 198 184 Z" fill="url(#gBowA)" style={S("--rib-lo")} strokeWidth=".8" />
          <path d="M204 178 C250 150 292 172 282 192 C272 208 224 200 202 184 Z" fill="url(#gBowB)" style={S("--rib-lo")} strokeWidth=".8" />
          <path d="M112 128 C124 116 146 118 164 138" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".5" />
          <path d="M288 128 C276 116 254 118 236 138" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".3" />
          <rect x="186" y="164" width="28" height="24" rx="8" fill="url(#gKnot)" style={S("--rib-lo")} strokeWidth="1" />
          <path d="M191 170 C196 166 204 166 209 170" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".55" />
        </g>
      </g>
    </svg>
  );
}
