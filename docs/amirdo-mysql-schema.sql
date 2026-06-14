-- =====================================================================
-- MySQL schema for Amirdo backup mirror — EXACT copy of Supabase columns
-- Source: Lovable Cloud / Supabase (public schema), 2026-06-14
-- Charset: utf8mb4 (for Hebrew + emoji). Engine: InnoDB.
--
-- Notes on type mapping:
--   uuid                       -> CHAR(36)
--   text                       -> TEXT  (LONGTEXT where it may be very long)
--   timestamp with time zone   -> DATETIME(6)  (store UTC; PHP converts)
--   boolean                    -> TINYINT(1)
--   numeric (no precision)     -> DECIMAL(10,2)
--   integer / int4             -> INT
--   smallint / int2            -> SMALLINT
--   double precision / float8  -> DOUBLE
--   USER-DEFINED enums         -> VARCHAR(32) (Postgres enum values stored as text)
--
-- IMPORTANT: Run this AFTER backing up any existing data you want to keep.
-- These DROPs will wipe the current mirror tables.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `support_messages`;
DROP TABLE IF EXISTS `support_tickets`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `ride_ratings`;
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `rides`;
DROP TABLE IF EXISTS `profiles`;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
CREATE TABLE `profiles` (
  `id`                  CHAR(36)     NOT NULL,
  `user_id`             CHAR(36)     NOT NULL,
  `full_name`           TEXT         NOT NULL,
  `email`               TEXT         NOT NULL,
  `institution_id`      TEXT         NULL,
  `rating`              DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  `total_ratings`       DECIMAL(10,2) NOT NULL DEFAULT 0,
  `rating_count`        INT          NOT NULL DEFAULT 0,
  `created_at`          DATETIME(6)  NOT NULL,
  `updated_at`          DATETIME(6)  NOT NULL,
  `institution`         TEXT         NULL,
  `student_id_url`      TEXT         NULL,
  `verification_status` VARCHAR(32)  NOT NULL DEFAULT 'pending_submission',
  `rejection_reason`    TEXT         NULL,
  `verified_at`         DATETIME(6)  NULL,
  `avatar_url`          TEXT         NULL,
  `hobbies`             TEXT         NULL,
  `music_preference`    TEXT         NULL,
  `username`            VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profiles_user_id` (`user_id`),
  KEY `idx_profiles_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- rides
-- ---------------------------------------------------------------------
CREATE TABLE `rides` (
  `id`              CHAR(36)     NOT NULL,
  `driver_id`       CHAR(36)     NOT NULL,
  `origin`          TEXT         NOT NULL,
  `destination`     TEXT         NOT NULL,
  `departure_time`  DATETIME(6)  NOT NULL,
  `total_seats`     INT          NOT NULL DEFAULT 4,
  `available_seats` INT          NOT NULL DEFAULT 4,
  `created_at`      DATETIME(6)  NOT NULL,
  `updated_at`      DATETIME(6)  NOT NULL,
  `status`          VARCHAR(32)  NOT NULL DEFAULT 'active',
  `notes`           TEXT         NULL,
  `driver_name`     TEXT         NOT NULL,
  `ride_phase`      VARCHAR(32)  NOT NULL DEFAULT 'scheduled',
  `started_at`      DATETIME(6)  NULL,
  `completed_at`    DATETIME(6)  NULL,
  PRIMARY KEY (`id`),
  KEY `idx_rides_driver_id` (`driver_id`),
  KEY `idx_rides_updated_at` (`updated_at`),
  KEY `idx_rides_departure_time` (`departure_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------
CREATE TABLE `bookings` (
  `id`              CHAR(36)     NOT NULL,
  `ride_id`         CHAR(36)     NOT NULL,
  `passenger_id`    CHAR(36)     NOT NULL,
  `status`          VARCHAR(32)  NOT NULL DEFAULT 'pending',
  `created_at`      DATETIME(6)  NOT NULL,
  `updated_at`      DATETIME(6)  NOT NULL,
  `pickup_location` TEXT         NULL,
  `pickup_lat`      DOUBLE       NULL,
  `pickup_lng`      DOUBLE       NULL,
  PRIMARY KEY (`id`),
  KEY `idx_bookings_ride_id` (`ride_id`),
  KEY `idx_bookings_passenger_id` (`passenger_id`),
  KEY `idx_bookings_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- ride_ratings
-- ---------------------------------------------------------------------
CREATE TABLE `ride_ratings` (
  `id`         CHAR(36)     NOT NULL,
  `ride_id`    CHAR(36)     NOT NULL,
  `rater_id`   CHAR(36)     NOT NULL,
  `ratee_id`   CHAR(36)     NOT NULL,
  `stars`      SMALLINT     NOT NULL,
  `comment`    TEXT         NULL,
  `created_at` DATETIME(6)  NOT NULL,
  `updated_at` DATETIME(6)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ride_ratings_ride_id` (`ride_id`),
  KEY `idx_ride_ratings_ratee_id` (`ratee_id`),
  KEY `idx_ride_ratings_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
CREATE TABLE `notifications` (
  `id`         CHAR(36)     NOT NULL,
  `user_id`    CHAR(36)     NOT NULL,
  `type`       VARCHAR(64)  NOT NULL,
  `title`      TEXT         NOT NULL,
  `body`       TEXT         NULL,
  `ride_id`    CHAR(36)     NULL,
  `booking_id` CHAR(36)     NULL,
  `read`       TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME(6)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_id` (`user_id`),
  KEY `idx_notifications_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- support_tickets
-- ---------------------------------------------------------------------
CREATE TABLE `support_tickets` (
  `id`         CHAR(36)     NOT NULL,
  `user_id`    CHAR(36)     NOT NULL,
  `subject`    TEXT         NOT NULL,
  `category`   VARCHAR(32)  NOT NULL DEFAULT 'other',
  `status`     VARCHAR(32)  NOT NULL DEFAULT 'open',
  `created_at` DATETIME(6)  NOT NULL,
  `updated_at` DATETIME(6)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_support_tickets_user_id` (`user_id`),
  KEY `idx_support_tickets_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- support_messages
-- ---------------------------------------------------------------------
CREATE TABLE `support_messages` (
  `id`         CHAR(36)     NOT NULL,
  `ticket_id`  CHAR(36)     NOT NULL,
  `sender_id`  CHAR(36)     NOT NULL,
  `body`       TEXT         NOT NULL,
  `is_admin`   TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` DATETIME(6)  NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_support_messages_ticket_id` (`ticket_id`),
  KEY `idx_support_messages_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
