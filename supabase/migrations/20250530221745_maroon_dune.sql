/*
  # Remove notification system
  
  1. Changes
    - Drop notifications table
    - Drop notification-related functions and triggers
    
  2. Security
    - Clean up related database objects
*/

-- Drop notification-related triggers
DROP TRIGGER IF EXISTS notify_visit_create_trigger ON visits;
DROP TRIGGER IF EXISTS notify_corrective_action_create_trigger ON corrective_actions;
DROP TRIGGER IF EXISTS notify_document_upload_trigger ON documents;

-- Drop notification-related functions
DROP FUNCTION IF EXISTS notify_on_visit_create();
DROP FUNCTION IF EXISTS notify_on_corrective_action_create();
DROP FUNCTION IF EXISTS notify_on_document_upload();
DROP FUNCTION IF EXISTS send_notification(uuid, text, text, text, text, text, uuid);
DROP FUNCTION IF EXISTS send_notification_to_role(text, text, text, text, text, text, uuid);
DROP FUNCTION IF EXISTS send_notification_to_all(text, text, text, text, text, uuid);
DROP FUNCTION IF EXISTS send_daily_visit_notifications();

-- Drop notifications table
DROP TABLE IF EXISTS notifications;