// The gift box artwork (SVG). Shading comes from CSS variables derived from the
// two colours the admin picks (see themeVars in lib/settings.ts). The ids
// #box, #base, #lid and #inner and the 400x420 geometry are what the animation
// engine drives — keep them when changing the drawing.

const V = (name: string, opacity?: number) => ({ stopColor: `var(${name})`, ...(opacity !== undefined ? { stopOpacity: opacity } : {}) });

export function GiftBox() {
  return (
    <svg viewBox="0 0 400 420" aria-hidden="true">
      <defs>
        {/* box body: lit from the left, darker toward the right edge */}
        <linearGradient id="gBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={V("--box-c")} />
          <stop offset=".28" style={V("--box-b")} />
          <stop offset=".62" style={V("--box-a")} />
          <stop offset="1" style={V("--box-c")} />
        </linearGradient>
        <linearGradient id="gShadeV" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".34" />
          <stop offset=".16" stopColor="#000" stopOpacity=".05" />
          <stop offset=".72" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".32" />
        </linearGradient>
        <linearGradient id="gEdgeL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".3" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gEdgeR" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".38" />
        </linearGradient>
        <linearGradient id="gGloss" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".5" stopColor="#fff" stopOpacity=".34" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {/* vertical ribbon band: rounded look, highlight just left of centre */}
        <linearGradient id="gRibV" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={V("--rib-c")} />
          <stop offset=".3" style={V("--rib-b")} />
          <stop offset=".46" style={V("--rib-hi")} />
          <stop offset=".66" style={V("--rib-b")} />
          <stop offset="1" style={V("--rib-c")} />
        </linearGradient>
        <linearGradient id="gRibLoop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={V("--rib-hi")} />
          <stop offset=".35" style={V("--rib-b")} />
          <stop offset="1" style={V("--rib-c")} />
        </linearGradient>
        <linearGradient id="gRibLoopR" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" style={V("--rib-b")} />
          <stop offset=".45" style={V("--rib-a")} />
          <stop offset="1" style={V("--rib-c")} />
        </linearGradient>
        <radialGradient id="gKnot" cx=".38" cy=".3" r=".8">
          <stop offset="0" style={V("--rib-hi")} />
          <stop offset=".5" style={V("--rib-b")} />
          <stop offset="1" style={V("--rib-c")} />
        </radialGradient>
        <linearGradient id="gLidFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={V("--lid-a")} />
          <stop offset=".6" style={V("--lid-b")} />
          <stop offset="1" style={V("--box-a")} />
        </linearGradient>
        <linearGradient id="gLidTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={V("--lid-a")} />
          <stop offset="1" style={V("--lid-b")} />
        </linearGradient>
        <linearGradient id="gLidShade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".05" />
          <stop offset=".6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".3" />
        </linearGradient>
        <radialGradient id="gIn" cx=".5" cy=".5" r=".5">
          <stop offset="0" style={V("--inner-a")} />
          <stop offset=".55" style={V("--inner-b")} />
          <stop offset="1" style={V("--inner-c")} />
        </radialGradient>
        <radialGradient id="gShadow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#05070c" stopOpacity=".6" />
          <stop offset="1" stopColor="#05070c" stopOpacity="0" />
        </radialGradient>
        <clipPath id="cBody">
          <path d="M110 215 L290 215 L290 333 Q290 345 278 345 L122 345 Q110 345 110 333 Z" />
        </clipPath>
      </defs>

      <ellipse cx="200" cy="376" rx="150" ry="19" fill="url(#gShadow)" />
      <ellipse cx="200" cy="350" rx="96" ry="8" fill="url(#gShadow)" />

      <g id="box">
        <g id="base">
          <path d="M110 215 L290 215 L290 333 Q290 345 278 345 L122 345 Q110 345 110 333 Z" fill="url(#gBody)" />
          <g clipPath="url(#cBody)">
            <rect x="106" y="215" width="188" height="132" fill="url(#gShadeV)" />
            <rect x="110" y="215" width="30" height="132" fill="url(#gEdgeL)" />
            <rect x="262" y="215" width="30" height="132" fill="url(#gEdgeR)" />
            {/* glossy streaks */}
            <path d="M132 236 L156 238 L136 342 L120 342 Z" fill="url(#gGloss)" opacity=".7" />
            <path d="M162 240 L170 240 L156 342 L148 342 Z" fill="url(#gGloss)" opacity=".4" />
            {/* ribbon band with soft shadow either side */}
            <rect x="182" y="215" width="4" height="133" fill="#000" opacity=".18" />
            <rect x="214" y="215" width="4" height="133" fill="#000" opacity=".22" />
            <rect x="186" y="215" width="28" height="133" fill="url(#gRibV)" />
            <rect x="186" y="336" width="28" height="12" fill="#000" opacity=".22" />
            <line x1="110" y1="344.2" x2="290" y2="344.2" style={{ stroke: "var(--box-rim)" }} strokeWidth="1.2" opacity=".5" />
          </g>
          {/* the opening: hidden while the lid is on, revealed when it lifts (engine fades #hole in) */}
          <g id="hole" opacity="0">
            <ellipse cx="200" cy="215" rx="90" ry="22" fill="#2a1d1d" />
            <ellipse id="inner" cx="200" cy="215" rx="90" ry="22" fill="url(#gIn)" opacity="0" />
            <path d="M110 218 A90 22 0 0 0 290 218" fill="none" style={{ stroke: "var(--box-shadow-edge)" }} strokeWidth="3" opacity=".55" />
            <path d="M110 215 A90 22 0 0 0 290 215" fill="none" style={{ stroke: "var(--box-rim)" }} strokeWidth="2.4" />
          </g>
        </g>

        <g id="lid">
          {/* lid: front face, lower lip, top face */}
          <path d="M96 190 L304 190 L304 212 Q304 220 294 220 L106 220 Q96 220 96 212 Z" fill="url(#gLidFront)" />
          <path d="M96 190 L304 190 L304 212 Q304 220 294 220 L106 220 Q96 220 96 212 Z" fill="url(#gLidShade)" />
          <path d="M96 208 L304 208 L304 212 Q304 220 294 220 L106 220 Q96 220 96 212 Z" style={{ fill: "var(--box-shadow-edge)" }} opacity=".7" />
          <path d="M96 190 C96 182 130 177 200 177 C270 177 304 182 304 190 C304 198 270 203 200 203 C130 203 96 198 96 190 Z" fill="url(#gLidTop)" />
          <path d="M96 190 C96 198 130 203 200 203 C270 203 304 198 304 190" fill="none" style={{ stroke: "var(--box-rim)" }} strokeWidth="2" opacity=".85" />
          <ellipse cx="146" cy="186" rx="34" ry="3.2" fill="#fff" opacity=".28" transform="rotate(-2 146 186)" />

          {/* ribbon over the lid: across the top face, then down the front */}
          <path d="M186 177.6 Q200 176.8 214 177.6 L214 202.6 Q200 203.6 186 202.6 Z" fill="url(#gRibV)" />
          <path d="M186 202 L214 202 L214 212 Q214 220 206 220 L194 220 Q186 220 186 212 Z" fill="url(#gRibV)" />
          <rect x="186" y="202" width="28" height="3" fill="#000" opacity=".2" />

          {/* ribbon tails hanging over the lid front */}
          <path d="M194 181 L170 208 L182 207 L178 220 L202 188 Z" fill="url(#gRibLoopR)" style={{ stroke: "var(--rib-stroke)" }} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M206 181 L230 208 L218 207 L222 220 L198 188 Z" fill="url(#gRibLoop)" style={{ stroke: "var(--rib-stroke)" }} strokeWidth="1.6" strokeLinejoin="round" />

          {/* bow: two loops (outer + dark inner opening), then the knot */}
          <path d="M198 174 C168 112 108 124 132 163 C146 183 182 182 198 174 Z" fill="url(#gRibLoop)" style={{ stroke: "var(--rib-stroke)" }} strokeWidth="2" />
          <path d="M193 171 C172 132 134 138 145 158 C153 172 178 174 193 171 Z" style={{ fill: "var(--rib-c)" }} opacity=".72" />
          <path d="M202 174 C232 112 292 124 268 163 C254 183 218 182 202 174 Z" fill="url(#gRibLoopR)" style={{ stroke: "var(--rib-stroke)" }} strokeWidth="2" />
          <path d="M207 171 C228 132 266 138 255 158 C247 172 222 174 207 171 Z" style={{ fill: "var(--rib-c)" }} opacity=".72" />
          <path d="M150 150 C158 138 173 138 186 160" fill="none" style={{ stroke: "var(--rib-hi)" }} strokeWidth="3" strokeLinecap="round" opacity=".85" />
          <path d="M252 148 C245 138 232 138 220 156" fill="none" style={{ stroke: "var(--rib-hi)" }} strokeWidth="2" strokeLinecap="round" opacity=".5" />
          <ellipse cx="200" cy="175" rx="15" ry="11.5" fill="url(#gKnot)" style={{ stroke: "var(--rib-stroke)" }} strokeWidth="2" />
          <ellipse cx="195" cy="171.5" rx="6" ry="3" fill="#fff" opacity=".35" />
        </g>
      </g>
    </svg>
  );
}
