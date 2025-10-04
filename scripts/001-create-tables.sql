CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME, -- Changed to DATETIME; set by application (e.g., NOW())
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at DATETIME, -- Changed to DATETIME; set by application (e.g., NOW())
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE IF NOT EXISTS captions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  option_number INT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  INDEX idx_post_id (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

CREATE TABLE IF NOT EXISTS scraper_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  username VARCHAR(255) NOT NULL,
  subreddit VARCHAR(255) NOT NULL,
  total_posts INT DEFAULT 0,
  avg_upvotes DECIMAL(10, 2) DEFAULT 0,
  avg_comments DECIMAL(10, 2) DEFAULT 0,
  median_upvotes DECIMAL(10, 2) DEFAULT 0,
  total_upvotes INT DEFAULT 0,
  total_comments INT DEFAULT 0,
  last_post_date DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;


ALTER TABLE users
  ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN supabase_user_id VARCHAR(255),
  ADD UNIQUE KEY idx_supabase_user_id (supabase_user_id(191)); 

UPDATE users SET email_verified = FALSE WHERE email_verified IS NULL;
