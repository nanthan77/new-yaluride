import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Logger,
    HttpCode,
    HttpStatus,
    ParseUUIDPipe,
    Query,
    UsePipes,
    ValidationPipe,
    Patch,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiBody,
    ApiParam,
} from '@nestjs/swagger';

import { TourPackageService } from './tour-package.service';
import { JwtAuthGuard } from '../../../../libs/auth/src/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../libs/auth/src/guards/roles.guard';
import { Roles } from '../../../../libs/common/src/decorators/roles.decorator';
import { User as UserDecorator } from '../../../../libs/common/src/decorators/user.decorator';
import { User } from '../../../../libs/common/src/types/user.type';
import { UserRole } from '../../../../libs/common/src/enums/user.enums';
import {
    CreateTourPackageDto,
    UpdateTourPackageDto,
    CreateTourBookingDto,
    RespondToBookingDto,
    ItineraryItemDto,
} from './dto/tour-package.dto';
import { TourPackage } from '../../../../libs/database/src/entities/tour-package.entity';
import { TourBooking } from '../../../../libs/database/src/entities/tour-booking.entity';

@ApiTags('Tourist Packages')
@Controller('tours')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class TourPackageController {
    private readonly logger = new Logger(TourPackageController.name);

    constructor(private readonly tourPackageService: TourPackageService) {}

    // --- Public Endpoints ---

    @Get('/')
    @ApiOperation({ summary: 'List all active tour packages' })
    @ApiResponse({ status: 200, description: 'A list of active tour packages.', type: [TourPackage] })
    async findActivePackages(): Promise<TourPackage[]> {
        return this.tourPackageService.findActivePackages();
    }

    @Get('/:packageId')
    @ApiOperation({ summary: 'Get details of a specific tour package' })
    @ApiParam({ name: 'packageId', description: 'The UUID of the tour package.' })
    @ApiResponse({ status: 200, description: 'The tour package details.', type: TourPackage })
    @ApiResponse({ status: 404, description: 'Tour package not found.' })
    async findPackageById(@Param('packageId', ParseUUIDPipe) packageId: string): Promise<TourPackage> {
        return this.tourPackageService.findPackageById(packageId);
    }

    // --- Driver-Specific Endpoints ---

    @Post('/')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.DRIVER, UserRole.BOTH)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new tour package (Driver only)' })
    @ApiResponse({ status: 201, description: 'The tour package has been successfully created.', type: TourPackage })
    @ApiResponse({ status: 403, description: 'Forbidden. User is not a driver.' })
    async createPackage(
        @UserDecorator() user: User,
        @Body() createDto: CreateTourPackageDto,
    ): Promise<TourPackage> {
        return this.tourPackageService.createPackage(user.id, createDto);
    }

    @Put('/:packageId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.DRIVER, UserRole.BOTH)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update an existing tour package (Driver only)' })
    @ApiParam({ name: 'packageId', description: 'The UUID of the tour package to update.' })
    @ApiResponse({ status: 200, description: 'The tour package has been successfully updated.', type: TourPackage })
    async updatePackage(
        @UserDecorator() user: User,
        @Param('packageId', ParseUUIDPipe) packageId: string,
        @Body() updateDto: UpdateTourPackageDto,
    ): Promise<TourPackage> {
        return this.tourPackageService.updatePackage(user.id, packageId, updateDto);
    }

    @Delete('/:packageId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.DRIVER, UserRole.BOTH)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a tour package (Driver only)' })
    @ApiParam({ name: 'packageId', description: 'The UUID of the tour package to delete.' })
    @ApiResponse({ status: 204, description: 'The tour package has been successfully deleted.' })
    async deletePackage(
        @UserDecorator() user: User,
        @Param('packageId', ParseUUIDPipe) packageId: string,
    ): Promise<void> {
        return this.tourPackageService.deletePackage(user.id, packageId);
    }

    @Put('/:packageId/itinerary')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.DRIVER, UserRole.BOTH)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Set or update the itinerary for a tour package (Driver only)' })
    @ApiParam({ name: 'packageId', description: 'The UUID of the tour package.' })
    @ApiBody({ type: [ItineraryItemDto] })
    @ApiResponse({ status: 200, description: 'Itinerary updated successfully.', type: TourPackage })
    async addOrUpdateItinerary(
        @UserDecorator() user: User,
        @Param('packageId', ParseUUIDPipe) packageId: string,
        @Body() itemsDto: ItineraryItemDto[],
    ): Promise<TourPackage> {
        return this.tourPackageService.addOrUpdateItineraryItems(user.id, packageId, itemsDto);
    }

    // --- Passenger-Specific Endpoints ---

    @Post('/bookings')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PASSENGER, UserRole.BOTH)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Book a tour package (Passenger only)' })
    @ApiResponse({ status: 201, description: 'Booking request created successfully.', type: TourBooking })
    @ApiResponse({ status: 400, description: 'Bad Request (e.g., too many travelers).' })
    @ApiResponse({ status: 404, description: 'Tour package not found or inactive.' })
    async createBooking(
        @UserDecorator() user: User,
        @Body() createBookingDto: CreateTourBookingDto,
    ): Promise<TourBooking> {
        return this.tourPackageService.createBooking(user.id, createBookingDto);
    }

    // --- Endpoints for Both Drivers & Passengers (Contextual) ---

    @Patch('/bookings/:bookingId/respond')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.DRIVER, UserRole.BOTH) // Only drivers can respond
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Respond to a booking request (Driver only)' })
    @ApiParam({ name: 'bookingId', description: 'The UUID of the booking.' })
    @ApiBody({ type: RespondToBookingDto })
    @ApiResponse({ status: 200, description: 'Booking status updated.', type: TourBooking })
    async respondToBooking(
        @UserDecorator() user: User,
        @Param('bookingId', ParseUUIDPipe) bookingId: string,
        @Body() responseDto: RespondToBookingDto,
    ): Promise<TourBooking> {
        return this.tourPackageService.respondToBooking(user.id, bookingId, responseDto);
    }

    // A passenger might have a similar endpoint to cancel their booking
    @Patch('/bookings/:bookingId/cancel')
    @UseGuards(JwtAuthGuard) // Any authenticated user can try, service logic will check ownership
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cancel a tour booking (Passenger or Driver)' })
    @ApiParam({ name: 'bookingId', description: 'The UUID of the booking to cancel.' })
    @ApiResponse({ status: 200, description: 'Booking cancelled successfully.', type: TourBooking })
    async cancelBooking(
        @UserDecorator() user: User,
        @Param('bookingId', ParseUUIDPipe) bookingId: string,
    ): Promise<TourBooking> {
        // The service needs a method to handle cancellations from either party
        // return this.tourPackageService.cancelBooking(user.id, bookingId);
        this.logger.log(`User ${user.id} requested to cancel booking ${bookingId}`);
        // Placeholder for the actual service call
        return {} as any;
    }
}
