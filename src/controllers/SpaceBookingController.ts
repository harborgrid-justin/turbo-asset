import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '@/config/logger';

const router = Router();

/**
 * Get space bookings with filtering and pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      organizationId, 
      spaceId, 
      userId, 
      startDate, 
      endDate, 
      status,
      bookingType,
      limit = 50, 
      offset = 0 
    } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });

      return;
    }

    // Build where clause
    const whereClause: any = {
      space: {
        floor: {
          building: {
            property: {
              organizationId: organizationId as string,
            },
          },
        },
      },
      isActive: true,
    };

    if (spaceId) {
      whereClause.spaceId = spaceId as string;
    }

    if (userId) {
      whereClause.OR = [
        { bookedById: userId as string },
        { bookedForId: userId as string },
      ];
    }

    if (startDate || endDate) {
      whereClause.AND = whereClause.AND || [];
      
      if (startDate) {
        whereClause.AND.push({
          endDateTime: {
            gte: new Date(startDate as string),
          },
        });
      }
      
      if (endDate) {
        whereClause.AND.push({
          startDateTime: {
            lte: new Date(endDate as string),
          },
        });
      }
    }

    if (status) {
      whereClause.status = status as string;
    }

    if (bookingType) {
      whereClause.bookingType = bookingType as string;
    }

    const bookings = await prisma.spaceBooking.findMany({
      where: whereClause,
      include: {
        space: {
          include: {
            floor: {
              include: {
                building: {
                  include: {
                    property: true,
                  },
                },
              },
            },
          },
        },
        bookedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        bookedFor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: {
        startDateTime: 'asc',
      },
    });

    res.json(bookings);
  } catch (error: unknown) {
    logger.error('Failed to get space bookings', error);
    res.status(500).json({
      error: 'Failed to get space bookings',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Get a specific space booking by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organizationId } = req.query;

    if (!organizationId) {
      res.status(400).json({
        error: 'Organization ID is required',
      });

      return;
    }

    const booking = await prisma.spaceBooking.findFirst({
      where: {
        id,
        space: {
          floor: {
            building: {
              property: {
                organizationId: organizationId as string,
              },
            },
          },
        },
        isActive: true,
      },
      include: {
        space: {
          include: {
            floor: {
              include: {
                building: {
                  include: {
                    property: true,
                  },
                },
              },
            },
          },
        },
        bookedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        bookedFor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      res.status(404).json({
        error: 'Space booking not found',
      });

      return;
    }

    res.json(booking);
  } catch (error: unknown) {
    logger.error('Failed to get space booking', error);
    res.status(500).json({
      error: 'Failed to get space booking',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Create a new space booking
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      organizationId,
      spaceId,
      bookedById,
      bookedForId,
      bookingType = 'DESK',
      startDateTime,
      endDateTime,
      isRecurring = false,
      recurrence,
      purpose,
      guestCount = 0,
      equipment,
    } = req.body;

    // Validate required fields
    if (!organizationId || !spaceId || !bookedById || !startDateTime || !endDateTime) {
      res.status(400).json({
        error: 'Organization ID, space ID, booked by ID, start date time, and end date time are required',
      });

      return;
    }

    // Validate dates
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    if (startDate >= endDate) {
      res.status(400).json({
        error: 'Start date must be before end date',
      });

      return;
    }

    if (startDate < new Date()) {
      res.status(400).json({
        error: 'Start date cannot be in the past',
      });

      return;
    }

    // Check if space exists and belongs to the organization
    const space = await prisma.space.findFirst({
      where: {
        id: spaceId,
        floor: {
          building: {
            property: {
              organizationId,
            },
          },
        },
        isActive: true,
      },
    });

    if (!space) {
      res.status(404).json({
        error: 'Space not found or does not belong to organization',
      });

      return;
    }

    // Check for booking conflicts
    const conflictingBookings = await prisma.spaceBooking.findMany({
      where: {
        spaceId,
        isActive: true,
        status: {
          in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'],
        },
        OR: [
          {
            AND: [
              { startDateTime: { lte: startDate } },
              { endDateTime: { gt: startDate } },
            ],
          },
          {
            AND: [
              { startDateTime: { lt: endDate } },
              { endDateTime: { gte: endDate } },
            ],
          },
          {
            AND: [
              { startDateTime: { gte: startDate } },
              { endDateTime: { lte: endDate } },
            ],
          },
        ],
      },
    });

    if (conflictingBookings.length > 0) {
      res.status(409).json({
        error: 'Space is already booked during the requested time',
        conflicts: conflictingBookings,
      });

      return;
    }

    // Create the booking
    const booking = await prisma.spaceBooking.create({
      data: {
        spaceId,
        bookedById,
        bookedForId: bookedForId || bookedById,
        bookingType,
        startDateTime: startDate,
        endDateTime: endDate,
        isRecurring,
        recurrence: recurrence || null,
        purpose,
        guestCount,
        equipment: equipment || null,
        status: 'PENDING',
      },
      include: {
        space: {
          include: {
            floor: {
              include: {
                building: {
                  include: {
                    property: true,
                  },
                },
              },
            },
          },
        },
        bookedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        bookedFor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info('Space booking created', { bookingId: booking.id, spaceId, organizationId });

    res.status(201).json(booking);


    return;
  } catch (error: unknown) {
    logger.error('Failed to create space booking', error);
    res.status(500).json({
      error: 'Failed to create space booking',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Update space booking status (check-in, check-out, cancel)
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { organizationId, status, reason } = req.body;

    if (!organizationId || !status) {
      res.status(400).json({
        error: 'Organization ID and status are required',
      });

      return;
    }

    // Validate status
    const validStatuses = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        error: 'Invalid status. Valid values are: ' + validStatuses.join(', '),
      });

      return;
    }

    // Find the booking
    const existingBooking = await prisma.spaceBooking.findFirst({
      where: {
        id,
        space: {
          floor: {
            building: {
              property: {
                organizationId,
              },
            },
          },
        },
        isActive: true,
      },
    });

    if (!existingBooking) {
      res.status(404).json({
        error: 'Space booking not found',
      });

      return;
    }

    // Prepare update data
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    // Set status-specific fields
    const now = new Date();
    switch (status) {
      case 'CHECKED_IN':
        updateData.checkInAt = now;
        break;
      case 'CHECKED_OUT':
        updateData.checkOutAt = now;
        break;
      case 'CANCELLED':
        updateData.cancelledAt = now;
        if (reason) {
          updateData.cancellationReason = reason;
        }
        break;
      case 'NO_SHOW':
        updateData.noShowAt = now;
        break;
    }

    // Update the booking
    const updatedBooking = await prisma.spaceBooking.update({
      where: { id },
      data: updateData,
      include: {
        space: {
          include: {
            floor: {
              include: {
                building: {
                  include: {
                    property: true,
                  },
                },
              },
            },
          },
        },
        bookedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        bookedFor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    logger.info('Space booking status updated', { 
      bookingId: id, 
      newStatus: status, 
      organizationId 
    });

    res.json(updatedBooking);
  } catch (error: unknown) {
    logger.error('Failed to update space booking status', error);
    res.status(500).json({
      error: 'Failed to update space booking status',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

/**
 * Check space availability
 */
