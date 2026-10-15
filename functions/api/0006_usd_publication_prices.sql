CREATE TABLE commission_posts_new (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
 title TEXT NOT NULL,
 chosen_name TEXT NOT NULL,
 brief TEXT NOT NULL,
 initial_price_brl REAL,
 final_price_brl REAL,
 initial_price REAL,
 final_price REAL,
 price_currency TEXT NOT NULL DEFAULT 'USD' CHECK(price_currency IN ('USD','BRL')),
 price_change_reason TEXT NOT NULL DEFAULT '',
 process_video_url TEXT NOT NULL DEFAULT '',
 final_images_json TEXT NOT NULL,
 reference_images_json TEXT NOT NULL DEFAULT '[]',
 client_consent INTEGER NOT NULL CHECK(client_consent=1),
 is_published INTEGER NOT NULL DEFAULT 0 CHECK(is_published IN (0,1)),
 published_at TEXT,
 created_at TEXT NOT NULL
);
INSERT INTO commission_posts_new(id,order_id,title,chosen_name,brief,initial_price_brl,final_price_brl,initial_price,final_price,price_currency,price_change_reason,process_video_url,final_images_json,reference_images_json,client_consent,is_published,published_at,created_at)
SELECT id,order_id,title,chosen_name,brief,initial_price_brl,final_price_brl,initial_price,final_price,price_currency,price_change_reason,process_video_url,final_images_json,reference_images_json,client_consent,is_published,published_at,created_at FROM commission_posts;
DROP TABLE commission_posts;
ALTER TABLE commission_posts_new RENAME TO commission_posts;
