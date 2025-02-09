import multer from "multer";
const checkFiletype = (file, cb) => {
  const filetypes = /jpeg|png|jpg|avif|svg|pdf|webp/;
  // const =filetypes.test(path.extname(file.originalname)?.toLowercase())
  const extname = filetypes.test(file.mimetype);
  if (extname) {
    cb(null, true);
  } else {
    cb("you can only upload image and document files");
  }
};
export const uploadmiddleWare = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    checkFiletype(file, cb);
  },
});
