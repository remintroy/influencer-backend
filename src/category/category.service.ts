import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument, CategoryPaginationResponse } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const createdCategory = new this.categoryModel(createCategoryDto);
    return createdCategory.save();
  }

  async findAll({ page = 1, limit = 10 }: { page?: number; limit?: number }): Promise<CategoryPaginationResponse> {
    const skip = (page - 1) * limit;

    const result = await this.categoryModel.aggregate([
      { $match: { deleted: { $ne: false } } },
      { $sort: { name: 1, createdAt: 1 } },
      {
        $facet: {
          metadata: [{ $count: 'totalDocs' }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
      {
        $project: {
          totalDocs: { $ifNull: [{ $arrayElemAt: ['$metadata.totalDocs', 0] }, 0] },
          page: { $literal: page },
          limit: { $literal: limit },
          docs: '$data',
        },
      },
    ]);

    return result[0];
  }

  async findOne(id: string): Promise<Category | null> {
    return this.categoryModel.findById(id).exec();
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category | null> {
    return this.categoryModel.findByIdAndUpdate(id, updateCategoryDto, { new: true }).exec();
  }

  async remove(id: string): Promise<Category | null> {
    return this.categoryModel.findByIdAndDelete(id).exec();
  }
}
