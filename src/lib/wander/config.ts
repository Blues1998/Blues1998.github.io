/*
 * Every tuned constant in the simulation, in one place. These were scattered
 * through the original single-file build; collecting them means a change to
 * draw distance or road width is one edit, not a search.
 */

/* Quality tiers. `radius` is chunk draw distance, `fog` the base density that
   hides the resulting horizon, `prCap` the device-pixel-ratio ceiling. Fog is
   tied to radius deliberately: a lower tier must fog *sooner* or the world
   visibly ends. */
export const QUAL = [
  { radius: 4, fog: 0.00225, prCap: 1.25 },
  { radius: 5, fog: 0.00165, prCap: 1.5 },
  { radius: 6, fog: 0.00125, prCap: 2.0 },
];

export const DAY_LEN = 600; // seconds per full day at 1x
export const SEASON_LEN = 260; // seconds per season at 1x

/* ---- road ---- */
export const DS = 4; // metres between road centreline samples
export const ROAD_HALF = 5.5; // half-width of paved surface
/* Spatial hash cell for queryRoad. The search scans +/-3 cells, so this also
   sets how far from the road a point can be and still find it - which must
   cover ROAD_BLEND_DIST below, or the blend would be cut off mid-ramp. */
export const CELL = 50;
export const PIECE = 64; // centreline samples per road mesh piece
export const POST_CAP = 220; // reflector post instance budget

/* How the road's elevation profile is taken from the landscape. The radii
   bracket the width of the corridor the road disturbs (~84 m of blend either
   side), so the average is the height at which cut and fill balance. Wider
   than this and the road floats above valley floors; narrower and it follows
   every bump. */
export const ROAD_PROFILE_RADII = [30, 60, 90];
export const ROAD_PROFILE_TAPS = 4; // per radius, so 13 samples per centreline point
/* Maximum gradient, as a rise over run. Measured trade-off: the terrain's
   own large-scale slopes run past 50%, so the limiter is saturated whatever
   we pick and this number decides how deep the resulting cut is. 10% left a
   30 m median earthwork; 18% roughly halves it while staying a plausible
   mountain road rather than a rollercoaster. */
export const ROAD_MAX_GRADE = 0.18;

/* How far ahead the elevation profile looks, in centreline samples (x DS
   metres). This is what stops the road lagging the landscape.

   The gradient limit used to be applied causally - step toward the terrain,
   clamped - which is an integrator with no way to catch up. Approaching a
   climb the road stayed low until the mountain was already there, then trailed
   it all the way up; on the far side it sailed out over the valley. The error
   accumulated for as long as the steep stretch lasted, and measured up to
   210 m. With a lookahead the road starts climbing before the hill, the way a
   surveyed alignment does, and the residual is an order of magnitude smaller.

   Bounded above by the gap between how far ahead the road is generated
   (car.s + 2400) and how far ahead it is consumed (~car.s + 1060): points
   cannot be finalised until this many samples exist beyond them. */
export const ROAD_LOOKAHEAD = 150; // 600 m

/* How far the road may stray from the land before it is allowed to get
   steeper than ROAD_MAX_GRADE to close the gap, and the grade ceiling it may
   escalate to. The lookahead removes the road's lag but cannot repeal
   geometry: no road held to 18% crosses ground that runs at 50% without
   cutting or filling something, and left unchecked that error accumulates for
   as long as the steep stretch lasts. It measured 210 m - a causeway in the
   sky, visible from the next valley.

   A hard cap on the deviation was tried first and is wrong: clamping the
   height to a corridor lets it inherit the terrain's own gradient the instant
   the clamp binds, which produced 185% grades. Escalating the *rate* instead
   makes the deviation self-limiting - the further off the road is, the harder
   it pulls back - while never exceeding a grade you could drive. The
   allowance is one-sided, so straying is always limited to 18% and only the
   correction is allowed to hurry. */
export const ROAD_SOFT_CORRIDOR = 22;
export const ROAD_HARD_GRADE = 0.3;

