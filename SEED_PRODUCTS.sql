-- Seed sample products for Vibe Shop
-- Run this SQL in your Supabase SQL editor after types regenerate

-- Insert sample products
INSERT INTO public.products (title, subtitle, slug, description, price_cents, category, type, stock, is_active, tags)
VALUES 
  (
    'Mindfulness Journal for Kids',
    'Daily prompts for young minds',
    'mindfulness-journal-kids',
    'A beautifully illustrated journal designed to help children ages 5-12 explore their emotions and practice gratitude. Includes 90 days of age-appropriate prompts and colorful stickers.',
    1299,
    'kids',
    'physical',
    100,
    true,
    ARRAY['journal', 'mindfulness', 'gratitude']
  ),
  (
    'Teen Wellness Planner',
    'Organize your mental health journey',
    'teen-wellness-planner',
    'A comprehensive planner specifically designed for teens dealing with stress, anxiety, and the challenges of growing up. Features mood tracking, goal setting, and coping strategies.',
    1999,
    'teens',
    'physical',
    75,
    true,
    ARRAY['planner', 'wellness', 'mental-health']
  ),
  (
    'Adult Meditation Guide (Digital)',
    'Master meditation at home',
    'adult-meditation-guide-digital',
    'A comprehensive digital guide with 30 audio-guided meditation sessions ranging from 5 to 45 minutes. Includes PDF workbook with techniques for stress reduction and mindfulness practice.',
    2999,
    'adults',
    'digital',
    999,
    true,
    ARRAY['meditation', 'audio', 'guide', 'mindfulness']
  ),
  (
    'Elder Wisdom Journal',
    'Reflect on a life well lived',
    'elder-wisdom-journal',
    'A thoughtful journal designed for seniors to record their life stories, wisdom, and memories. Features large print, comfortable binding, and prompts that celebrate life experience.',
    1799,
    'elders',
    'physical',
    50,
    true,
    ARRAY['journal', 'memories', 'wisdom']
  );

-- Insert placeholder images (using Unsplash public images)
DO $$
DECLARE
  kids_id UUID;
  teen_id UUID;
  adult_id UUID;
  elder_id UUID;
BEGIN
  SELECT id INTO kids_id FROM public.products WHERE slug = 'mindfulness-journal-kids';
  SELECT id INTO teen_id FROM public.products WHERE slug = 'teen-wellness-planner';
  SELECT id INTO adult_id FROM public.products WHERE slug = 'adult-meditation-guide-digital';
  SELECT id INTO elder_id FROM public.products WHERE slug = 'elder-wisdom-journal';
  
  INSERT INTO public.product_images (product_id, url, is_cover, sort_order) VALUES
    (kids_id, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800', true, 0),
    (teen_id, 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800', true, 0),
    (adult_id, 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800', true, 0),
    (elder_id, 'https://images.unsplash.com/photo-1531346128328-dcb4d522c1a5?w=800', true, 0);
END $$;

-- Verify the data
SELECT 
  p.title,
  p.category,
  p.price_cents / 100.0 as price_usd,
  p.is_active,
  COUNT(pi.id) as image_count
FROM public.products p
LEFT JOIN public.product_images pi ON pi.product_id = p.id
GROUP BY p.id, p.title, p.category, p.price_cents, p.is_active
ORDER BY p.category;