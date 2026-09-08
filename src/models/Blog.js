import mongoose from 'mongoose';

/**
 * Helper to generate URL-friendly slug
 */
export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-') // Replace spaces, non-word chars, and hyphens with a single '-'
    .replace(/^-+|-+$/g, '');   // Remove leading and trailing hyphens
};

/**
 * Helper to calculate reading time from HTML/text content
 */
export const calculateReadingTime = (content) => {
  if (!content) return '1 min read';
  const textOnly = content.replace(/<[^>]*>/g, ' ').trim();
  const wordCount = textOnly.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return `${minutes} min read`;
};

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Blog title is required'],
      trim: true,
      maxlength: [300, 'Blog title cannot exceed 300 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Blog slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    shortDescription: {
      type: String,
      required: [true, 'Short description / excerpt is required'],
      trim: true,
      maxlength: [1000, 'Short description cannot exceed 1000 characters'],
    },
    content: {
      type: String,
      required: [true, 'Article body content is required'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    technology: {
      type: [String],
      default: [],
      index: true,
    },
    keywords: {
      type: [String],
      default: [],
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    author: {
      name: {
        type: String,
        default: 'Skylink Team',
        trim: true,
      },
      role: {
        type: String,
        default: 'EXIM & Logistics Specialist',
        trim: true,
      },
      avatar: {
        type: String,
        default: '',
        trim: true,
      },
    },
    estimatedReadTime: {
      type: String,
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
    featuredImage: {
      url: {
        type: String,
        default: '',
        trim: true,
      },
      publicId: {
        type: String,
        default: '',
        trim: true,
      },
    },
    featuredImagePublicId: {
      type: String,
      default: '',
      trim: true,
    },
    imageAltText: {
      type: String,
      default: '',
      trim: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field for 'excerpt' pointing to 'shortDescription' for frontend compatibility
blogSchema.virtual('excerpt').get(function () {
  return this.shortDescription;
});

// Virtual field for 'authorName' pointing to author.name for frontend compatibility
blogSchema.virtual('authorName').get(function () {
  if (this.author && typeof this.author === 'object') {
    return this.author.name || 'Skylink Team';
  }
  return typeof this.author === 'string' ? this.author : 'Skylink Team';
});

// Pre-save / pre-validate hook to format fields, slug, reading time & publishedAt
blogSchema.pre('validate', function (next) {
  // Normalize status if string provided with varying case
  if (typeof this.status === 'string') {
    const s = this.status.toLowerCase().trim();
    if (s === 'published' || s === 'publish') {
      this.status = 'published';
    } else {
      this.status = 'draft';
    }
  }

  // Normalize author if string was provided
  if (typeof this.author === 'string') {
    this.author = {
      name: this.author.trim() || 'Skylink Team',
      role: 'EXIM & Logistics Specialist',
      avatar: '',
    };
  } else if (!this.author) {
    this.author = {
      name: 'Skylink Team',
      role: 'EXIM & Logistics Specialist',
      avatar: '',
    };
  }

  // Format slug
  if (this.slug) {
    this.slug = slugify(this.slug);
  } else if (this.title) {
    this.slug = slugify(this.title);
  }

  // Handle publishedAt on publication
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Auto calculate estimated reading time if not provided
  if (!this.estimatedReadTime && this.content) {
    this.estimatedReadTime = calculateReadingTime(this.content);
  } else if (!this.estimatedReadTime) {
    this.estimatedReadTime = '5 min read';
  }

  // Synchronize featuredImage.publicId and featuredImagePublicId
  if (this.featuredImage?.publicId && !this.featuredImagePublicId) {
    this.featuredImagePublicId = this.featuredImage.publicId;
  } else if (this.featuredImagePublicId && this.featuredImage && !this.featuredImage.publicId) {
    this.featuredImage.publicId = this.featuredImagePublicId;
  }

  next();
});

// Compound text index for powerful search queries
blogSchema.index({
  title: 'text',
  shortDescription: 'text',
  category: 'text',
  technology: 'text',
  keywords: 'text',
  tags: 'text',
  'author.name': 'text',
  'author.role': 'text',
});

const Blog = mongoose.model('Blog', blogSchema);

export default Blog;
