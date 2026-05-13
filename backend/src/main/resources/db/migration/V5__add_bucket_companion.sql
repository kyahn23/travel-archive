ALTER TABLE bucket_places ADD COLUMN companion VARCHAR(100);

UPDATE bucket_places SET companion = '혼자' WHERE id = 1;
UPDATE bucket_places SET companion = '친구' WHERE id = 2;
UPDATE bucket_places SET companion = '동행 미정' WHERE id = 3;
