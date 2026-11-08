import { FastifyPluginAsync } from 'fastify';
import fs from 'fs';
import path from 'path';
import { saveUploadedFile, getUploadFilePath } from '../../shared/utils/storage.js';
import { AppError } from '../../core/errors/app-error.js';
import { HTTP_STATUS } from '../../config/constants.js';

export const uploadsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/uploads - Upload file
  fastify.post('/', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      throw new AppError('No file uploaded', HTTP_STATUS.BAD_REQUEST, 'NO_FILE');
    }

    const result = await saveUploadedFile(data.file, data.filename);
    return reply.status(201).send({
      success: true,
      data: result,
    });
  });

  // GET /api/v1/uploads/:filename - Retrieve file
  fastify.get('/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    const filePath = getUploadFilePath(filename);

    if (!filePath) {
      throw new AppError('File not found', HTTP_STATUS.NOT_FOUND, 'NOT_FOUND');
    }

    const stream = fs.createReadStream(filePath);
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.txt') contentType = 'text/plain';

    return reply.header('Content-Type', contentType).send(stream);
  });
};

