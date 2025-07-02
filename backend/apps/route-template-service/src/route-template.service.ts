import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RouteTemplate } from './core/entities/route-template.entity';
import {
  CreateRouteTemplateDto,
  UpdateRouteTemplateDto,
} from './core/dto/route-template.dto';

@Injectable()
export class RouteTemplateService {
  private readonly logger = new Logger(RouteTemplateService.name);

  constructor(
    @InjectRepository(RouteTemplate)
    private readonly routeTemplateRepository: Repository<RouteTemplate>,
  ) {}

  /**
   * Creates a new route template for a specific driver.
   * @param createDto - The data for the new template.
   * @param driverId - The ID of the driver creating the template.
   * @returns The newly created route template.
   */
  async createTemplate(
    createDto: CreateRouteTemplateDto,
    driverId: string,
  ): Promise<RouteTemplate> {
    try {
      const newTemplate = this.routeTemplateRepository.create({
        ...createDto,
        driver_id: driverId,
      });

      const savedTemplate = await this.routeTemplateRepository.save(newTemplate);
      this.logger.log(`Driver ${driverId} created new route template ${savedTemplate.id}`);
      return savedTemplate;
    } catch (error) {
      this.logger.error(`Failed to create template for driver ${driverId}`, error.stack);
      throw new InternalServerErrorException('Could not create the route template.');
    }
  }

  /**
   * Retrieves all route templates for a given driver.
   * @param driverId - The ID of the driver whose templates are to be retrieved.
   * @returns An array of route templates.
   */
  async getTemplatesByDriver(driverId: string): Promise<RouteTemplate[]> {
    this.logger.log(`Fetching templates for driver ${driverId}`);
    try {
      return await this.routeTemplateRepository.find({
        where: { driver_id: driverId },
        order: { updated_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to fetch templates for driver ${driverId}`, error.stack);
      throw new InternalServerErrorException('Could not retrieve route templates.');
    }
  }

  /**
   * Retrieves a single route template by its ID, ensuring it belongs to the specified driver.
   * @param templateId - The ID of the template to retrieve.
   * @param driverId - The ID of the driver requesting the template.
   * @returns The requested route template.
   */
  async getTemplateById(templateId: number, driverId: string): Promise<RouteTemplate> {
    const template = await this.routeTemplateRepository.findOneBy({ id: templateId });
    if (!template) {
      throw new NotFoundException(`Route template with ID ${templateId} not found.`);
    }
    if (template.driver_id !== driverId) {
      throw new ForbiddenException('You do not have permission to access this template.');
    }
    return template;
  }

  /**
   * Updates an existing route template.
   * Verifies that the user attempting the update is the owner of the template.
   * @param templateId - The ID of the template to update.
   * @param updateDto - The data to update the template with.
   * @param driverId - The ID of the driver making the request.
   * @returns The updated route template.
   */
  async updateTemplate(
    templateId: number,
    updateDto: UpdateRouteTemplateDto,
    driverId: string,
  ): Promise<RouteTemplate> {
    const template = await this.getTemplateById(templateId, driverId); // Re-uses ownership check

    try {
      // Merge the new data into the existing template entity
      this.routeTemplateRepository.merge(template, updateDto);
      const updatedTemplate = await this.routeTemplateRepository.save(template);

      this.logger.log(`Driver ${driverId} updated route template ${templateId}`);
      return updatedTemplate;
    } catch (error) {
      this.logger.error(`Failed to update template ${templateId} for driver ${driverId}`, error.stack);
      throw new InternalServerErrorException('Could not update the route template.');
    }
  }

  /**
   * Deletes a route template.
   * Verifies that the user attempting the deletion is the owner of the template.
   * @param templateId - The ID of the template to delete.
   * @param driverId - The ID of the driver making the request.
   */
  async deleteTemplate(templateId: number, driverId: string): Promise<void> {
    const template = await this.getTemplateById(templateId, driverId); // Re-uses ownership check

    try {
      const result = await this.routeTemplateRepository.delete(template.id);
      if (result.affected === 0) {
        // This case should ideally not be reached due to the check above, but it's a safeguard.
        throw new NotFoundException(`Route template with ID ${templateId} not found.`);
      }
      this.logger.log(`Driver ${driverId} deleted route template ${templateId}`);
    } catch (error) {
      this.logger.error(`Failed to delete template ${templateId} for driver ${driverId}`, error.stack);
      throw new InternalServerErrorException('Could not delete the route template.');
    }
  }
}
