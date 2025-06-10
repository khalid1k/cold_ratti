import { HttpStatus, HttpException } from '@nestjs/common';

export class SuccessResponse<T> {
  statusCode: number;
  message: string;
  data: T;

  constructor(statusCode: number, message: string, data: T) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  static create<T>(message: string, data: T): SuccessResponse<T> {
    return new SuccessResponse(HttpStatus.OK, message, data);
  }
}

export class ErrorResponse {
  statusCode: number;
  message: string;
  error: string;

  constructor(statusCode: number, message: string, error: string) {
    this.statusCode = statusCode;
    this.message = message;
    this.error = error;
  }

  static fromHttpException(exception: HttpException): ErrorResponse {
    const response = exception.getResponse();
    const message = typeof response === 'object' ? response['message'] : response;
    return new ErrorResponse(
      exception.getStatus(),
      Array.isArray(message) ? message.join(', ') : message,
      exception.name,
    );
  }
}