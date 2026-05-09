-- Allow public read access to avatars (bucket is public, but explicit SELECT policy ensures consistency)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');