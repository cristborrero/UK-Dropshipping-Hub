import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    console.error('[HttpExceptionFilter]', exception);
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res.message as string) ?? message;

        // class-validator returns message as array
        if (Array.isArray(res.message)) {
          message = 'Validation failed';
          errors = { validation: res.message as string[] };
        }
      }
    }

    response.status(status).json({
      status,
      message,
      ...(errors && { errors }),
    });
  }
}
