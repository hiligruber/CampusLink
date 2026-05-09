## מינוי אדמין ראשון

אריץ INSERT לטבלת `user_roles` שיעניק תפקיד `admin` למשתמש עם האימייל `Hilulagru@gmail.com`.

### השאילתה
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) = lower('Hilulagru@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
```

### דרישה מקדימה
המשתמש חייב להיות רשום באתר (קיים ב-auth.users). אם עוד לא נרשמת — הירשם תחילה דרך מסך ההרשמה, ואז נריץ את ה-INSERT.