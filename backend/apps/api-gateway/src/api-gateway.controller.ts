import {
  All,
  Controller,
  Req,
  Res,
  UseGuards,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  Body,
  Query,
  Param,
  HttpException,
  Get,
  UseFilters,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';

import { ApiGatewayService } from './api-gateway.service';
import { JwtAuthGuard, RolesGuard } from '@yaluride/auth';
import { Roles, UserRole, UserDecorator, User, AllExceptionsFilter } from '@yaluride/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { SERVICE_NAMES } from './api-gateway.module';

/*
 * NOTE on Security Best Practices implemented here vs in main.ts:
 * - Helmet: For security headers (XSS protection, etc.), call `app.use(helmet())` in `main.ts`.
 * - Global Exception Filter: To catch all unhandled errors consistently, use `app.useGlobalFilters(new AllExceptionsFilter())` in `main.ts`.
 * - CORS: Enable CORS with `app.enableCors()` in `main.ts`, specifying allowed origins for production.
 * - Rate Limiting: The ThrottlerGuard is applied globally here but can also be configured globally in the module imports.
 */

@ApiTags('API Gateway')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ThrottlerGuard) // Apply JWT Auth and Rate Limiting to the entire controller.
@UseFilters(new AllExceptionsFilter()) // Apply a standardized exception filter.
@Controller('api')
export class ApiGatewayController {
  private readonly logger = new Logger(ApiGatewayController.name);

  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  /**
   * Example of a specific, role-protected route handled by the gateway.
   * This demonstrates how to lock down endpoints to specific roles.
   */
  @Get('admin/stats')
  @UseGuards(RolesGuard) // Apply the RolesGuard specifically for this endpoint.
  @Roles(UserRole.ADMIN) // Specify that only users with the 'ADMIN' role can access this.
  @ApiOperation({
    summary: 'Get Platform Statistics (Admin Only)',
    description: 'A protected endpoint to fetch high-level statistics, demonstrating role-based access control at the gateway.',
  })
  @ApiResponse({ status: 200, description: 'Platform statistics retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User does not have the required ADMIN role.' })
  async getAdminStats(@UserDecorator() user: User) {
    this.logger.log(`Admin user ${user.id} requesting platform stats.`);
    // Forward the request to the 'admin' service to get the stats.
    const payload = { user }; // Forward user context
    return this.apiGatewayService.send(SERVICE_NAMES.ADMIN_SERVICE, 'get_platform_stats', payload);
  }

  /**
   * A catch-all route handler that proxies requests to the appropriate microservice.
   * It dynamically determines the target service and command from the request URL.
   *
   * @param req The incoming Express request object.
   * @param res The outgoing Express response object.
   * @param user The authenticated user object, injected by the JwtAuthGuard and User decorator.
   * @param body The request body.
   * @param query The request query parameters.
   */
  @All(':service/*')
  @ApiOperation({
    summary: 'Generic Microservice Proxy',
    description: `
      This endpoint acts as a proxy to all backend microservices.
      The URL structure is /api/{service_name}/{path}.
      - {service_name}: The name of the target service (e.g., 'users', 'rides').
      - {path}: The specific action or resource path to execute on that service.
      The request body, query parameters, and authenticated user context are forwarded.
    `,
  })
  @ApiParam({ name: 'service', description: 'The name of the target microservice', type: String })
  async proxyRequest(
    @Req() req: Request,
    @Res() res: Response,
    @UserDecorator() user: User,
    @Body() body: any,
    @Query() query: any,
    @Param('service') serviceParam: string,
  ) {
    const { originalUrl, method } = req;
    
    // Extract the command/path from the URL. e.g., in /api/users/profile, 'profile' is the command.
    // req.params[0] will contain the path part after the service name.
    const path = req.params[0];

    // Map the URL parameter to the service constant (e.g., 'users' -> 'USER_SERVICE')
    const serviceNameKey = `${serviceParam.toUpperCase()}_SERVICE`;
    const serviceName = SERVICE_NAMES[serviceNameKey as keyof typeof SERVICE_NAMES];

    if (!serviceName) {
      this.logger.warn(`Invalid service name requested: '${serviceParam}' from URL ${originalUrl}`);
      throw new NotFoundException(`The requested service '${serviceParam}' could not be found.`);
    }

    this.logger.log(
      `[${method}] Request for ${originalUrl} -> Forwarding to service: ${serviceName}, path: ${path}`
    );

    try {
      // Construct a unified payload to send to the microservice.
      // This includes the authenticated user, body, query params, and any other relevant context.
      const payload = {
        user, // Authenticated user context
        body,
        query,
        params: req.params, // Forward path parameters as well
        path, // Forward the specific sub-path
        // You could add more context here, like IP address, user-agent, etc.
        // context: { ip: req.ip, userAgent: req.get('user-agent') }
      };

      // The service will forward the request and return the response from the microservice.
      // The service layer is responsible for handling the actual HTTP request and error translation.
      const result = await this.apiGatewayService.forwardRequest(serviceName, req);
      
      // Pipe the response headers and status code from the downstream service to the client
      Object.keys(result.headers).forEach(key => {
        res.setHeader(key, result.headers[key]);
      });
      res.status(result.status).json(result.data);

    } catch (error) {
      // Refined error handling
      if (error instanceof HttpException) {
        // If the error is already a known HTTP exception (e.g., from the service layer), re-throw it.
        // This preserves the status code and message from the downstream service.
        this.logger.warn(`Forwarded request failed with status ${error.getStatus()}: ${error.message}`);
        throw error;
      }

      // For unexpected or non-HTTP errors, log the full error and return a generic 500 response.
      this.logger.error(`Unhandled error while proxying request for ${originalUrl}:`, error.stack);
      throw new InternalServerErrorException('An unexpected error occurred while processing your request.');
    }
  }
}
