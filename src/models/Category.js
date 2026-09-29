import mongoose from 'mongoose';
import { slugify } from './Blog.js';

const categorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Category title is required'],
      trim: true,
      maxlength: [100, 'Category title cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Category description cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-validate hook to normalize and slugify slug or title
categorySchema.pre('validate', function (next) {
  if (this.slug) {
    this.slug = slugify(this.slug);
  } else if (this.title) {
    this.slug = slugify(this.title);
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);

export default Category;
