const express = require('express');
const router = express.Router();

/**
 * GET /api/categories - List all categories
 */
router.get('/', async (req, res, next) => {
  try {
    const categories = await req.prisma.category.findMany({
      include: {
        videos: {
          select: { id: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(
      categories.map(cat => ({
        ...cat,
        videoCount: cat.videos.length,
        videos: undefined
      }))
    );
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/categories/:id - Get category details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const category = await req.prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        videos: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({
      ...category,
      videoCount: category.videos.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/categories - Create new category
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, parentId, color, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if category with same name exists
    const existing = await req.prisma.category.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    const category = await req.prisma.category.create({
      data: {
        name,
        parentId: parentId || null,
        color: color || null,
        icon: icon || null
      }
    });

    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/categories/:id - Update category
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { name, parentId, color, icon } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;

    const category = await req.prisma.category.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json(category);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/categories/:id - Delete category
 */
router.delete('/:id', async (req, res, next) => {
  try {
    // Check if category has videos
    const category = await req.prisma.category.findUnique({
      where: { id: req.params.id },
      include: { videos: true }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    if (category.videos.length > 0) {
      // Unassign videos from category
      await req.prisma.video.updateMany({
        where: { categoryId: req.params.id },
        data: { categoryId: null }
      });
    }

    await req.prisma.category.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/categories/:id/videos - Get videos in category
 */
router.get('/:id/videos', async (req, res, next) => {
  try {
    const videos = await req.prisma.video.findMany({
      where: { categoryId: req.params.id },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(
      videos.map(v => ({
        ...v,
        tags: JSON.parse(v.tags || '[]'),
        summaryJson: v.summaryJson ? JSON.parse(v.summaryJson) : null
      }))
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;

