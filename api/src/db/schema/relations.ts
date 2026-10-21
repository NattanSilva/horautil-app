/**
 * Relations do Drizzle — habilitam a API `db.query.*` com `with: { ... }`
 * sem N+1 (PRD §7.4 / NF-P01).
 *
 * Usamos a API `relations()` (estável em drizzle-orm 0.45.x).
 */
import { relations } from 'drizzle-orm';

import { availabilitySlots } from './availability-slots.js';
import { bookings } from './bookings.js';
import { categories } from './categories.js';
import { reviews } from './reviews.js';
import {
  auditLog,
  notifications,
  passwordResetTokens,
  refreshTokens,
  reports,
  userBlocks,
} from './support.js';
import { users } from './users.js';
import { userSkills } from './user-skills.js';
import { walletEntries } from './wallet-entries.js';

export const usersRelations = relations(users, ({ many }) => ({
  skills: many(userSkills),
  availability: many(availabilitySlots),
  taughtBookings: many(bookings, { relationName: 'teacher' }),
  learnedBookings: many(bookings, { relationName: 'student' }),
  walletEntries: many(walletEntries),
  refreshTokens: many(refreshTokens),
  notifications: many(notifications),
  reviewsWritten: many(reviews, { relationName: 'reviewer' }),
  reviewsReceived: many(reviews, { relationName: 'reviewee' }),
  sentBlocks: many(userBlocks, { relationName: 'blocker' }),
  receivedBlocks: many(userBlocks, { relationName: 'blocked' }),
  passwordResetTokens: many(passwordResetTokens),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryTree',
  }),
  children: many(categories, { relationName: 'categoryTree' }),
  userSkills: many(userSkills),
  bookings: many(bookings),
}));

export const userSkillsRelations = relations(userSkills, ({ one }) => ({
  user: one(users, { fields: [userSkills.userId], references: [users.id] }),
  category: one(categories, { fields: [userSkills.categoryId], references: [categories.id] }),
}));

export const availabilitySlotsRelations = relations(availabilitySlots, ({ one }) => ({
  user: one(users, { fields: [availabilitySlots.userId], references: [users.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  teacher: one(users, {
    fields: [bookings.teacherId],
    references: [users.id],
    relationName: 'teacher',
  }),
  student: one(users, {
    fields: [bookings.studentId],
    references: [users.id],
    relationName: 'student',
  }),
  category: one(categories, { fields: [bookings.categoryId], references: [categories.id] }),
  cancelledByUser: one(users, { fields: [bookings.cancelledBy], references: [users.id] }),
  walletEntries: many(walletEntries),
  reviews: many(reviews),
}));

export const walletEntriesRelations = relations(walletEntries, ({ one }) => ({
  user: one(users, { fields: [walletEntries.userId], references: [users.id] }),
  booking: one(bookings, { fields: [walletEntries.bookingId], references: [bookings.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, { fields: [reviews.bookingId], references: [bookings.id] }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
    relationName: 'reviewer',
  }),
  reviewee: one(users, {
    fields: [reviews.revieweeId],
    references: [users.id],
    relationName: 'reviewee',
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const userBlocksRelations = relations(userBlocks, ({ one }) => ({
  blocker: one(users, { fields: [userBlocks.blockerId], references: [users.id], relationName: 'blocker' }),
  blocked: one(users, { fields: [userBlocks.blockedId], references: [users.id], relationName: 'blocked' }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, { fields: [reports.reporterId], references: [users.id] }),
  targetUser: one(users, { fields: [reports.targetUserId], references: [users.id] }),
  booking: one(bookings, { fields: [reports.bookingId], references: [bookings.id] }),
  review: one(reviews, { fields: [reports.reviewId], references: [reviews.id] }),
}));