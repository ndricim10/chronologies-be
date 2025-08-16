import * as path from "path";
import multer from "multer";

const upload = multer({ dest: path.join(__dirname, "../../uploads") });
export const uploadMiddleware = upload.single("file");
