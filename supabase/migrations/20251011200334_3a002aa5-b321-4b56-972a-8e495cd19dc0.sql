-- Create family-stories storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('family-stories', 'family-stories', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for family stories
CREATE POLICY "Family members can upload stories"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'family-stories' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Family members can view family stories"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'family-stories'
    AND (
      -- User can view their own stories
      auth.uid()::text = (storage.foldername(name))[1]
      OR
      -- User can view stories from family members
      EXISTS (
        SELECT 1 
        FROM public.family_stories fs
        JOIN public.family_members fm1 ON fm1.family_id = fs.family_id
        JOIN public.family_members fm2 ON fm2.family_id = fm1.family_id
        WHERE fm1.user_id = auth.uid()
          AND fs.video_url LIKE '%' || name || '%'
      )
    )
  );

CREATE POLICY "Users can delete their own stories"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'family-stories'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );