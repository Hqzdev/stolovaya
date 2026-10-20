import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpErrorFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload =
      exception instanceof HttpException ? exception.getResponse() : null;
    let message =
      typeof payload === "string"
        ? payload
        : (payload as { message?: string | string[] } | null)?.message;
    if (Array.isArray(message))
      message = "Проверьте заполнение полей и выбранные фильтры.";
    if (status === 429)
      message = "Слишком много запросов. Повторите через минуту.";
    if (status >= 500) {
      this.logger.error(
        "Не удалось обработать запрос",
        exception instanceof Error ? exception.stack : undefined,
      );
      message = "Сервис временно недоступен. Попробуйте снова.";
    }
    response.status(status).json({
      statusCode: status,
      message: message || "Не удалось выполнить запрос.",
    });
  }
}
