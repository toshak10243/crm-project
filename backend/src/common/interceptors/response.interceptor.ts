import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Saare successful responses is format mein wrap hote hain
// Controller jo bhi return kare — ye usse standard format mein dalta hai
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Agar controller ne already formatted response diya hai to as-is return karo
        if (data && data.success !== undefined) {
          return data;
        }

        // Standard success response format
        return {
          success: true,
          data: data?.data !== undefined ? data.data : data,
          message: data?.message || 'Success',
          ...(data?.meta && { meta: data.meta }),
        };
      }),
    );
  }
}