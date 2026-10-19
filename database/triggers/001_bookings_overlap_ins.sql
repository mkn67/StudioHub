CREATE TRIGGER trg_bookings_no_overlap_ins
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
  IF NEW.status IN ('confirmed','checked_in')
     OR (NEW.status = 'pending' AND NEW.expires_at > NOW()) THEN
    IF EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.room_id = NEW.room_id
        AND (b.status IN ('confirmed','checked_in')
             OR (b.status = 'pending' AND b.expires_at > NOW()))
        AND NEW.busy_start < b.busy_end
        AND NEW.busy_end   > b.busy_start
    ) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ROOM_OCCUPIED';
    END IF;
  END IF;
END

