const sharp = require("sharp");
const fs = require("node:fs");
const base =
  "C:/Users/Admin/.codex/generated_images/01a11f72-f93f-7f20-b7a7-ab4878b10b85/";
const files = {
  daylight: "exec-8a799bd3-5057-4a7a-9d94-99a7e90504d2.png",
  loft: "exec-e6adbf20-ae11-405d-bee8-a4a2d48cc20e.png",
  podcast: "exec-d96a3677-5814-4399-a73e-f128e44158db.png",
};
Promise.all(
  Object.entries(files).map(([key, file]) =>
    sharp(base + file)
      .resize({ width: 1400, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile("public/images/" + key + ".jpg"),
  ),
).then(() => {
  fs.copyFileSync("public/images/daylight.jpg", "public/images/corner.jpg");
  fs.copyFileSync("public/images/loft.jpg", "public/images/equipment.jpg");
  console.log(
    "Saved and optimized 3 original generated assets and 2 shared references.",
  );
});
