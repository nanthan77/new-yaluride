import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApiGatewayService } from '../api-gateway.service';

/**
 * Middleware to proxy incoming requests to the appropriate downstream microservice.
 * It intercepts all requests, identifies the target service from the URL,
 * and uses the ApiGatewayService to forward the request.
 */
@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  constructor(
    private readonly apiGatewayService: ApiGatewayService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // The 'user' object should be attached to the request by a preceding guard (e.g., JwtAuthGuard)
    // This middleware will run after authentication guards.

    // The ApiGatewayController's catch-all route will handle the proxying logic.
    // This middleware's primary role here is to ensure the request flow
    // continues to the controller. In more complex scenarios, it could perform
    // pre-proxy logic like request validation or transformation.

    // If we wanted the middleware to handle the proxying directly (instead of the controller),
    // the logic from ApiGatewayController's proxy method would be here.
    // For this implementation, we let the controller handle it to keep middleware light.

    const serviceName = req.params.service; // Assuming a route like /api/:service/*

    if (!this.apiGatewayService.getServiceUrl(serviceName)) {
      // If the service is not recognized, we can short-circuit here
      // or let it fall through to the controller's 404 handling.
      // Letting it fall through is often better for consistent error responses.
      return next();
    }
    
    // The request is valid for proxying, let it proceed to the ApiGatewayController
    next();
  }
}
