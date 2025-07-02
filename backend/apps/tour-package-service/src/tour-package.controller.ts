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
    TourPackageDto,
    TourBookingDto,
} from './dto/tour-package.dto';

@ApiTags('Tourist Packages')
@Controller('tours')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class TourPackageController {
    private readonly logger = new Logger(TourPackageController.name);

    constructor(private readonly tourPackageService: TourPackageService) {}

    // --- Public Endpoints ---

    @Get('/')
    @ApiOperation({ summary: 'List all active tour packages' })
    @ApiResponse({ status: 200, description: 'A list of active tour packages.', type: [TourPackageDto] })
    async findActivePackages(): Promise<TourPackageDto[]> {
        this.logger.log('Fetching all active tour packages for public view.');
        const packages = await this.tourPackageService.findActivePackages();
        return packages.map(pkg => new TourPackageDto(pkg));
    }

    @Get('/:packageId')
    @ApiOperation({ summary: 'Get details of a specific tour package' })
    @ApiParam({ name: 'packageId', description: 'The UUID of the tour package.' })
    @ApiResponse({ status: 200, description: 'The tour package details.', type: TourPackageDto })
    @ApiResponse({ status: 404, description: 'Tour package not found.' })
    async findPackageById(@Param('packageId', ParseUUIDPipe) packageId: string): Promise<TourPackageDto> {
        this.logger.log(`Fetching details for tour package ${packageId}`);
        const tourPackage = await this.tourPackageService.findPackageById(packageId);
        return new TourPackageDto(tourPackage);
    }

    // --- Driver-Specific Endpoints ---

    @Post('/')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.DRIVER, UserRole.BOTH)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new tour package (Driver only)' })
    @ApiResponse({ status: 201, description: 'The tour package has been successfully created.', type: TourPackageDto })
    @ApiResponse({ status: 403, description: 'Forbidden. User is not a driver.' })
    async createPackage(
        @UserDecorator() user: User,
        @Body() createDto: CreateTourPackageDto,
    ): Promise<TourPackageDto> {
        this.logger.log(`Driver ${user.id} creating new tour package: "${createDto.title}"`);
        const newPackage = await this.tourPackageService.createPackage(user.id, createDto);
        return new TourPackageDto(newPackage);
    }

    @Put('/:packageId')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.DRIVER, UserRole.BOTH)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update an existing tour package (Driver only)' })
    @ApiParam({ name: 'packageId', description: 'The UUID of the tour package to update.' })
    @ApiResponse({ status: 200, description: 'The tour package has been successfully updated.', type: TourPackageDto })
    async updatePackage(
        @UserDecorator() user: User,
        @Param('packageId', ParseUUIDPipe) packageId: string,
        @Body() updateDto: UpdateTourPackageDto,
    ): Promise<TourPackageDto> {
        this.logger.log(`Driver ${user.id} updating tour package ${packageId}`);
        const updatedPackage = await this.tourPackageService.updatePackage(user.id, packageId, updateDto);
        return new TourPackageDto(updatedPackage);
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
        this.logger.log(`Driver ${user.id} deleting tour package ${packageId}`);
        return this.tourPackageService.deletePackage(user.id, packageId);
    }

    @Put('/:packageId/itinerary')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.DRIVER, UserRole.BOTH)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Set or update the itinerary for a tour package (Driver only)' })
    @ApiParam({ name: 'packageId', description: 'The UUID of the tour package.' })
    @ApiBody({ type: [ItineraryItemDto] })
    @ApiResponse({ status: 200, description: 'Itinerary updated successfully.', type: TourPackageDto })
    async addOrUpdateItinerary(
        @UserDecorator() user: User,
        @Param('packageId', ParseUUIDPipe) packageId: string,
        @Body() itemsDto: ItineraryItemDto[],
    ): Promise<TourPackageDto> {
        this.logger.log(`Driver ${user.id} updating itinerary for tour package ${packageId}`);
        const updatedPackage = await this.tourPackageService.addOrUpdateItineraryItems(user.id, packageId, itemsDto);
        return new TourPackageDto(updatedPackage);
    }

    // --- Passenger-Specific Endpoints ---

    @Post('/bookings')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.PASSENGER, UserRole.BOTH)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Book a tour package (Passenger only)' })
    @ApiResponse({ status: 201, description: 'Booking request created successfully.', type: TourBookingDto })
    @ApiResponse({ status: 400, description: 'Bad Request (e.g., too many travelers).' })
    @ApiResponse({ status: 404, description: 'Tour package not found or inactive.' })
    async createBooking(
        @UserDecorator() user: User,
        @Body() createBookingDto: CreateTourBookingDto,
    ): Promise<TourBookingDto> {
        this.logger.log(`Passenger ${user.id} booking tour package ${createBookingDto.tourPackageId}`);
        const booking = await this.tourPackageService.createBooking(user.id, createBookingDto);
        return new TourBookingDto(booking);
    }

    // --- Endpoints for Both Drivers & Passengers (Contextual) ---

    @Patch('/bookings/:bookingId/respond')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.DRIVER, UserRole.BOTH) // Only drivers can respond
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Respond to a booking request (Driver only)' })
    @ApiParam({ name: 'bookingId', description: 'The UUID of the booking.' })
    @ApiBody({ type: RespondToBookingDto })
    @ApiResponse({ status: 200, description: 'Booking status updated.', type: TourBookingDto })
    async respondToBooking(
        @UserDecorator() user: User,
        @Param('bookingId', ParseUUIDPipe) bookingId: string,
        @Body() responseDto: RespondToBookingDto,
    ): Promise<TourBookingDto> {
        this.logger.log(`Driver ${user.id} responding to booking ${bookingId} with status ${responseDto.status}`);
        const booking = await this.tourPackageService.respondToBooking(user.id, bookingId, responseDto);
        return new TourBookingDto(booking);
    }

    @Patch('/bookings/:bookingId/cancel')
    @UseGuards(JwtAuthGuard) // Any authenticated user can try, service logic will check ownership
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cancel a tour booking (Passenger or Driver)' })
    @ApiParam({ name: 'bookingId', description: 'The UUID of the booking to cancel.' })
    @ApiResponse({ status: 200, description: 'Booking cancelled successfully.', type: TourBookingDto })
    async cancelBooking(
        @UserDecorator() user: User,
        @Param('bookingId', ParseUUIDPipe) bookingId: string,
    ): Promise<TourBookingDto> {
        this.logger.log(`User ${user.id} requested to cancel booking ${bookingId}`);
        const booking = await this.tourPackageService.cancelBooking(user.id, bookingId);
        return new TourBookingDto(booking);
    }
}
