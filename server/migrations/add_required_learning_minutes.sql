-- Add required_learning_minutes column to courses table
ALTER TABLE courses 
ADD COLUMN required_learning_minutes INT DEFAULT 60 
COMMENT 'Required learning time in minutes before post-test';
