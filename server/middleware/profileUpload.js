/**
 * Profile photo upload middleware — multer configuration.
 * - Max file size: 2MB
 * - Allowed types: jpg, jpeg, png
 * - Filename sanitization to prevent path traversal
 */
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../public/uploads/profiles');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Generate safe filename: userId_timestamp_random.ext
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = `${req.user.id}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
        cb(null, safeName);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    const allowedExts = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Only .jpg, .jpeg and .png files are allowed.'), false);
    }
};

const profileUpload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter,
});

module.exports = profileUpload;