/*
 * How far the route may turn away from the direction it set out in.
 *
 * This is what stops the road crossing itself, and it is a geometric
 * guarantee rather than a discouragement. Below 90 degrees the forward step
 * cos(heading) * DS stays positive, so distance along the route implies
 * distance downrange, and two stretches far apart in arc length cannot be
 * near each other in space. At 1.15 rad every sample advances at least 1.6 m
 * downrange, so samples 240 apart are at least 390 m apart - past
 * ROAD_BLEND_DIST, past any interaction at all.
 *
 * Where the road crossed itself there was no ground height that could satisfy
 * both branches: one got a two-metre plinth fifty metres tall and the other
 * was buried, with a comb of vertical faces between them. That is a
 * contradiction rather than a tuning problem, which is why steering away from
 * it was the wrong shape of fix - a repulsion term that mostly worked still
 * left one every few kilometres, and every one of them was ruinous to look at.
 *
 * The heading was otherwise a random walk with no restoring force, which is
 * exactly why it wandered back over its own path. Bounding it also turns the
 * drive into a journey that goes somewhere rather than a scribble, which is
 * what an endless road wants to be.
 */
export const ROAD_MAX_HEADING = 1.15; // radians, ~66 degrees

/* Wavelength of the heading noise, per metre. This now sets how often the
   road corners at all: the heading is this noise directly, so the corner rate
   is the noise rate. Retune by measuring mean curvature, not by eye. */
export const ROAD_HEADING_FREQ = 1 / 700;

/* Two stretches of road this many samples apart in arc length are treated as
   different branches of the route when the ground between them is shaped.
   Anything closer is the same stretch and must not be double counted.

   Under ROAD_MAX_HEADING this cannot currently fire: 120 samples guarantees
   at least 195 m of downrange separation, which is past ROAD_BLEND_DIST, so
   no second branch is ever in range. The multi-branch path in `query` and
   `sampleGround` is therefore dormant rather than dead - it is what makes the
   ground correct if the heading bound is ever loosened, and while the bound
   holds it costs two comparisons per candidate and never runs its scan.
   Do not remove one without the other. */
export const ROAD_BRANCH_SEP = 120;

/* How deep the tarmac is bedded into the ground it crosses.

   The paved quad is flat across its width and straight along each 4 m sample,
   while the ground it sits on is a 4 m grid that shares none of those corners.
   Two piecewise-linear surfaces sampled on different lattices interpenetrate,
   and at 6 cm of clearance the ground was coming through the road on 1-3% of
   its area - visible as the surface breaking up into steps on a gradient.
   Sinking the roadbed makes that structurally impossible rather than a matter
   of tuning; 45 cm covers the worst measured discretisation error (40 cm) and
   is invisible as a trough because the tarmac fills it. */
export const ROADBED_DROP = 0.45;

/* How far the landscape takes to rise from the road bed to its natural
   height. This is the other half of the same trade-off: the earthwork depth
   is set by the gradient limit, and this decides whether that depth arrives
   as a cliff or as a shoulder. At the old 84 m it was a 49 degree bank at the
   90th percentile; at 150 m the same cut lands near 28. Bounded above by how
   far queryRoad can see - see CELL. */
export const ROAD_BLEND_DIST = 150;

/* ---- terrain ---- */
export const CHUNK = 132; // chunk world size in metres
export const RES = 33; // quads per chunk side (4 m grid)

/* ---- climate ----
   Frequency is chosen from driving time, not from how the noise looks, and
   it was measured rather than guessed. The autopilot averages roughly
   40 m/s; these values put the median unbroken biome stretch at ~11.5 km,
   which is a little under five minutes.

   The number is much lower than the stretch length would suggest, because a
   path through climate space grazes several anchors on the way between two
   of them. At 1/13000 the median stretch was 1.9 km - biomes flickered past
   in under a minute and never reached a pure core. Retune by measuring
   stretch length, not by looking at the field.

   The two fields differ slightly so temperature and moisture never move
   together and trace only a diagonal through climate space. */
export const CLIMATE_TEMP_FREQ = 1 / 60000;
export const CLIMATE_MOIST_FREQ = 1 / 51000;

/* ---- scatter budgets ---- */
export const GRASS_CAP = 4200;
export const FLOWER_CAP = 320;

/* ---- car ---- */
export const MAX_SPEED = 69; // m/s, ~250 km/h, factory-limited
export const MAX_REV = 9;
export const GEAR_TOPS = [9, 15, 22, 30, 39, 49, 59, 69]; // m/s, 8-speed

/* ---- shadows ---- */
export const SHADOW_EXT = 60;
export const SHADOW_DIST = 260;
export const SHADOW_MAP_SIZE = 2048;

/* ---- precipitation ---- */
export const RAIN_N = 800;
export const RAIN_VEL = 36;
export const SNOW_N = 1000;
