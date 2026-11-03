import type { ScratchMapTheme } from '@/features/quiz/scratchMapConfig';

const TREE_POSITIONS = [
  [190, 205], [265, 280], [405, 185], [515, 302], [742, 190], [885, 280], [1010, 190], [1080, 420],
] as const;

function PixelTree({ x, y, snow = false }: { x: number; y: number; snow?: boolean }) {
  return (
    <g shapeRendering="crispEdges">
      <rect x={x + 20} y={y + 62} width="18" height="34" fill="#5b3824" />
      <path d={`M${x + 29} ${y} l-34 45 h20 l-31 38 h91 l-31-38 h20z`} fill={snow ? '#244b64' : '#176b3b'} />
      {snow && <path d={`M${x + 29} ${y} l-13 18 h12 l-10 14 h26 l-10-14 h12z`} fill="#eefaff" />}
      {!snow && <rect x={x + 8} y={y + 48} width="14" height="8" fill="#42b85a" />}
    </g>
  );
}

function BeginnerScene() {
  return (
    <>
      <rect width="1200" height="675" fill="#2c9ab2" />
      <path d="M0 110h1200v565H0z" fill="#3299ae" />
      <path d="M70 440h64v-48h76v-50h105v-58h160v-44h190v36h133v54h144v61h120v49h55v171H70z" fill="#e7c979" />
      <path d="M100 432h60v-45h85v-48h108v-46h160v-35h178v34h130v51h143v55h121v52h55v158H100z" fill="#62bf56" />
      <path d="M410 320h176v58H410zM645 415h198v48H645zM205 500h178v48H205z" fill="#8ad66a" />
      {TREE_POSITIONS.map(([x, y]) => <PixelTree key={`${x}-${y}`} x={x} y={y} />)}
      <g shapeRendering="crispEdges">
        <rect x="850" y="365" width="112" height="88" fill="#f4d38a" /><path d="M832 368l74-64 74 64z" fill="#d46b45" />
        <rect x="873" y="398" width="25" height="55" fill="#74452e" /><rect x="919" y="388" width="25" height="24" fill="#9ce5ee" />
        <rect x="142" y="540" width="105" height="13" fill="#fff0bc" /><rect x="1035" y="170" width="80" height="13" fill="#fff0bc" />
      </g>
      <path d="M0 592h290v24H0zM950 110h250v22H950z" fill="#68c8d5" opacity=".65" />
    </>
  );
}

function IntermediateScene() {
  return (
    <>
      <rect width="1200" height="675" fill="#193d5a" />
      <path d="M80 500h94v-70h120v-88h144v-70h145v-64h160v45h118v68h130v77h126v177H80z" fill="#d8eef1" />
      <path d="M108 504h104v-65h126v-84h137v-70h150v-60h120v48h124v67h122v75h139v160H108z" fill="#8fcbd6" />
      <path d="M268 510h164v-50h132v-52h176v53h157v49h150v165H268z" fill="#4f9ba9" />
      <path d="M505 520h220v-38h126v38h70v155H505z" fill="#287eaa" />
      {TREE_POSITIONS.map(([x, y]) => <PixelTree key={`${x}-${y}`} x={x} y={y} snow />)}
      <g shapeRendering="crispEdges">
        <rect x="744" y="328" width="25" height="146" fill="#805b42" /><rect x="792" y="328" width="25" height="146" fill="#805b42" />
        <rect x="744" y="365" width="73" height="16" fill="#d3a66c" /><rect x="744" y="420" width="73" height="16" fill="#d3a66c" />
        <rect x="900" y="240" width="142" height="110" fill="#a9d2df" /><path d="M886 242h36v-52h32v52h39v-67h34v67h31v26H886z" fill="#edfaff" />
        <rect x="944" y="304" width="27" height="46" fill="#345c78" /><rect x="995" y="278" width="24" height="25" fill="#f4d787" />
      </g>
      <path d="M105 167h150v15H105zM1030 520h126v14h-126z" fill="#c8f1f2" opacity=".8" />
    </>
  );
}

function AdvancedScene() {
  return (
    <>
      <rect width="1200" height="675" fill="#28263b" />
      <path d="M70 490h145v-65h130v-55h130v-86h170v-70h195v53h114v67h112v67h90v269H70z" fill="#b77b54" />
      <path d="M107 505h145v-61h130v-58h134v-82h169v-63h174v49h120v61h112v61h69v263H107z" fill="#5b5348" />
      <path d="M662 243h40v113h-40zM702 356h40v94h-40zM742 450h48v61h-48z" fill="#42b9da" />
      <path d="M245 505h210v-38h130v42h124v-44h106v39h158v171H245z" fill="#e45b29" />
      <path d="M290 520h159v-20h96v21h150v-22h90v21h119v155H290z" fill="#ffb43b" />
      <g shapeRendering="crispEdges">
        <path d="M800 230h160v112H800z" fill="#6b564f" /><path d="M783 230h43v-45h38v45h39v-62h41v62h35v28H783z" fill="#8c7063" />
        <rect x="826" y="278" width="24" height="64" fill="#342e3a" /><rect x="884" y="266" width="26" height="24" fill="#ffbd56" />
        <rect x="180" y="335" width="85" height="80" fill="#78716b" /><rect x="164" y="320" width="117" height="18" fill="#a69b88" />
        <rect x="1040" y="385" width="94" height="82" fill="#777064" /><rect x="1027" y="369" width="122" height="18" fill="#b4a486" />
        <path d="M430 245h150v15H430zM460 220h105v15H460z" fill="#e6a45a" />
      </g>
      <path d="M0 602h200v18H0zM1000 128h200v18h-200z" fill="#e76b36" opacity=".72" />
    </>
  );
}

export function ScratchPixelMapScene({ theme }: { theme: ScratchMapTheme }) {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1200 675"
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      data-scratch-map-theme={theme}
    >
      {theme === 'beginner' ? <BeginnerScene /> : theme === 'intermediate' ? <IntermediateScene /> : <AdvancedScene />}
    </svg>
  );
}
