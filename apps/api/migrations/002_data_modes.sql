ALTER TABLE orders ADD COLUMN data_mode text NOT NULL DEFAULT 'live'
  CHECK (data_mode IN ('live', 'demo'));
CREATE INDEX orders_mode_date_idx ON orders (data_mode, service_date DESC, id DESC);

CREATE TABLE workspace_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  mode text NOT NULL DEFAULT 'live' CHECK (mode IN ('live', 'demo')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  demo_date date
);
INSERT INTO workspace_settings (id) VALUES (true);

-- Recognize only the complete, original 44-order seed. Other orders stay live.
WITH expected (id, dish, school_group, quantity, day_offset) AS (VALUES
  (1200,'soup','9a',24,-6),(1201,'cutlet','9a',32,-6),(1202,'soup','10b',16,-6),
  (1203,'cutlet','10b',34,-6),(1204,'casserole','8v',36,-6),(1205,'soup','7a',30,-6),
  (1206,'casserole','7a',14,-6),(1207,'soup','9a',44,-5),(1208,'cutlet','9a',20,-5),
  (1209,'soup','10b',36,-5),(1210,'cutlet','10b',20,-5),(1211,'casserole','8v',44,-5),
  (1212,'cutlet','7a',34,-5),(1213,'casserole','7a',14,-5),(1214,'soup','9a',20,-4),
  (1215,'cutlet','9a',38,-4),(1216,'soup','10b',22,-4),(1217,'cutlet','10b',32,-4),
  (1218,'casserole','8v',40,-4),(1219,'soup','7a',30,-4),(1220,'casserole','7a',16,-4),
  (1221,'soup','9a',32,-3),(1222,'cutlet','9a',32,-3),(1223,'soup','10b',48,-3),
  (1224,'casserole','10b',10,-3),(1225,'cutlet','8v',24,-3),(1226,'casserole','8v',24,-3),
  (1227,'cutlet','7a',22,-3),(1228,'casserole','7a',32,-3),(1229,'soup','9a',22,-6),
  (1230,'cutlet','10b',20,-5),(1231,'soup','8v',14,-4),(1232,'cutlet','8v',16,-4),
  (1233,'casserole','8v',4,-4),(1234,'casserole','7a',22,-3),
  (1243,'casserole','10b',32,0),(1244,'cutlet','9a',36,0),(1245,'soup','7a',30,0),
  (1246,'casserole','8v',18,0),(1247,'cutlet','10b',26,0),(1248,'soup','9a',32,0),
  (1249,'soup','8v',20,0),(1250,'cutlet','7a',26,0),(1251,'casserole','9a',26,0)
), anchor AS (SELECT service_date AS day FROM orders WHERE id = 1251),
matched AS (
  SELECT o.id, a.day FROM orders o JOIN expected e ON o.id = e.id CROSS JOIN anchor a
  WHERE o.dish_id = e.dish AND o.group_id = e.school_group AND o.quantity = e.quantity
    AND o.service_date = a.day + e.day_offset AND o.serving_time = '12:10'::time
), moved AS (
  UPDATE orders SET data_mode = 'demo'
  WHERE id IN (SELECT id FROM matched) AND (SELECT count(*) FROM matched) = 44
  RETURNING service_date
)
UPDATE workspace_settings SET demo_date = (SELECT max(service_date) FROM moved)
WHERE (SELECT count(*) FROM moved) = 44;
