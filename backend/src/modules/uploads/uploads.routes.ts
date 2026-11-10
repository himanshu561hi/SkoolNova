import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { saveUploadedFile, getUploadFilePath } from '../../shared/utils/storage.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export const uploadsRoutes = Router();

// POST /api/v1/uploads - Upload file
uploadsRoutes.post('/', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError('No file uploaded', HTTP_STATUS.BAD_REQUEST, 'NO_FILE');
  }

  const result = await saveUploadedFile(req.file.buffer, req.file.originalname);
  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: result,
  });
});

// GET /api/v1/uploads/:filename - Retrieve file
uploadsRoutes.get('/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params;
  const filePath = getUploadFilePath(filename);

  if (!filePath) {
    throw new AppError('File not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
  }

  const ext = path.extname(filename).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.pdf') contentType = 'application/pdf';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.txt') contentType = 'text/plain';

  res.setHeader('Content-Type', contentType);
  const stream = fs.createReadStream(filePath);
  return stream.pipe(res);
});
