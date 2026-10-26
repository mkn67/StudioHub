import type { ReactNode } from "react";
import type { RoomType } from "@/domain/models";

type Pictogram = "photography" | "filmmaking" | "workshop" | "recording" | "podcast" | "livestream" | "multipurpose";

// Presentation lookup only: links and filter values still use the original category.
const categoryPictograms = {
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
