import type { ReactNode } from "react";
import type { RoomType } from "@/domain/models";

type Pictogram = "photography" | "filmmaking" | "workshop" | "recording" | "podcast" | "livestream" | "multipurpose" | "cyclorama" | "fashion" | "set" | "greenscreen" | "acoustic";

// Presentation lookup only: links and filter values still use the original category.
const categoryPictograms = {
  "Cyclorama Studio": "cyclorama",
  "Lookbook & Fashion": "fashion",
  "Concept & Set Design": "set",
  "Green Screen & VFX": "greenscreen",
  "Acoustic Soundstage": "acoustic",
  "Podcast & Livestream Hub": "podcast",
  "Livestream & E-commerce": "livestream",
  "Workshop & Event Studio": "workshop",
  "Music Recording Studio": "recording",
  "Chụp ảnh": "photography",
  "Quay phim": "filmmaking",
  Workshop: "workshop",
  "Thu âm": "recording",
  Podcast: "podcast",
  Livestream: "livestream",
  "Đa năng": "multipurpose",
  Multipurpose: "multipurpose",
} as const satisfies Record<string, Pictogram>;

function pictogramFor(category: RoomType["category"]): Pictogram {
  return Object.hasOwn(categoryPictograms, category)
    ? categoryPictograms[category as keyof typeof categoryPictograms]
    : "multipurpose";
}

const camera = <>
  <path className="pictogram-paper" d="M34 31h23l7-12h29l8 12h25v53H34z" />
  <path className="pictogram-solid" d="M43 25h10v6H43z" />
  <circle className="pictogram-spot" cx="80" cy="57" r="21" />
  <circle className="pictogram-solid" cx="80" cy="57" r="10" />
  <path d="M45 42h8m58 0h5" />
</>;

const microphone = <>
  <rect className="pictogram-paper" x="65" y="13" width="30" height="47" rx="15" />
  <path d="M66 29h12m-12 10h12m4-10h12M82 39h12M66 49h28M55 45v10a25 25 0 0 0 50 0V45M80 80v10M65 90h30" />
</>;

const pictograms = {
  cyclorama: <>
    <path className="pictogram-paper" d="M35 13h90v76H35z" />
    <path className="pictogram-spot" d="M35 13h90v39c0 16-17 26-45 26H35z" />
    <path d="M35 52c0 17 17 26 45 26M23 26v57m-8 6 8-9 8 9M137 26v57m-8 6 8-9 8 9" />
  </>,
  fashion: <>
    <path d="M30 89V20h100v69M22 89h16m84 0h16M80 23v9m-6 0a6 6 0 1 1 6 6v5" />
    <path className="pictogram-spot" d="m80 43-30 16h60z" />
    <path className="pictogram-paper" d="m65 60-8 24h46l-8-24M58 45l-13 7-6 18 12 3 7-12m44-16 13 7 6 18-12 3-7-12" />
  </>,
  set: <>
    <path className="pictogram-paper" d="M29 83V21h49v62z" />
    <path className="pictogram-spot" d="M61 83V49a25 25 0 0 1 50 0v34z" />
    <circle className="pictogram-paper" cx="120" cy="28" r="13" />
    <path className="pictogram-paper" d="M97 68h39v19H97z" /><path d="M23 88h119" />
  </>,
  greenscreen: <>
    <path className="pictogram-spot" d="M27 17h106v61H27z" />
    <path d="M27 29v-12h13m80 0h13v12M38 78l-9 12m93-12 9 12" />
    <rect className="pictogram-paper" x="56" y="46" width="43" height="29" />
    <path className="pictogram-paper" d="m99 54 17-8v29l-17-8z" /><path d="M77 75v15m0-9-12 9m12-9 12 9" />
  </>,
  acoustic: <>
    <path className="pictogram-paper" d="M27 20h22v63H27zm84 0h22v63h-22z" />
    <path d="M34 30v43m8-43v43m76-43v43m8-43v43" />
    <path className="pictogram-accent-line" d="M60 45v14m10-30v47m10-55v63m10-55v47m10-31v14" />
  </>,
  photography: camera,
  filmmaking: <>
    <path className="pictogram-paper" d="M35 42h91v42H35z" />
    <path className="pictogram-paper" d="m33 23 87-10 3 17-87 10z" />
    <path className="pictogram-solid" d="m46 22 12-2 11 16-12 1zm30-4 12-1 11 15-12 1zm30-4 12-1 3 5 1 10-6 1z" />
    <path d="M36 53h88" />
    <path className="pictogram-spot" d="m72 61 17 8-17 8z" />
  </>,
  workshop: <>
    <path className="pictogram-paper" d="M37 19h86v51H37z" />
    <path className="pictogram-solid" d="M33 15h94v7H33z" />
    <path d="M80 71v18M80 76 61 91m19-15 19 15" />
    <path className="pictogram-spot" d="M49 48h10v11H49zm20-9h10v20H69z" />
    <path className="pictogram-accent-line" d="m90 46 18-14m-12 0h12v12" />
  </>,
  recording: <>
    {microphone}
    <path className="pictogram-accent-line" d="M25 44v14m10-24v34m10-19v5m70-5v5m10-20v34m10-24v14" />
  </>,
  podcast: <>
    {microphone}
    <path className="pictogram-accent-line" d="M52 24a35 35 0 0 0 0 36m-12-48a51 51 0 0 0 0 60m68-48a35 35 0 0 1 0 36m12-48a51 51 0 0 1 0 60" />
  </>,
  livestream: <>
    <path className="pictogram-paper" d="M35 36h64v45H35z" />
    <path className="pictogram-spot" d="m99 49 25-12v44L99 68z" />
    <circle className="pictogram-solid" cx="50" cy="50" r="4" />
    <path className="pictogram-accent-line" d="M81 26a18 18 0 0 1 18-10m-18 1a27 27 0 0 1 27-10" />
  </>,
  multipurpose: <>
    <path className="pictogram-paper" d="M37 20h86v65H37z" />
    <path d="M80 20v29m0 15v21M37 52h28m30 0h28" />
    <path className="pictogram-spot" d="M49 32h17v10H49zm43 32h18v10H92z" />
    <circle className="pictogram-solid" cx="103" cy="35" r="6" />
  </>,
} satisfies Record<Pictogram, ReactNode>;

export function StudioCategoryIllustration({ category }: { category: RoomType["category"] }) {
  return (
    <div className="category-illustration" aria-hidden="true">
      <svg viewBox="0 0 160 100" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter" focusable="false">
        {pictograms[pictogramFor(category)]}
      </svg>
    </div>
  );
}