router.get('/availability/check', async (req: Request, res: Response) => {
  try {
    const { 
      organizationId, 
      spaceIds, 
      startDateTime, 
      endDateTime,
      bookingType 
    } = req.query;

    if (!organizationId || !startDateTime || !endDateTime) {
      res.status(400).json({
        error: 'Organization ID, start date time, and end date time are required',
      });

      return;
    }

    const startDate = new Date(startDateTime as string);
    const endDate = new Date(endDateTime as string);

    if (startDate >= endDate) {
      res.status(400).json({
        error: 'Start date must be before end date',
      });

      return;
    }

    // Build space filter
    const spaceFilter: any = {
      floor: {
        building: {
          property: {
            organizationId: organizationId as string,
          },
        },
      },
      isActive: true,
    };

    if (spaceIds) {
      const spaceIdArray = Array.isArray(spaceIds) ? spaceIds : [spaceIds];
      spaceFilter.id = { in: spaceIdArray as string[] };
    }

    if (bookingType) {
      // Filter spaces based on booking type compatibility
      const spaceTypeMapping: { [key: string]: string[] } = {
        'DESK': ['OFFICE'],
        'OFFICE': ['OFFICE'],
        'CONFERENCE_ROOM': ['CONFERENCE_ROOM'],
        'PARKING_SPOT': ['PARKING'],
        'COLLABORATION_SPACE': ['COMMON_AREA', 'OFFICE'],
      };
      
      const compatibleSpaceTypes = spaceTypeMapping[bookingType as string];
      if (compatibleSpaceTypes) {
        spaceFilter.type = { in: compatibleSpaceTypes };
      }
    }

    // Get all matching spaces
    const spaces = await prisma.space.findMany({
      where: spaceFilter,
      include: {
        floor: {
          include: {
            building: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    // Check availability for each space
    const availabilityResults = await Promise.all(
      spaces.map(async (space: any) => {
        const conflictingBookings = await prisma.spaceBooking.findMany({
          where: {
            spaceId: space.id,
            isActive: true,
            status: {
              in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'],
            },
            OR: [
              {
                AND: [
                  { startDateTime: { lte: startDate } },
                  { endDateTime: { gt: startDate } },
                ],
              },
              {
                AND: [
                  { startDateTime: { lt: endDate } },
                  { endDateTime: { gte: endDate } },
                ],
              },
              {
                AND: [
                  { startDateTime: { gte: startDate } },
                  { endDateTime: { lte: endDate } },
                ],
              },
            ],
          },
        });

        return {
          space,
          isAvailable: conflictingBookings.length === 0,
          conflictingBookings: conflictingBookings.length,
        };
      })
    );

    res.json({
      searchCriteria: {
        startDateTime,
        endDateTime,
        bookingType,
        spaceIds,
      },
      results: availabilityResults,
      summary: {
        totalSpaces: spaces.length,
        availableSpaces: availabilityResults.filter(r => r.isAvailable).length,
        unavailableSpaces: availabilityResults.filter(r => !r.isAvailable).length,
      },
    });
  } catch (error: unknown) {
    logger.error('Failed to check space availability', error);
    res.status(500).json({
      error: 'Failed to check space availability',
      message: error instanceof Error ? (error as Error).message : 'Unknown error',
    });

    return;
  }
});

export default router;